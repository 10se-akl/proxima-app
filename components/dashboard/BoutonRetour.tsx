"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-anthracite text-white pl-3.5 pr-4 py-2.5 text-sm font-medium shadow-lg shadow-black/10 hover:bg-ink hover:scale-[1.03] active:scale-[0.97] transition-all"
      >
        <span aria-hidden="true">💡</span>
        <span>Faire un retour</span>
      </button>

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fr-modale-entree w-full sm:max-w-lg bg-paper rounded-t-3xl sm:rounded-3xl border border-ink/10 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        {confirme ? (
          <div className="py-8 text-center">
            <div className="fr-check-pop mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-signal/10 text-2xl">
              ✓
            </div>
            <p className="font-display text-lg font-semibold">Merci pour votre retour</p>
            <p className="mt-1.5 text-sm text-ink/60">
              Il vient d&apos;être rattaché à la carte mentale de Compyo.
            </p>
            <Button onClick={onFermer} className="mt-5 !px-5 !py-2.5">
              Fermer
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex-1">
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-1">
                  Faire un retour
                </p>
                <h2 className="font-display text-lg font-semibold">Aidez-nous à améliorer Compyo</h2>
              </div>
              <button
                type="button"
                onClick={onFermer}
                aria-label="Fermer"
                className="shrink-0 text-ink/40 hover:text-ink/70 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Progression — 4 segments, l'étape "sous-catégorie" reste
                affichée même quand elle est sautée, pour ne pas faire
                sauter la barre de façon déroutante. */}
            <div className="flex gap-1.5 mb-6">
              {Array.from({ length: NB_ETAPES }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className={`fr-progres-segment h-1 flex-1 rounded-full ${
                    n <= etape ? "bg-signal" : "bg-ink/10"
                  }`}
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

function EtapeCategorie({
  onChoisir,
  categorieSlug,
}: {
  onChoisir: (c: Categorie) => void;
  categorieSlug: string | null;
}) {
  return (
    <div className="fr-etape-entree">
      <p className="text-sm font-medium text-ink/80 mb-4">Quel est le sujet de votre retour ?</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => onChoisir(c)}
            className={`fr-carte ${
              categorieSlug === c.slug ? "fr-carte-selectionnee" : ""
            } flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-5 text-center ${
              categorieSlug === c.slug
                ? "border-signal bg-signal/10"
                : "border-ink/10 bg-surface hover:border-ink/25"
            }`}
          >
            <span className="text-2xl" aria-hidden="true">
              {c.icone}
            </span>
            <span className="text-xs font-medium text-ink/80">{c.label}</span>
          </button>
        ))}
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
      <p className="text-sm font-medium text-ink/80 mb-4">
        <span aria-hidden="true">{categorie.icone}</span> {categorie.label} — précisez
      </p>
      <div className="flex flex-col gap-2">
        {categorie.sousCategories.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => onChoisir(s)}
            className={`fr-carte flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${
              sousCategorieSlug === s.slug
                ? "border-signal bg-signal/10 text-signal-fonce font-medium"
                : "border-ink/10 bg-surface hover:border-ink/25 text-ink/80"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                sousCategorieSlug === s.slug ? "bg-signal" : "bg-ink/20"
              }`}
              aria-hidden="true"
            />
            {s.label}
          </button>
        ))}
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
      <p className="text-sm font-medium text-ink/80 mb-1">Quelle importance a ce problème pour vous ?</p>
      <p className="text-xs text-ink/40 mb-6">Un simple repère pour nous aider à prioriser.</p>

      <div className="flex flex-col items-center gap-4">
        <div
          className="grid h-16 w-16 place-items-center rounded-full text-xl font-display font-semibold transition-colors"
          style={{
            backgroundColor: `rgba(201, 107, 74, ${0.12 + (importance / 10) * 0.35})`,
            color: "rgb(var(--c-signal-fonce))",
          }}
        >
          {importance}
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={importance}
          onChange={(e) => onChange(Number(e.target.value))}
          className="fr-slider w-full"
        />
        <div className="flex w-full justify-between text-[11px] text-ink/40">
          <span>1 · Pas important</span>
          <span>10 · Bloquant</span>
        </div>
      </div>

      <Button onClick={onContinuer} className="mt-7 w-full justify-center">
        Continuer
      </Button>
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
      <p className="text-sm font-medium text-ink/80 mb-1">Avez-vous quelque chose à ajouter ?</p>
      <p className="text-xs text-ink/40 mb-4">Entièrement facultatif.</p>

      <textarea
        rows={4}
        placeholder="Décrivez la situation si vous voulez en dire plus…"
        value={texte}
        onChange={(e) => onTexteChange(e.target.value)}
        className="w-full rounded-2xl border border-ink/15 bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink/35 transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
      />

      <div className="mt-3">
        {fichier ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-surface px-3.5 py-2.5">
            <span className="truncate text-xs text-ink/70">{fichier.name}</span>
            <button
              type="button"
              onClick={() => onFichierChange(null)}
              className="shrink-0 text-xs text-ink/40 hover:text-ink/70"
            >
              Retirer
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 px-3.5 py-3 text-xs text-ink/50 transition-colors hover:border-ink/35 hover:text-ink/70">
            <span aria-hidden="true">📎</span>
            Joindre une capture d&apos;écran ou une photo (optionnel)
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFichierChange(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      {erreur && <p className="mt-3 text-sm text-signal">{erreur}</p>}

      <Button onClick={onEnvoyer} disabled={envoi} className="mt-5 w-full justify-center">
        {envoi ? "Envoi en cours…" : "Envoyer mon retour"}
      </Button>
    </div>
  );
}

function BoutonRetourEtape({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-1 text-xs text-ink/40 hover:text-ink/70 transition-colors"
    >
      ← Retour
    </button>
  );
}
