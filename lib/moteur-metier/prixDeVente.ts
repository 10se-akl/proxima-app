import type { Devis, LigneDeVente, LigneDevisCalculee } from "@/types";

// ============================================================
// Prix de vente — ce que voit le CLIENT (17/09).
//
// Les lignes stockées d'un devis portent le prix de REVIENT de l'artisan
// (son tarif horaire, ses fournitures) ; la marge et le déplacement
// s'ajoutent au niveau du document. Tant que le devis client affichait ces
// lignes telles quelles, puis un total qui incluait une marge invisible,
// ses lignes ne s'additionnaient pas : 1 000 € de lignes, 1 150 € HT au
// total. Pire, la facture de solde recopiait ces lignes et oubliait donc la
// marge ET le déplacement — l'artisan facturait moins que ce que son client
// avait signé.
//
// Ici, la marge est répartie dans le prix unitaire de chaque ligne, et le
// déplacement devient une ligne à part entière. Le total de ces lignes est
// EXACTEMENT le total HT du devis : calculerDevis/recalculerDevis le
// calculent à partir d'elles (voir totalHtDeVente). Tout document remis au
// client (aperçu, page de signature, PDF, facture) passe par ces lignes.
// ============================================================

const enCentimes = (n: number) => Math.round(n * 100);
const depuisCentimes = (c: number) => c / 100;

function coefficient(margePct: number): number {
  return 1 + (Number.isFinite(margePct) ? margePct : 0) / 100;
}

function venteDUneLigne(
  ligne: Pick<LigneDevisCalculee, "quantite" | "prix_unitaire" | "total">,
  coef: number
): { prix_unitaire: number; total: number } {
  const prixUnitaire = depuisCentimes(enCentimes(ligne.prix_unitaire * coef));
  const total = depuisCentimes(enCentimes(ligne.quantite * prixUnitaire));
  // Une ligne dont le total stocké ne correspond pas à quantité × prix
  // (saisie ancienne, ligne de complément) garde son propre total : c'est
  // lui qui a été montré et validé.
  const coherente = Math.abs(enCentimes(ligne.quantite * ligne.prix_unitaire) - enCentimes(ligne.total)) <= 1;
  return coherente
    ? { prix_unitaire: prixUnitaire, total }
    : { prix_unitaire: prixUnitaire, total: depuisCentimes(enCentimes(ligne.total * coef)) };
}

function deplacementDeVente(deplacement: number, coef: number): number {
  return depuisCentimes(enCentimes(deplacement * coef));
}

// Total HT du devis = somme des lignes telles que le client les lit.
export function totalHtDeVente(
  lignes: Pick<LigneDevisCalculee, "quantite" | "prix_unitaire" | "total">[],
  deplacement: number,
  margePct: number
): number {
  const coef = coefficient(margePct);
  const centimes =
    lignes.reduce((s, l) => s + enCentimes(venteDUneLigne(l, coef).total), 0) +
    enCentimes(deplacementDeVente(deplacement, coef));
  return depuisCentimes(centimes);
}

export function lignesDeVente(
  devis: Pick<Devis, "lignes" | "deplacement" | "marge_pct" | "total_estime" | "montant_tva">
): LigneDeVente[] {
  const coef = coefficient(devis.marge_pct);

  const lignes: LigneDeVente[] = devis.lignes.map((l) => ({
    description: l.description,
    categorie: l.categorie,
    quantite: l.quantite,
    unite: l.unite,
    ...venteDUneLigne(l, coef),
  }));

  if (devis.deplacement > 0) {
    const montant = deplacementDeVente(devis.deplacement, coef);
    lignes.push({
      description: "Déplacement",
      categorie: "deplacement",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: montant,
      total: montant,
    });
  }

  // Devis validés AVANT ce correctif : leur total HT arrondissait la marge
  // globalement, pas ligne par ligne — il peut différer de quelques
  // centimes de la somme ci-dessus. Le total stocké fait foi (c'est celui
  // que le client a vu et signé) : l'écart est reporté sur une ligne à
  // quantité 1, où prix et total restent égaux.
  // Les tout premiers devis (avant le module TVA) n'ont pas de montant de
  // TVA en base : sans lui, pas de total HT de référence, rien à ajuster.
  if (devis.montant_tva == null) return lignes;
  const totalHtStocke = enCentimes(devis.total_estime) - enCentimes(devis.montant_tva);
  const ecart = totalHtStocke - lignes.reduce((s, l) => s + enCentimes(l.total), 0);
  if (ecart !== 0 && lignes.length > 0) {
    const cible =
      [...lignes].reverse().find((l) => l.quantite === 1) ??
      lignes.reduce((max, l) => (Math.abs(l.total) > Math.abs(max.total) ? l : max), lignes[0]);
    cible.total = depuisCentimes(enCentimes(cible.total) + ecart);
    if (cible.quantite === 1) cible.prix_unitaire = cible.total;
  }

  return lignes;
}

// Les lignes figées à la validation font foi (c'est ce que le client a
// reçu) ; pour un brouillon, on les calcule à la volée.
export function lignesDuDocument(
  devis: Pick<Devis, "lignes" | "lignes_vente" | "deplacement" | "marge_pct" | "total_estime" | "montant_tva">
): LigneDeVente[] {
  return devis.lignes_vente ?? lignesDeVente(devis);
}
