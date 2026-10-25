"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconeFermer, IconeRetour } from "@/components/projet/icones";
import {
  BOUTON_ICONE,
  BOUTON_PLEIN,
  BOUTON_PLEIN_LARGE,
  BOUTON_TEXTE,
  CHAMP,
  ERREUR,
  FOCUS,
  SECONDAIRE,
  TITRE_SECTION,
  TUILE_ICONE,
} from "@/components/ui/recettes";
import { CATEGORIES, trouverCategorie, type Categorie, type SousCategorie } from "@/lib/retours/taxonomie";

// ============================================================
// "Faire un retour" — refonte complète du parcours (voir
// lib/retours/taxonomie.ts et app/api/retours/route.ts). Avant : un simple
// champ de texte, quasi systématiquement envoyé à l'IA. Maintenant : un
// parcours en 4 étapes (catégorie → sous-catégorie → importance →
// précisions facultatives) qui permet d'enregistrer 80 à 90% des retours
// SANS AUCUN appel IA — l'IA n'intervient plus que sur "Autre", "Nouvelle
// idée" ou un texte libre assez long (voir necessiteIA()). Toujours
// accessible (bouton flottant, présent sur tout le dashboard), pensé pour
// rester agréable et rapide malgré les étapes en plus : chaque choix
// avance automatiquement, rien à valider en plus d'un clic tant qu'on n'a
// pas de texte à taper.
// ============================================================

const NB_ETAPES = 4;

export function BoutonRetour() {
  const [ouvert, setOuvert] = useState(false);

  // 26/09 — sur téléphone, « Donner mon avis » (menu du compte) ouvre
  // cette fenêtre. 13/10 — sur ordinateur aussi : le bouton flottant
  // « Avis & idées » couvrait le bas des listes et des fiches, et faisait
  // doublon avec « Avis » en bas de la barre latérale. Il n'y a plus que
  // la fenêtre, ouverte par l'événement « compyo:ouvrir-retour ».
  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener("compyo:ouvrir-retour", ouvrir);
    return () => window.removeEventListener("compyo:ouvrir-retour", ouvrir);
  }, []);

  return (
    <>
      {ouvert && <ModaleRetour onFermer={() => setOuvert(false)} />}
    </>
  );
}

function ModaleRetour({ onFermer }: { onFermer: () => void }) {
  const supabase = createClient();
  const [etape, setEtape] = useState(1);
  const [categorieSlug, setCategorieSlug] = useState<string | null>(null);
  const [sousCategorieSlug, setSousCategorieSlug] = useState<string | null>(null);
  const [importance, setImportance] = useState(5);
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);

  const categorie = categorieSlug ? trouverCategorie(categorieSlug) : undefined;
  const aSousCategories = (categorie?.sousCategories.length ?? 0) > 0;

  // Un court délai avant de passer à l'étape suivante : le temps que la
  // carte cliquée affiche son état "sélectionné" (voir .fr-carte-
  // selectionnee, globals.css) plutôt que de sauter instantanément à
  // l'écran suivant — un retour visuel net donne l'impression d'un clic
  // qui "répond", pas d'un simple changement d'écran.
  const DELAI_TRANSITION_MS = 220;

  function choisirCategorie(c: Categorie) {
    setCategorieSlug(c.slug);
    setSousCategorieSlug(null);
    // Une catégorie sans sous-catégorie (ex: "Autre") saute directement à
    // l'importance — rien de pertinent à proposer en dessous.
    setTimeout(() => setEtape(c.sousCategories.length > 0 ? 2 : 3), DELAI_TRANSITION_MS);
  }

  function choisirSousCategorie(s: SousCategorie) {
    setSousCategorieSlug(s.slug);
    setTimeout(() => setEtape(3), DELAI_TRANSITION_MS);
  }

  function retour() {
    if (etape === 3 && !aSousCategories) {
      setEtape(1);
    } else {
      setEtape((e) => Math.max(1, e - 1));
    }
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);

    try {
      let pieceJointeChemin: string | null = null;

      if (fichier) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const chemin = `${user.id}/${Date.now()}-${fichier.name}`;
          const { error: erreurUpload } = await supabase.storage.from("retours").upload(chemin, fichier);
          if (!erreurUpload) pieceJointeChemin = chemin;
        }
      }

      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorie: categorieSlug,
          sous_categorie: sousCategorieSlug,
          importance,
          texte: texte.trim() || undefined,
          piece_jointe_chemin: pieceJointeChemin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error || "Impossible d'envoyer votre retour.");
        setEnvoi(false);
        return;
      }
      setEnvoi(false);
      setConfirme(true);
    } catch {
      setErreur("Impossible d'envoyer votre retour. Vérifiez votre connexion.");
      setEnvoi(false);
    }
  }

  // Design v3 (24/10) : la même feuille que les autres (coins de 28 px,
  // fond papier, ombre-feuille, voile sans flou), le titre sans capitales
  // espacées, la progression à l'encre, les choix en cartes (surface +
  // ombre douce) et un seul bouton plein par étape.
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" onClick={onFermer}>
      <div aria-hidden className="absolute inset-0 feuille-voile bg-black/40 dark:bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-retour"
        onClick={(e) => e.stopPropagation()}
        // pb calculé séparément du p-6 de base : cette feuille colle au
        // bord bas de l'écran sur mobile (coins arrondis en haut seulement)
        // — sans cette marge, son dernier bouton se retrouverait juste
        // au-dessus de la barre de geste du téléphone, difficile à
        // atteindre proprement du pouce.
        className="fr-modale-entree relative max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] bg-paper p-6 ombre-feuille [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-[28px] sm:p-7 sm:[padding-bottom:1.75rem]"
      >
        {confirme ? (
          <div className="py-8 text-center">
            <div className="fr-check-pop mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-succes-fond text-succes" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <p id="titre-retour" className={TITRE_SECTION}>Merci pour votre retour</p>
            <p className={`mt-1.5 ${SECONDAIRE}`}>
              Il vient d&apos;être rattaché à la carte mentale de Compyo.
            </p>
            <button type="button" onClick={onFermer} className={`mt-6 ${BOUTON_PLEIN}`}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex-1 pt-1">
                <p className={`mb-1 ${SECONDAIRE}`}>Avis &amp; idées</p>
                <h2 id="titre-retour" className={TITRE_SECTION}>
                  Un souci, une idée ? Dites-nous tout
                </h2>
              </div>
              <button type="button" onClick={onFermer} aria-label="Fermer" className={`-mr-2 -mt-1 text-steel ${BOUTON_ICONE}`}>
                <IconeFermer className="h-5 w-5" />
              </button>
            </div>

            {/* Progression — 4 segments, l'étape "sous-catégorie" reste
                affichée même quand elle est sautée, pour ne pas faire
                sauter la barre de façon déroutante. */}
            <div className="mb-6 flex gap-1.5" aria-label={`Étape ${etape} sur ${NB_ETAPES}`}>
              {Array.from({ length: NB_ETAPES }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className={`fr-progres-segment h-1.5 flex-1 rounded-full ${n <= etape ? "bg-ink" : "bg-gris-clair"}`}
                />
              ))}
            </div>

            {etape === 1 && (
              <EtapeCategorie key="etape-1" onChoisir={choisirCategorie} categorieSlug={categorieSlug} />
            )}

            {etape === 2 && categorie && (
              <EtapeSousCategorie
                key="etape-2"
                categorie={categorie}
                sousCategorieSlug={sousCategorieSlug}
                onChoisir={choisirSousCategorie}
                onRetour={retour}
              />
            )}

            {etape === 3 && (
              <EtapeImportance
                key="etape-3"
                importance={importance}
                onChange={setImportance}
                onRetour={retour}
                onContinuer={() => setEtape(4)}
              />
            )}

            {etape === 4 && (
              <EtapePrecisions
                key="etape-4"
                texte={texte}
                onTexteChange={setTexte}
                fichier={fichier}
                onFichierChange={setFichier}
                onRetour={retour}
                onEnvoyer={envoyer}
                envoi={envoi}
                erreur={erreur}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** La question d'une étape (17 semi-gras) et son aide éventuelle. */
function Question({ texte, aide }: { texte: string; aide?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[17px] font-semibold leading-snug text-ink">{texte}</p>
      {aide && <p className={`mt-0.5 ${SECONDAIRE}`}>{aide}</p>}
    </div>
  );
}

function EtapeCategorie({
  onChoisir,
  categorieSlug,
}: {
  onChoisir: (c: Categorie) => void;
  categorieSlug: string | null;
}) {
  return (
    <div className="fr-etape-entree">
      <Question texte="Quel est le sujet de votre retour ?" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {CATEGORIES.map((c) => {
          const choisi = categorieSlug === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => onChoisir(c)}
              aria-pressed={choisi}
              className={`flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-[20px] px-3 py-4 text-center motion-safe:transition-colors ${FOCUS} ${
                choisi ? "bg-ink text-paper" : "bg-surface text-ink ombre-douce active:bg-paper-warm sm:hover:bg-paper-warm/60"
              }`}
            >
              <span className={`${TUILE_ICONE} text-xl ${choisi ? "!bg-paper/15 !text-paper" : ""}`} aria-hidden="true">
                {c.icone}
              </span>
              <span className="text-[15px] font-semibold leading-snug">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EtapeSousCategorie({
  categorie,
  sousCategorieSlug,
  onChoisir,
  onRetour,
}: {
  categorie: Categorie;
  sousCategorieSlug: string | null;
  onChoisir: (s: SousCategorie) => void;
  onRetour: () => void;
}) {
  return (
    <div className="fr-etape-entree">
      <BoutonRetourEtape onClick={onRetour} />
      <Question texte={`${categorie.label} — précisez`} />
      <div className="overflow-hidden rounded-[20px] bg-surface ombre-douce divide-y divide-gris-clair">
        {categorie.sousCategories.map((s) => {
          const choisi = sousCategorieSlug === s.slug;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => onChoisir(s)}
              aria-pressed={choisi}
              className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-base motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ${
                choisi ? "bg-paper-warm font-semibold text-ink" : "text-ink active:bg-ink/10 sm:hover:bg-ink/5"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${choisi ? "border-ink" : "border-steel"}`}
                aria-hidden="true"
              >
                {choisi && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EtapeImportance({
  importance,
  onChange,
  onRetour,
  onContinuer,
}: {
  importance: number;
  onChange: (n: number) => void;
  onRetour: () => void;
  onContinuer: () => void;
}) {
  return (
    <div className="fr-etape-entree">
      <BoutonRetourEtape onClick={onRetour} />
      <Question texte="Quelle importance a ce problème pour vous ?" aide="Un simple repère pour nous aider à prioriser." />

      {/* Design v3 (24/10) : le chiffre en grand, à l'encre (plus de pastille
          saumon dont la teinte variait), et le curseur natif à l'encre. */}
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-4xl font-bold tabular-nums tracking-[-0.03em] text-ink" aria-hidden>
          {importance}
        </p>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={importance}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Importance, de 1 à 10"
          className="h-12 w-full cursor-pointer accent-ink"
        />
        <div className="flex w-full justify-between text-[13px] text-steel">
          <span>1 · Pas important</span>
          <span>10 · Bloquant</span>
        </div>
      </div>

      <button type="button" onClick={onContinuer} className={`mt-7 ${BOUTON_PLEIN_LARGE}`}>
        Continuer
      </button>
    </div>
  );
}

function EtapePrecisions({
  texte,
  onTexteChange,
  fichier,
  onFichierChange,
  onRetour,
  onEnvoyer,
  envoi,
  erreur,
}: {
  texte: string;
  onTexteChange: (v: string) => void;
  fichier: File | null;
  onFichierChange: (f: File | null) => void;
  onRetour: () => void;
  onEnvoyer: () => void;
  envoi: boolean;
  erreur: string | null;
}) {
  return (
    <div className="fr-etape-entree">
      <BoutonRetourEtape onClick={onRetour} />
      <Question texte="Avez-vous quelque chose à ajouter ?" aide="Entièrement facultatif." />

      <textarea
        rows={4}
        placeholder="Décrivez la situation si vous voulez en dire plus…"
        value={texte}
        onChange={(e) => onTexteChange(e.target.value)}
        aria-label="Précisions"
        className={`${CHAMP} min-h-[7.5rem] resize-none py-3`}
      />

      <div className="mt-3">
        {fichier ? (
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] bg-paper-warm pl-4">
            <span className="min-w-0 truncate text-[15px] text-ink">{fichier.name}</span>
            <button type="button" onClick={() => onFichierChange(null)} className={`shrink-0 ${BOUTON_TEXTE}`}>
              Retirer
            </button>
          </div>
        ) : (
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-paper-warm px-5 py-3 text-center text-[15px] font-semibold text-ink focus-within:ring-2 focus-within:ring-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
            </svg>
            Joindre une capture ou une photo (facultatif)
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFichierChange(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      {erreur && <p className={`mt-3 ${ERREUR}`}>{erreur}</p>}

      <button type="button" onClick={onEnvoyer} disabled={envoi} className={`mt-5 ${BOUTON_PLEIN_LARGE}`}>
        {envoi ? "Envoi en cours…" : "Envoyer mon retour"}
      </button>
    </div>
  );
}

function BoutonRetourEtape({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-3 mb-2 inline-flex min-h-12 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors ${FOCUS}`}
    >
      <IconeRetour className="h-4 w-4" />
      Retour
    </button>
  );
}
