"use client";

import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";

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
// ============================================================

export type ProjetOuvertMatch = {
  id: string;
  nom_client: string;
  type_chantier: string;
  statut: string;
};

export function CorrespondanceProjetExistant({
  correspondances,
  onChoisir,
  onCreerNouveau,
  enCours,
  erreur,
}: {
  correspondances: ProjetOuvertMatch[];
  onChoisir: (projetId: string) => void;
  onCreerNouveau: () => void;
  enCours: boolean;
  erreur?: string | null;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink">
        {correspondances.length === 1
          ? "Ce client a déjà un projet ouvert"
          : "Ce client a plusieurs projets ouverts"}
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        Le numéro trouvé dans ce message correspond à un client déjà connu. À quel projet ce
        message se rapporte-t-il ?
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {correspondances.map((projet) => (
          <button
            key={projet.id}
            onClick={() => onChoisir(projet.id)}
            disabled={enCours}
            className="rounded-xl border border-ink/10 bg-paper-warm px-4 py-3 text-left text-sm text-ink/80 transition-colors hover:border-signal/40 hover:bg-signal/5 disabled:opacity-60"
          >
            <span className="font-medium text-ink">{projet.nom_client}</span>
            {" — "}
            {LABEL_TYPE_CHANTIER[projet.type_chantier] || "Chantier"}
          </button>
        ))}
      </div>
      <button
        onClick={onCreerNouveau}
        disabled={enCours}
        className="mt-4 text-sm text-ink/50 underline underline-offset-2 hover:text-ink transition-colors disabled:opacity-60"
      >
        Ce n&apos;est pas ça — créer un nouveau projet quand même
      </button>
      {erreur && <p className="mt-3 text-sm text-signal">{erreur}</p>}
    </div>
  );
}
