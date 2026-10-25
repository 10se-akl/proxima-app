"use client";

import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { IconeChevron } from "@/components/projet/icones";
import {
  BOUTON_PLEIN_LARGE,
  BOUTON_TEXTE,
  CREUX,
  ERREUR,
  ETIQUETTE,
  FORME_ETIQUETTE,
  GROUPE,
  SECONDAIRE,
  TITRE_ECRAN,
} from "@/components/ui/recettes";

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
  // Design v3 (24/10) : une étiquette sobre « Client reconnu », le titre
  // d'écran sans coupure, le message en creux, les projets en liste groupée
  // (lignes de 64 px), un seul bouton plein, l'autre choix en bouton texte.
  return (
    <div>
      <span className={`${FORME_ETIQUETTE} ${ETIQUETTE.succes}`}>Client reconnu</span>
      <h1 className={`mt-3 break-words ${TITRE_ECRAN}`}>
        {seul ? `C'est ${nom}.` : "Client déjà connu."}
      </h1>
      <p className={`mt-1 ${SECONDAIRE}`}>
        {seul
          ? `Numéro reconnu · ${LABEL_TYPE_CHANTIER[seul.type_chantier] || "projet en cours"}`
          : `${correspondances.length} projets ouverts.`}
      </p>

      {extrait?.trim() && (
        <blockquote className={`mt-5 px-4 py-3 text-base text-ink ${CREUX}`}>
          <p className="line-clamp-3 whitespace-pre-line">{extrait.trim()}</p>
        </blockquote>
      )}

      {seul ? (
        <button
          type="button"
          onClick={() => onChoisir(seul.id)}
          disabled={enCours}
          className={`mt-6 sm:w-auto ${BOUTON_PLEIN_LARGE}`}
        >
          <span className="block min-w-0 break-words">{enCours ? "Ajout…" : `Ajouter au projet ${seul.nom_client}`}</span>
        </button>
      ) : (
        <>
          <p className={`mt-6 px-1 ${SECONDAIRE}`}>Ajouter au projet :</p>
          <ul className={`mt-2 ${GROUPE}`}>
            {correspondances.map((projet) => (
              <li key={projet.id}>
                <button
                  type="button"
                  onClick={() => onChoisir(projet.id)}
                  disabled={enCours}
                  className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-ink/10 disabled:opacity-60 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[17px] font-semibold leading-snug text-ink">{projet.nom_client}</span>
                    <span className={`block ${SECONDAIRE}`}>{LABEL_TYPE_CHANTIER[projet.type_chantier] || "Chantier"}</span>
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
        className={`-ml-3 mt-3 disabled:opacity-60 ${BOUTON_TEXTE}`}
      >
        Non, c&apos;est un nouveau projet
      </button>
      <div aria-live="polite">
        {erreur && <p className={ERREUR}>{erreur}</p>}
      </div>
    </div>
  );
}
