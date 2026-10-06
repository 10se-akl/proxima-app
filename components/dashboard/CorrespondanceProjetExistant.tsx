"use client";

import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { IconeChevron } from "@/components/projet/icones";

// ============================================================
// Audit pré-bêta (09/09), point 🔴 n°1 — extrait de app/dashboard/demandes/
// partage/[id]/page.tsx (parcours de partage natif Android) pour être
// réutilisé À L'IDENTIQUE par app/dashboard/demandes/importer/page.tsx
// (parcours de collage manuel, utilisé sur iPhone où Web Share Target
// n'existe pas). Avant ce correctif, seul le parcours Android proposait ce
// choix — un artisan sur iPhone qui recollait un message d'un client déjà
// connu se retrouvait avec un nouveau projet en double à chaque fois.
//
// Toujours un choix explicite affiché à l'artisan, jamais un rattachement
// automatique silencieux — même principe que le matching lui-même (voir
// app/api/partage/matcher/route.ts).
//
// 06/10 (« le compagnon ») — Compyo a reconnu le client : il le dit en
// une ligne, montre le début du message, et l'action la plus probable
// (« Ajouter au projet Martin ») est le bouton plein. Créer un autre
// projet reste à un appui, en bouton texte.
// ============================================================

export type ProjetOuvertMatch = {
  id: string;
  nom_client: string;
  type_chantier: string;
  statut: string;
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function CorrespondanceProjetExistant({
  correspondances,
  onChoisir,
  onCreerNouveau,
  enCours,
  erreur,
  extrait,
}: {
  correspondances: ProjetOuvertMatch[];
  onChoisir: (projetId: string) => void;
  onCreerNouveau: () => void;
  enCours: boolean;
  erreur?: string | null;
  /** Le message reçu, pour savoir de quoi on parle sans changer d'écran. */
  extrait?: string | null;
}) {
  const seul = correspondances.length === 1 ? correspondances[0] : null;
  const nom = correspondances[0]?.nom_client ?? "";
  return (
    <div>
      <h1 className="truncate font-display text-3xl font-semibold text-ink">
        {seul ? `C'est ${nom}.` : "Client déjà connu."}
      </h1>
      <p className="mt-1 truncate text-base text-steel">
        {seul
          ? `Numéro reconnu · ${LABEL_TYPE_CHANTIER[seul.type_chantier] || "projet en cours"}`
          : `${correspondances.length} projets ouverts.`}
      </p>

      {extrait?.trim() && (
        <blockquote className="mt-5 rounded-2xl bg-paper-warm px-4 py-3 text-base text-ink">
          <p className="line-clamp-3 whitespace-pre-line">{extrait.trim()}</p>
        </blockquote>
      )}

      {seul ? (
        <button
          type="button"
          onClick={() => onChoisir(seul.id)}
          disabled={enCours}
          className={`mt-5 min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 disabled:opacity-60 sm:w-auto ${FOCUS}`}
        >
          <span className="block truncate">{enCours ? "Ajout…" : `Ajouter au projet ${seul.nom_client}`}</span>
        </button>
      ) : (
        <>
          <p className="mt-5 text-sm text-steel">Ajouter au projet :</p>
          <ul className="mt-2 flex flex-col gap-2">
            {correspondances.map((projet) => (
              <li key={projet.id}>
                <button
                  type="button"
                  onClick={() => onChoisir(projet.id)}
                  disabled={enCours}
                  className={`flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-ink/15 active:bg-ink/10 disabled:opacity-60 sm:hover:bg-ink/5 ${FOCUS}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-ink">{projet.nom_client}</span>
                    <span className="block truncate text-sm text-steel">{LABEL_TYPE_CHANTIER[projet.type_chantier] || "Chantier"}</span>
                  </span>
                  <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        onClick={onCreerNouveau}
        disabled={enCours}
        className={`mt-3 inline-flex min-h-12 items-center px-0 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 disabled:opacity-60 ${FOCUS}`}
      >
        Non, c&apos;est un nouveau projet
      </button>
      <div aria-live="polite">
        {erreur && <p className="mt-3 text-sm font-semibold text-signal-fonce dark:text-signal-clair">{erreur}</p>}
      </div>
    </div>
  );
}
