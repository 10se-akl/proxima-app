"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconeEtincelle, IconePhoto } from "@/components/projet/icones";
import { AIDE, BOUTON_CREUX, BOUTON_PLEIN, BOUTON_PLEIN_LARGE, BOUTON_TEXTE, CARTE_PLEINE, CHAMP, ERREUR, LIBELLE, SECONDAIRE, TITRE_ECRAN, SELECT } from "@/components/ui/recettes";
import { heureLue } from "@/lib/heure";

type Extrait = {
  nom_client: string;
  telephone_client: string | null;
  type_chantier: string;
  description_resumee: string;
  // Sprint Beta Final (27/08) — 🔴H : voir même commentaire dans
  // app/api/ai/analyser-captures/route.ts.
  texte_brut: string;
  rdv_date: string | null;
  rdv_heure: string | null;
  capture_illisible: boolean;
};

type Correspondance = { id: string; nomClient: string; matchFort: boolean };

type Ligne = {
  index: number;
  extrait?: Extrait;
  erreur?: string;
  correspondances?: Correspondance[];
  // Choix de l'artisan pour cette ligne : "" = ignorer, "nouveau" = créer
  // un nouveau projet, ou l'id d'un projet existant proposé.
  destination: string;
};

// Une capture d'écran de téléphone moderne pèse souvent plusieurs Mo —
// avec une dizaine envoyées d'un coup, on dépasserait vite la limite de
// taille de requête de Vercel (4,5 Mo), et ça coûterait plus cher en IA
// pour rien : le texte d'une conversation reste lisible bien en dessous
// de la résolution native. On redimensionne et compresse dans le
// navigateur avant l'envoi, avec le canvas — aucune bibliothèque externe
// nécessaire pour ça.
const LARGEUR_MAX_PX = 1280;
const QUALITE_JPEG = 0.8;

function compresserImage(fichier: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(fichier);

    image.onload = () => {
      URL.revokeObjectURL(url);

      const ratio = Math.min(1, LARGEUR_MAX_PX / image.width);
      const largeur = Math.round(image.width * ratio);
      const hauteur = Math.round(image.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = largeur;
      canvas.height = hauteur;
      const contexte = canvas.getContext("2d");
      if (!contexte) {
        reject(new Error("Impossible de traiter cette image."));
        return;
      }
      contexte.drawImage(image, 0, 0, largeur, hauteur);

      const dataUrl = canvas.toDataURL("image/jpeg", QUALITE_JPEG);
      resolve({ base64: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible."));
    };
    image.src = url;
  });
}

/** « 2026-10-15 » devient « mercredi 15 octobre » (13/10). */
function dateEnMots(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

export default function ImporterCapturePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [importTermine, setImportTermine] = useState<{ nbReussis: number; nbEchecs: number } | null>(
    null
  );

  // Cycle "Release Candidate" 1 (26/08) — même logique d'annulation propre
  // que sur la fiche projet (voir demandes/[id]/page.tsx) : si l'artisan
  // quitte cette page pendant l'analyse IA (potentiellement longue avec
  // plusieurs captures), on annule le fetch au démontage.
  const controleurIARef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => controleurIARef.current?.abort();
  }, []);

  async function analyserFichiers(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    setErreurGlobale(null);
    setImportTermine(null);
    setAnalyseEnCours(true);

    const controleur = new AbortController();
    controleurIARef.current = controleur;

    try {
      // Audit pré-bêta (09/09), point 🟡 n°17 — Promise.all() faisait
      // échouer TOUT le lot dès qu'une seule image posait problème (fichier
      // corrompu, format non supporté), sans jamais dire laquelle, ni
      // garder les autres pourtant valides. Promise.allSettled() isole
      // chaque échec individuellement — les images valides partent quand
      // même à l'analyse, celles en échec sont nommées explicitement.
      const fichiersTableau = Array.from(fichiers);
      const resultatsCompression = await Promise.allSettled(fichiersTableau.map(compresserImage));

      const images: { base64: string; mediaType: string }[] = [];
      const nomsEnEchec: string[] = [];
      resultatsCompression.forEach((resultat, i) => {
        if (resultat.status === "fulfilled") {
          images.push(resultat.value);
        } else {
          nomsEnEchec.push(fichiersTableau[i].name);
        }
      });

      if (images.length === 0) {
        setErreurGlobale(
          nomsEnEchec.length === 1
            ? `L'image "${nomsEnEchec[0]}" n'a pas pu être traitée (fichier corrompu ou format non supporté).`
            : `Aucune de ces images n'a pu être traitée (fichiers corrompus ou format non supporté) : ${nomsEnEchec.join(", ")}.`
        );
        setAnalyseEnCours(false);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const res = await fetch("/api/ai/analyser-captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
        signal: controleur.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErreurGlobale(data?.error ?? "L'analyse a échoué. Réessayez.");
        setAnalyseEnCours(false);
        return;
      }

      const data = await res.json();
      const nouvellesLignes: Ligne[] = data.resultats.map(
        (r: {
          index: number;
          extrait?: Extrait;
          erreur?: string;
          correspondances?: Correspondance[];
        }) => ({
          index: r.index,
          extrait: r.extrait,
          erreur: r.erreur,
          correspondances: r.correspondances,
          // Pré-sélection UNIQUEMENT sur une correspondance forte (même
          // téléphone, ou nom identique) — audit pré-bêta (09/09) : un nom
          // simplement "proche" (Martin ⊂ Jean Martin) reste proposé dans
          // la liste déroulante mais ne doit jamais être choisi à la place
          // de l'artisan, trop de risque de faux positif sur un homonyme
          // qu'il ne prendrait pas le temps de vérifier. "Nouveau projet"
          // par défaut dans tous les autres cas.
          destination:
            r.correspondances?.length === 1 && r.correspondances[0].matchFort
              ? r.correspondances[0].id
              : "nouveau",
        })
      );
      setLignes(nouvellesLignes);

      // Succès partiel : les images valides ont bien été analysées
      // ci-dessus, mais on le dit quand même plutôt que de laisser croire
      // que TOUT le lot est passé.
      if (nomsEnEchec.length > 0) {
        setErreurGlobale(
          nomsEnEchec.length === 1
            ? `L'image "${nomsEnEchec[0]}" n'a pas pu être traitée et a été ignorée — les autres ont bien été analysées.`
            : `${nomsEnEchec.length} images n'ont pas pu être traitées et ont été ignorées (${nomsEnEchec.join(", ")}) — les autres ont bien été analysées.`
        );
      }
    } catch (err) {
      // AbortError = la page a été quittée pendant l'analyse (cleanup
      // ci-dessus) : pas d'erreur à afficher, personne ne la lira.
      if ((err as Error).name !== "AbortError") {
        console.error(err);
        setErreurGlobale(
          "L'analyse des captures a échoué (connexion ou serveur). Réessayez."
        );
      }
    } finally {
      setAnalyseEnCours(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function changerDestination(index: number, valeur: string) {
    setLignes((prev) =>
      prev.map((l) => (l.index === index ? { ...l, destination: valeur } : l))
    );
  }

  async function confirmerImport() {
    setImportEnCours(true);
    setErreurGlobale(null);

    const lignesValides = lignes.filter((l) => l.extrait && l.destination !== "");

    const payload = lignesValides.map((l) => ({
      destination: l.destination === "nouveau" ? null : l.destination,
      nomClient: l.extrait!.nom_client,
      telephoneClient: l.extrait!.telephone_client,
      typeChantier: l.extrait!.type_chantier,
      descriptionResumee: l.extrait!.description_resumee,
      texteBrut: l.extrait!.texte_brut,
      rdvDate: l.extrait!.rdv_date,
      rdvHeure: l.extrait!.rdv_heure,
    }));

    // 13/10 — une coupure réseau ici laissait « Import en cours… » figé
    // pour toujours, sans message.
    let res: Response;
    try {
      res = await fetch("/api/ai/confirmer-import-captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lignes: payload }),
      });
    } catch {
      setImportEnCours(false);
      setErreurGlobale("Pas de réseau : rien n'a été importé. Réessayez.");
      return;
    }

    setImportEnCours(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreurGlobale(data?.error ?? "L'import a échoué. Réessayez.");
      return;
    }

    const data = await res.json();
    // Refonte (02/10, duel E lot 1) — une seule capture : on ouvre sa fiche
    // (avec « Bien reçu » si le numéro est connu), plus la liste des projets.
    const seul = data.resultats.length === 1 ? data.resultats[0] : null;
    if (seul?.ok && seul.projetId) {
      router.replace(`/dashboard/demandes/${seul.projetId}?cree=1`);
      return;
    }
    const nbReussis = data.resultats.filter((r: { ok: boolean }) => r.ok).length;
    const nbEchecs = data.resultats.length - nbReussis;
    setImportTermine({ nbReussis, nbEchecs });
    setLignes([]);
  }

  // Design v3 (24/10) : un écran calme. Avant l'envoi, une seule grande
  // action (choisir les captures) avec l'étincelle et « avec l'IA » ; après
  // la lecture, une carte par capture (plus d'avatar coloré), le choix de
  // destination en champ v3, et le bouton plein collé en bas.
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-5 sm:p-8 lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10">
      <h1 className={TITRE_ECRAN}>Photos ou captures</h1>
      <p className="mt-1 text-base text-steel">Une capture par conversation. Rien n&apos;est enregistré avant que vous confirmiez.</p>

      {lignes.length === 0 && !importTermine && (
        <div className="mt-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => analyserFichiers(e.target.files)}
            disabled={analyseEnCours}
            className="hidden"
            id="captures-input"
          />
          <label
            htmlFor="captures-input"
            aria-disabled={analyseEnCours}
            className={`${BOUTON_PLEIN_LARGE} cursor-pointer sm:w-auto sm:px-8 ${analyseEnCours ? "pointer-events-none opacity-60" : ""}`}
          >
            <IconePhoto className="h-5 w-5 shrink-0" />
            {analyseEnCours ? "Lecture des captures…" : "Choisir des captures d'écran"}
          </label>
          <p className={`mt-2 flex items-center gap-1.5 ${SECONDAIRE}`}>
            <IconeEtincelle className="h-4 w-4 shrink-0 text-ink" />
            Lues avec l&apos;IA. Vous relisez avant d&apos;importer.
          </p>
          {erreurGlobale && <p className={`mt-3 ${ERREUR}`}>{erreurGlobale}</p>}
        </div>
      )}

      {importTermine && (
        <div className={`mt-6 ${CARTE_PLEINE}`}>
          <p className="text-[17px] font-semibold text-ink">
            {importTermine.nbReussis} capture{importTermine.nbReussis > 1 ? "s" : ""} importée
            {importTermine.nbReussis > 1 ? "s" : ""}
            {importTermine.nbEchecs > 0
              ? `, ${importTermine.nbEchecs} échec${importTermine.nbEchecs > 1 ? "s" : ""}.`
              : "."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={BOUTON_PLEIN} onClick={() => router.push("/dashboard/demandes")}>
              Voir les projets
            </button>
            <button type="button" className={BOUTON_CREUX} onClick={() => setImportTermine(null)}>
              Importer d&apos;autres captures
            </button>
          </div>
        </div>
      )}

      {lignes.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {lignes.map((l) => (
            <div key={l.index} className={CARTE_PLEINE}>
              {l.erreur ? (
                <p className="text-[15px] font-semibold text-signal-fonce">
                  Capture {l.index + 1} : {l.erreur}
                </p>
              ) : (
                <>
                  <p className="break-words text-[17px] font-semibold leading-snug text-ink">{l.extrait!.nom_client}</p>
                  <p className={`mt-1 ${SECONDAIRE}`}>{l.extrait!.description_resumee}</p>
                  {l.extrait!.rdv_date && (
                    <p className={AIDE}>
                      Rendez-vous proposé le {dateEnMots(l.extrait!.rdv_date)}
                      {l.extrait!.rdv_heure ? ` à ${heureLue(l.extrait!.rdv_heure)}` : ""} — à planifier
                      vous-même après import.
                    </p>
                  )}

                  <div className="mt-4">
                    <label htmlFor={`destination-${l.index}`} className={LIBELLE}>
                      Où importer ce message ?
                    </label>
                    <select
                      id={`destination-${l.index}`}
                      value={l.destination}
                      onChange={(e) => changerDestination(l.index, e.target.value)}
                      className={SELECT}
                    >
                      <option value="nouveau">Créer un nouveau projet</option>
                      {(l.correspondances ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          Ajouter au projet existant : {c.nomClient}
                          {c.matchFort ? "" : " (nom proche seulement — vérifiez)"}
                        </option>
                      ))}
                      <option value="">Ne pas importer cette capture</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          ))}

          {erreurGlobale && <p className={ERREUR}>{erreurGlobale}</p>}

          <div className="sticky bottom-[calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)+1rem)] z-10 -mx-4 mt-2 flex flex-col gap-1 bg-paper px-4 pb-1 pt-2 sm:static sm:mx-0 sm:flex-row sm:items-center sm:gap-3 sm:bg-transparent sm:p-0">
            <button type="button" onClick={confirmerImport} disabled={importEnCours} className={`${BOUTON_PLEIN_LARGE} sm:w-auto sm:px-8`}>
              {importEnCours ? "Import en cours…" : "Confirmer l'import"}
            </button>
            <button type="button" onClick={() => setLignes([])} className={`self-center ${BOUTON_TEXTE}`}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
