"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

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

    const res = await fetch("/api/ai/confirmer-import-captures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lignes: payload }),
    });

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

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-3xl">
      <Link href="/dashboard/demandes" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-ink/60 hover:text-ink transition-colors">
        ← Retour aux projets
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Photos ou captures</h1>
      <p className="mt-1 text-[15px] text-ink/65">Une capture par conversation. Rien n&apos;est enregistré avant que vous confirmiez.</p>

      {lignes.length === 0 && !importTermine && (
        <Card className="mt-5 p-4 sm:mt-8 sm:p-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => analyserFichiers(e.target.files)}
            className="hidden"
            id="captures-input"
          />
          <label
            htmlFor="captures-input"
            className="inline-flex items-center gap-2 rounded-xl bg-ink text-paper text-sm font-medium px-4 py-2.5 transition-all duration-150 hover:bg-signal hover:scale-[1.02] hover:shadow-md cursor-pointer"
          >
            {analyseEnCours ? "Analyse en cours…" : "📷 Choisir des captures d'écran"}
          </label>
          {erreurGlobale && <p className="mt-3 text-sm text-signal">{erreurGlobale}</p>}
        </Card>
      )}

      {importTermine && (
        <Card className="mt-5 p-4 sm:mt-8 sm:p-6">
          <p className="text-sm text-ink/80">
            {importTermine.nbReussis} capture{importTermine.nbReussis > 1 ? "s" : ""} importée
            {importTermine.nbReussis > 1 ? "s" : ""}
            {importTermine.nbEchecs > 0
              ? `, ${importTermine.nbEchecs} échec${importTermine.nbEchecs > 1 ? "s" : ""}.`
              : "."}
          </p>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => router.push("/dashboard/demandes")}>Voir les projets</Button>
            <Button variant="ghost" onClick={() => setImportTermine(null)}>
              Importer d&apos;autres captures
            </Button>
          </div>
        </Card>
      )}

      {lignes.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {lignes.map((l) => (
            <Card
              key={l.index}
              className={`p-5 transition-colors ${l.erreur ? "border-signal/30" : ""}`}
            >
              {l.erreur ? (
                <p className="text-sm text-signal">
                  Capture {l.index + 1} : {l.erreur}
                </p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      <Avatar nom={l.extrait!.nom_client || "?"} taille={28} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-ink/80">{l.extrait!.nom_client}</p>
                        <p className="mt-1 text-sm text-ink/60">{l.extrait!.description_resumee}</p>
                        {l.extrait!.rdv_date && (
                          <p className="mt-1 text-xs text-steel">
                            Rendez-vous proposé le {l.extrait!.rdv_date}
                            {l.extrait!.rdv_heure ? ` à ${l.extrait!.rdv_heure}` : ""} — à planifier
                            vous-même après import.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-ink/70 mb-1.5">
                      Où importer ce message ?
                    </label>
                    <select
                      value={l.destination}
                      onChange={(e) => changerDestination(l.index, e.target.value)}
                      aria-label="Où importer ce message ?"
                      className="w-full sm:w-auto rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
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
            </Card>
          ))}

          {erreurGlobale && <p className="text-sm text-signal">{erreurGlobale}</p>}

          <div className="flex gap-3">
            <Button onClick={confirmerImport} disabled={importEnCours}>
              {importEnCours ? "Import en cours…" : "Confirmer l'import"}
            </Button>
            <Button variant="ghost" onClick={() => setLignes([])}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
