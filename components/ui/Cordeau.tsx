import type { StatutProjet } from "@/types";

// ============================================================
// « Le cordeau » (design v3, 23/10) — la signature visuelle de Compyo.
//
// Le cordeau de traceur des artisans : un trait en cinq segments
// (Demande · Devis · Signé · Chantier · Terminé). Le chemin fait est à
// l'encre, la suite au filet ; quand le chantier est terminé, tout le trait
// passe au vert. Sous chaque projet des listes, et en grand sur la fiche.
// Décoratif pour un lecteur d'écran : l'étape est toujours écrite à côté.
// ============================================================

export const ETAPES_PROJET: { libelle: string; statuts: StatutProjet[] }[] = [
  { libelle: "Demande", statuts: ["nouveau", "analyse"] },
  { libelle: "Devis", statuts: ["devis_genere", "devis_envoye"] },
  { libelle: "Signé", statuts: ["accepte"] },
  { libelle: "Chantier", statuts: ["en_cours"] },
  { libelle: "Terminé", statuts: ["termine"] },
];

const ANCIENS: Record<string, StatutProjet> = { nouvelle: "nouveau", analysee: "analyse" };

/** L'étape (0 à 4) d'un statut, quel qu'il soit. */
export function indexEtape(statut: string | null | undefined): number {
  const s = (statut && ANCIENS[statut]) || statut;
  return Math.max(0, ETAPES_PROJET.findIndex((e) => e.statuts.includes(s as StatutProjet)));
}

export function Cordeau({ statut, taille = "mini", className = "" }: { statut: string; taille?: "mini" | "grand"; className?: string }) {
  const etape = indexEtape(statut);
  const fini = etape === ETAPES_PROJET.length - 1;
  const fait = fini ? "bg-succes" : "bg-ink";
  return (
    <span aria-hidden className={`flex ${taille === "grand" ? "gap-1" : "w-16 gap-[3px]"} ${className}`}>
      {ETAPES_PROJET.map((e, i) => (
        <span
          key={e.libelle}
          className={`flex-1 rounded-full ${taille === "grand" ? "h-1.5" : "h-1"} ${i <= etape ? fait : "bg-gris-clair"}`}
        />
      ))}
    </span>
  );
}
