"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { creerNote } from "@/lib/notes";
import { enregistrerEvenement } from "@/lib/timeline";
import { demanderAbonnementSiNecessaire } from "@/lib/pwa/notifications";
import {
  assemblerTranscription,
  obtenirClasseReconnaissance,
  messageErreurDictee,
  type SpeechRecognitionInstance,
} from "@/lib/dictee";
import { IconeMicro } from "@/components/projet/icones";
import type { ImportanceNote } from "@/types";

type ProjetLeger = { id: string; nom_client: string };

// ============================================================
// Une note ou un rappel — réutilisé tel quel par
// app/dashboard/notes/nouvelle/page.tsx (page dédiée, projet à choisir)
// ET par la feuille « Note » de la fiche projet (projetIdFixe déjà connu :
// rien à choisir, le projet n'est même pas rappelé — on est dedans).
//
// 06/10 (« le compagnon ») — l'artisan veut écrire « Penser à commander
// les deux robinets noirs » et c'est tout. Avant : un titre obligatoire,
// une description, trois niveaux d'importance, une case « Me le
// rappeler », puis un sélecteur de date et un d'heure, le tout dans une
// carte posée dans la feuille. Maintenant :
//   - un seul champ : la première phrase devient le titre (celui qu'on lit
//     dans « À faire »), le reste la description ;
//   - le rappel en un appui : Ce soir · Demain · Lundi, à des heures
//     d'artisan (18 h, 8 h) ; « Autre date » ouvre la date et l'heure ;
//   - « Important » en une bascule (l'ancien niveau « Moyenne » reste
//     possible quand la dictée le propose, il n'est plus à choisir).
// Le modèle de données ne change pas (titre, description, importance,
// rappel_a), ni le brouillon local, ni la dictée.
//
// Dictée : dicter → /api/notes/dicter structure la note → TOUJOURS relue
// et modifiable avant validation, jamais enregistrée directement.
//
// Permission de notification : jamais demandée au chargement de l'app ;
// seulement ici, quand un rappel est choisi et la note enregistrée.
// ============================================================

type Rappel = "aucun" | "soir" | "demain" | "lundi" | "autre";

/** AAAA-MM-JJ dans le fuseau du téléphone. */
function cleLocale(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Les rappels proposés, selon l'heure : « Ce soir » disparaît après 17 h,
 *  « Lundi » quand demain est lundi (c'est déjà « Demain »). */
function rappelsProposes(maintenant: Date): { cle: Exclude<Rappel, "aucun" | "autre">; libelle: string; quand: Date }[] {
  const a = (jours: number, heure: number) => {
    const d = new Date(maintenant);
    d.setDate(d.getDate() + jours);
    d.setHours(heure, 0, 0, 0);
    return d;
  };
  const liste: { cle: Exclude<Rappel, "aucun" | "autre">; libelle: string; quand: Date }[] = [];
  if (maintenant.getHours() < 17) liste.push({ cle: "soir", libelle: "Ce soir", quand: a(0, 18) });
  liste.push({ cle: "demain", libelle: "Demain 8 h", quand: a(1, 8) });
  const jusquALundi = ((8 - maintenant.getDay()) % 7) || 7;
  if (jusquALundi > 1) liste.push({ cle: "lundi", libelle: "Lundi 8 h", quand: a(jusquALundi, 8) });
  return liste;
}

/** La première ligne fait le titre (coupée à un mot près au-delà de 80
 *  caractères) ; le texte entier reste en description dès qu'il dit plus
 *  que le titre. Pas de coupe au premier point : « Appeler M. Dupont »
 *  doit rester entier. */
export function decouperNote(texte: string): { titre: string; description: string | null } {
  const propre = texte.trim();
  const premiereLigne = (propre.split(/\n/)[0] ?? "").trim();
  let titre = premiereLigne.replace(/[.!…\s]+$/, "");
  if (titre.length > 80) {
    // Titre coupé : la description garde tout le texte.
    const coupe = titre.slice(0, 80);
    const espace = coupe.lastIndexOf(" ");
    titre = `${(espace > 30 ? coupe.slice(0, espace) : coupe).trim()}…`;
    return { titre, description: propre };
  }
  // Sinon, la description est ce qui suit la première ligne.
  const suite = propre.split(/\n/).slice(1).join("\n").trim();
  return { titre, description: suite || null };
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function FormulaireNote({
  projetIdFixe,
  projets,
  onCree,
}: {
  projetIdFixe?: string;
  /** Gardé pour les appelants : le projet n'est plus rappelé dans la
   *  feuille d'une fiche (on est déjà dedans). */
  nomProjetFixe?: string;
  projets?: ProjetLeger[];
  onCree?: () => void;
  /** Gardé pour les appelants : la feuille se ferme par sa croix. */
  onAnnuler?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const idProjet = useId();
  const idTexte = useId();
  const [demandeId, setDemandeId] = useState(projetIdFixe ?? "");
  const [texte, setTexte] = useState("");
  const [importance, setImportance] = useState<ImportanceNote>("verte");
  const [rappel, setRappel] = useState<Rappel>("aucun");
  const [dateRappel, setDateRappel] = useState("");
  const [heureRappel, setHeureRappel] = useState("08:00");
  const [enregistrement, setEnregistrement] = useState(false);
  const [dicteeEnCours, setDicteeEnCours] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [brouillonRestaure, setBrouillonRestaure] = useState(false);
  // Gap 2 (11/09) — projet détecté par la dictée (note hors fiche
  // seulement). Le menu « Projet » reste la seule source de vérité.
  const [projetSuggereNom, setProjetSuggereNom] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  // L'heure du téléphone, lue après le montage (« Ce soir » dépend de
  // l'heure : le rendu serveur ne doit pas la deviner).
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  useEffect(() => setMaintenant(new Date()), []);
  const proposes = maintenant ? rappelsProposes(maintenant) : [];

  // Audit pré-bêta (09/09) — le brouillon local survit à un appel ou à
  // l'application fermée. Clé par projet ; même format qu'avant
  // ({ titre, description }) pour relire un brouillon laissé par
  // l'ancienne version.
  const cleBrouillon = `compyo_brouillon_note_${projetIdFixe ?? "generale"}`;

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(cleBrouillon);
      if (!brut) return;
      const brouillon = JSON.parse(brut) as { titre?: string; description?: string };
      const garde = [brouillon.titre?.trim(), brouillon.description?.trim()].filter(Boolean).join("\n");
      if (garde) {
        setTexte(garde);
        setBrouillonRestaure(true);
      }
    } catch {
      // localStorage indisponible ou contenu corrompu : jamais bloquant.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (texte.trim()) {
        window.localStorage.setItem(cleBrouillon, JSON.stringify({ titre: texte, description: "" }));
      } else {
        window.localStorage.removeItem(cleBrouillon);
      }
    } catch {
      // best effort
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);

  // Le champ grandit avec le texte (pas de barre de défilement interne).
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight + 2, 96)}px`;
  }, [texte]);

  function effacerBrouillon() {
    try {
      window.localStorage.removeItem(cleBrouillon);
    } catch {
      // best effort
    }
  }

  // Sans reconnaissance vocale (Safari iOS, Firefox), pas de bouton : le
  // micro du clavier du téléphone marche partout.
  // Lue après le montage : le rendu serveur ne connaît pas le navigateur
  // (sinon le bouton apparaîtrait d'un rendu à l'autre, erreur
  // d'hydratation sur /dashboard/notes/nouvelle).
  const [ClasseReconnaissance, setClasseReconnaissance] = useState<ReturnType<typeof obtenirClasseReconnaissance>>(null);
  useEffect(() => setClasseReconnaissance(() => obtenirClasseReconnaissance()), []);

  function dicter() {
    if (!ClasseReconnaissance) return;
    setErreur(null);
    setProjetSuggereNom(null);

    const recognition = new ClasseReconnaissance();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;
    let texteFinal = "";
    recognition.onresult = (event) => {
      texteFinal = assemblerTranscription(event.results);
    };
    recognition.onend = async () => {
      setEnregistrement(false);
      if (!texteFinal.trim()) return;
      setDicteeEnCours(true);
      const texteDicte = texteFinal.trim();
      try {
        const res = await fetch("/api/notes/dicter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texte: texteDicte }),
        });
        const data = await res.json();
        if (res.ok) {
          // Le titre proposé en première ligne, puis ce qui a été dit :
          // rien de ce qui est dit ne se perd (27/09).
          const titre = String(data.titre ?? "").trim();
          const suite = data.description?.trim() || (texteDicte !== titre ? texteDicte : "");
          setTexte([titre, suite].filter(Boolean).join("\n"));
          if (data.importance === "orange" || data.importance === "rouge") setImportance(data.importance);
          if (data.demandeIdSuggere && !projetIdFixe) {
            setDemandeId(data.demandeIdSuggere);
            setProjetSuggereNom(data.nomClientSuggere ?? null);
          }
        } else {
          setTexte(texteDicte);
        }
      } catch {
        // Hors réseau : le texte dicté tel quel, à relire.
        setTexte(texteDicte);
      } finally {
        setDicteeEnCours(false);
      }
    };
    recognition.onerror = (event) => {
      setEnregistrement(false);
      if (event?.error === "aborted") return;
      setErreur(messageErreurDictee(event?.error));
    };
    recognition.start();
    recognitionRef.current = recognition;
    setEnregistrement(true);
  }

  function arreterDictee() {
    recognitionRef.current?.stop();
  }

  function instantRappel(): Date | null {
    if (rappel === "aucun") return null;
    if (rappel === "autre") return dateRappel && heureRappel ? new Date(`${dateRappel}T${heureRappel}`) : null;
    return proposes.find((r) => r.cle === rappel)?.quand ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!texte.trim()) {
      setErreur("Écrivez la note d'abord.");
      zone.current?.focus();
      return;
    }
    const quand = instantRappel();
    if (rappel === "autre" && !quand) {
      setErreur("Choisissez le jour et l'heure du rappel.");
      return;
    }

    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setChargement(false);
      return;
    }

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) {
      setErreur("Aucune organisation associée à ce compte.");
      setChargement(false);
      return;
    }

    const { titre, description } = decouperNote(texte);
    const rappelA = quand ? quand.toISOString() : null;

    const { note, erreur: erreurCreation } = await creerNote(supabase, {
      organisationId,
      artisanId: user.id,
      demandeId: demandeId || null,
      titre,
      description,
      importance,
      rappelA,
    });

    setChargement(false);

    if (erreurCreation || !note) {
      setErreur(erreurCreation ?? "Pas enregistré. Réessayez.");
      return;
    }

    effacerBrouillon();

    if (demandeId) {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        organisationId,
        type: "note_ajoutee",
        titre: "Note ajoutée",
        detail: titre,
      });
    }

    // Une seule fois, et seulement si un rappel a été choisi.
    if (rappelA) {
      demanderAbonnementSiNecessaire();
    }

    if (onCree) {
      onCree();
    } else {
      router.push(demandeId ? `/dashboard/demandes/${demandeId}` : "/dashboard/notes");
    }
  }

  const puce = (actif: boolean) =>
    `min-h-12 rounded-full px-4 text-base font-semibold motion-safe:transition-colors ${FOCUS} ${
      actif ? "bg-ink text-paper active:bg-ink/80" : "text-ink ring-1 ring-inset ring-ink/30 active:bg-ink/10"
    }`;
  const champ =
    "mt-1.5 min-h-12 w-full rounded-xl bg-paper px-3 text-base text-ink ring-1 ring-inset ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink";
  const quand = instantRappel();
  const libelleBouton = chargement
    ? "Enregistrement…"
    : quand
      ? `Enregistrer · rappel ${quand.toLocaleDateString("fr-FR", { weekday: "short" })} ${quand.getHours()} h${quand.getMinutes() ? String(quand.getMinutes()).padStart(2, "0") : ""}`
      : "Enregistrer";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!projetIdFixe && (
        <div>
          <label htmlFor={idProjet} className="block text-sm text-steel">
            Projet
          </label>
          <select
            id={idProjet}
            value={demandeId}
            onChange={(e) => {
              setDemandeId(e.target.value);
              setProjetSuggereNom(null);
            }}
            className={champ}
          >
            <option value="">Aucun (note générale)</option>
            {(projets ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom_client}
              </option>
            ))}
          </select>
          {projetSuggereNom && <p className="mt-1.5 truncate text-sm text-steel">Rangée dans {projetSuggereNom}, d&apos;après la note.</p>}
        </div>
      )}

      <div>
        <label htmlFor={idTexte} className="text-sm text-steel">
          {brouillonRestaure ? "Pas encore enregistrée" : "À ne pas oublier"}
        </label>
        {/* Le champ avant le micro dans le document : la feuille donne le
            focus au premier champ, le clavier s'ouvre sur le texte. */}
        <div className="relative mt-2">
          <textarea
            id={idTexte}
            ref={zone}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={3}
            placeholder="Ex : commander les deux robinets noirs"
            className={`w-full resize-none rounded-2xl bg-surface px-4 py-3 text-base text-ink ring-1 ring-inset ring-ink/15 placeholder:text-steel focus:outline-none focus:ring-2 focus:ring-ink ${ClasseReconnaissance ? "pb-16" : ""}`}
          />
          {ClasseReconnaissance &&
            (!enregistrement ? (
              <button
                type="button"
                onClick={dicter}
                disabled={dicteeEnCours}
                className={`absolute bottom-2 right-2 inline-flex min-h-12 items-center gap-2 rounded-full bg-paper px-4 text-base font-semibold text-ink ring-1 ring-inset ring-ink/30 active:bg-ink/10 disabled:opacity-60 ${FOCUS}`}
              >
                <IconeMicro className="h-5 w-5" />
                {dicteeEnCours ? "Un instant…" : "Dicter"}
              </button>
            ) : (
              <button
                type="button"
                onClick={arreterDictee}
                className={`absolute bottom-2 right-2 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-4 text-base font-semibold text-paper ${FOCUS}`}
              >
                <span aria-hidden className="h-2 w-2 rounded-full bg-signal motion-safe:animate-pulse" />
                J&apos;ai fini
              </button>
            ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-steel">Me le rappeler</p>
        <div role="group" aria-label="Me le rappeler" className="mt-2 flex flex-wrap gap-2">
          {proposes.map((r) => (
            <button
              key={r.cle}
              type="button"
              aria-pressed={rappel === r.cle}
              onClick={() => setRappel(rappel === r.cle ? "aucun" : r.cle)}
              className={puce(rappel === r.cle)}
            >
              {r.libelle}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={rappel === "autre"}
            onClick={() => {
              if (rappel === "autre") return setRappel("aucun");
              setRappel("autre");
              if (!dateRappel) setDateRappel(cleLocale(new Date(Date.now() + 86400000)));
            }}
            className={puce(rappel === "autre")}
          >
            Autre date
          </button>
        </div>
        {rappel === "autre" && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm text-steel">
              Jour
              <input
                type="date"
                required
                min={cleLocale(maintenant ?? new Date())}
                value={dateRappel}
                onChange={(e) => setDateRappel(e.target.value)}
                className={champ}
              />
            </label>
            <label className="block text-sm text-steel">
              Heure
              <input type="time" required value={heureRappel} onChange={(e) => setHeureRappel(e.target.value)} className={champ} />
            </label>
          </div>
        )}
      </div>

      <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-ink">
        <input
          type="checkbox"
          checked={importance !== "verte"}
          onChange={(e) => setImportance(e.target.checked ? "rouge" : "verte")}
          className="h-5 w-5 rounded border-ink/30 accent-ink"
        />
        Important
      </label>

      <div aria-live="polite">
        {erreur && <p className="text-sm font-semibold text-signal-fonce dark:text-signal-clair">{erreur}</p>}
      </div>

      <button
        type="submit"
        disabled={chargement}
        className={`min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 disabled:opacity-60 sm:w-auto ${FOCUS}`}
      >
        <span className="block truncate">{libelleBouton}</span>
      </button>
    </form>
  );
}
