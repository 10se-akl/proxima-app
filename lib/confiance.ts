// ============================================================
// Les engagements de confiance (26/09 — « moins mais mieux », lot G).
//
// Source unique du texte, partagée par l'application (Paramètres › Mon
// compte) et le site vitrine (à côté de « Rejoindre la bêta ») — voir
// components/confiance/Engagements.tsx.
//
// Les deux premières lignes reprennent des décisions écrites dans
// docs/idees-futures.md (« il garde ce tarif à vie tant qu'il reste abonné
// — jamais de hausse rétroactive » ; « ne jamais bloquer la lecture des
// données existantes […] même si l'abonnement s'arrête »), qui ne sont pas
// encore en place côté facturation. D'où le drapeau, désactivé : on
// n'affiche pas une promesse avant de pouvoir la tenir.
// ============================================================

/** À passer à true par Axel, une fois les deux engagements tenus côté
 *  facturation. */
export const ENGAGEMENTS_ACTIFS = false;

/** Le contact humain : une adresse e-mail ou un numéro. Vide, la troisième
 *  ligne ne s'affiche pas. À remplir quand contact@compyo.fr sera active —
 *  ne rien mettre ici qui ne réponde pas vraiment. */
export const CONTACT_HUMAIN = "";

export const ENGAGEMENTS = {
  prix: "Votre prix ne bougera pas tant que vous restez abonné.",
  donnees: "Vos devis et factures restent consultables, même si vous arrêtez.",
  humain: "Une question ? Un humain vous répond.",
} as const;

/** mailto: pour une adresse, tel: pour un numéro. */
export function lienContact(contact: string): string {
  return contact.includes("@") ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, "")}`;
}
