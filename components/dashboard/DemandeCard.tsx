"use client";

import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import { etapeDe, lieuDe, quoiDe } from "@/lib/projetAffichage";
import { LigneChantier } from "@/components/accueil/ChantiersAccueil";
import type { Projet } from "@/types";

export const LABEL_STATUT: Record<Projet["statut"], string> = {
  nouveau: "Nouveau",
  analyse: "Notes résumées",
  devis_genere: "Devis généré",
  devis_envoye: "Devis envoyé",
  accepte: "Accepté",
  en_cours: "Chantier en cours",
  termine: "Terminé",
};

// Déplacé dans lib/libellesChantier.ts (21/09) — voir ce fichier.
export { LABEL_TYPE_CHANTIER };

// ============================================================
// Une ligne de la liste des projets.
//
// 27/09 : qui, quoi, où on en est ; clôturer un chantier se fait depuis
// la fiche (menu « … ») ou quand l'accueil le demande, jamais d'un pouce
// sur la liste.
// Refonte visuelle (04/10, maquette d'Axel) : la même ligne que « Mes
// projets » sur l'accueil (components/accueil/ChantiersAccueil.tsx) :
// photo du chantier, ville, étape en couleur, prochain rendez-vous, et
// appeler / WhatsApp / y aller.
// ============================================================
export function DemandeCard({
  demande,
  photo = null,
  info = null,
}: {
  demande: Projet;
  /** URL signée de la première photo. */
  photo?: string | null;
  /** « Rendez-vous demain à 9h ». */
  info?: string | null;
}) {
  const etape = etapeDe(demande.statut);
  const termine = demande.statut === "termine";
  return (
    <LigneChantier
      c={{
        id: demande.id,
        nom: demande.nom_client,
        quoi: quoiDe(demande),
        lieu: lieuDe(demande.adresse_client),
        etape: etape.libelle,
        couleur: etape.couleur,
        info,
        telephone: demande.telephone_client,
        adresse: demande.adresse_client,
        photo,
        urgent: demande.priorite === "urgent" && !termine,
        estompe: termine,
      }}
    />
  );
}
