"use client";

import Link from "next/link";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import { Avatar } from "@/components/ui/Avatar";
import { IconeChevron } from "@/components/projet/icones";
import type { Projet } from "@/types";

export const LABEL_STATUT: Record<Projet["statut"], string> = {
  nouveau: "Nouveau",
  analyse: "Analysé par l'IA",
  devis_genere: "Devis généré",
  devis_envoye: "Devis envoyé",
  accepte: "Accepté",
  en_cours: "Chantier en cours",
  termine: "Terminé",
};

// Déplacé dans lib/libellesChantier.ts (21/09) — voir ce fichier.
export { LABEL_TYPE_CHANTIER };

// La prochaine étape, en mots de chantier — pas le nom technique du
// statut (« Analysé par l'IA », « Devis généré »…).
const ETAPE: Record<Projet["statut"], string> = {
  nouveau: "À cadrer",
  analyse: "Devis à préparer",
  devis_genere: "Devis à relire",
  devis_envoye: "Devis envoyé",
  accepte: "Accepté, à démarrer",
  en_cours: "En cours",
  termine: "Terminé",
};

// ============================================================
// Une ligne de la liste des projets (27/09).
//
// Avant : pastille de couleur, avatar, nom, étiquette du type, statut
// technique en capitales, deux lignes de description, « Reste à faire »
// et un lien « Marquer chantier terminé » de 11 px sur chaque carte. Sur
// un téléphone, le nom du client — ce qu'on cherche — était coupé
// (« Mme … »), et un pouce pouvait clôturer un chantier par erreur.
// Maintenant : qui, quoi, où on en est. Clôturer un chantier se fait
// depuis la fiche (menu « … ») ou quand l'accueil le demande.
// ============================================================
export function DemandeCard({ demande }: { demande: Projet }) {
  const type = LABEL_TYPE_CHANTIER[demande.type_chantier];
  const quoi = type && demande.type_chantier !== "autre" ? type : demande.description?.trim().split(/[.,\n]/)[0];
  const urgent = demande.priorite === "urgent" && demande.statut !== "termine";
  return (
    <Link
      href={`/dashboard/demandes/${demande.id}`}
      className={`flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/[0.07] transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
        demande.statut === "termine" ? "opacity-70" : ""
      }`}
    >
      <Avatar nom={demande.nom_client || "?"} taille={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold text-ink">{demande.nom_client}</span>
          {urgent && (
            <span className="shrink-0 rounded-full bg-signal/12 px-2 py-0.5 text-[12px] font-semibold text-signal-fonce dark:text-signal-clair">
              Urgent
            </span>
          )}
        </span>
        <span className="block truncate text-[14px] text-ink/65">
          {[quoi, ETAPE[demande.statut]].filter(Boolean).join(" · ")}
        </span>
      </span>
      <IconeChevron className="h-4 w-4 shrink-0 text-ink/30" />
    </Link>
  );
}
