// ============================================================
// Libellés des types de chantier, partagés (21/09).
//
// Vivaient dans components/dashboard/DemandeCard.tsx, un composant
// client : une page rendue côté serveur (le bilan) ne peut pas y lire une
// simple constante — Next la remplace par une référence client. Déplacés
// ici, sans "use client", ils se lisent de partout ; DemandeCard les
// réexporte pour que ses importateurs historiques ne changent pas.
// ============================================================

// Revue métier (06/09) — élargi en même temps que TypeChantier (voir
// types/index.ts) : 11 nouvelles valeurs, une par métier auparavant sans
// équivalent (tous tombaient sur "autre" jusqu'ici).
export const LABEL_TYPE_CHANTIER: Record<string, string> = {
  salle_de_bain: "Salle de bain",
  cuisine: "Cuisine",
  peinture: "Peinture",
  toiture: "Toiture",
  electricite: "Électricité",
  plomberie: "Plomberie",
  chauffage: "Chauffage",
  maconnerie: "Maçonnerie",
  terrassement: "Terrassement",
  facade: "Façade",
  serrurerie: "Serrurerie",
  vitrerie: "Vitrerie",
  charpente: "Charpente",
  menuiserie: "Menuiserie",
  plaquisterie: "Plaquisterie",
  carrelage: "Carrelage",
  amenagement_exterieur: "Aménagement extérieur",
  climatisation: "Climatisation",
  piscine: "Piscine",
  renovation_complete: "Rénovation complète",
  autre: "",
};
