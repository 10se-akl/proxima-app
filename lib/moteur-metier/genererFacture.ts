import type { Devis, Facture, LigneFacture, MentionsLegales, ParametresEntreprise } from "@/types";
import { lignesDuDocument } from "@/lib/moteur-metier/prixDeVente";

// ============================================================
// Module 28 (06/09) — génération des lignes/montants d'une facture.
// 100% déterministe, aucun appel IA : une facture copie ou dérive
// toujours des montants DÉJÀ validés sur un devis — jamais une nouvelle
// estimation. Même philosophie que lib/moteur-metier/calculerDevis.ts.
// ============================================================

function arrondir(n: number): number {
  return Math.round(n * 100) / 100;
}

// Recalcule sous_total_ht/montant_tva/total_ttc à partir d'un tableau de
// lignes déjà chiffrées (chaque ligne porte déjà son "total" TTC-neutre,
// voir LigneFacture) et d'un taux de TVA unique — une facture Compyo
// n'a qu'un seul taux de TVA, comme le devis dont elle dérive.
function totauxDepuisLignes(lignes: LigneFacture[], tvaPct: number) {
  const sousTotalHT = arrondir(lignes.reduce((s, l) => s + l.total, 0));
  const montantTVA = arrondir(sousTotalHT * (tvaPct / 100));
  const totalTTC = arrondir(sousTotalHT + montantTVA);
  return { sous_total_ht: sousTotalHT, montant_tva: montantTVA, total_ttc: totalTTC };
}

// Facture "solde" (le cas standard) : les lignes du devis TELLES QUE LE
// CLIENT LES A SIGNÉES, diminuées des acomptes déjà facturés.
//
// 🔴 Corrigé le 17/09 : cette fonction recopiait devis.lignes, qui portent
// le prix de REVIENT — sans la marge ni le déplacement, contrairement à ce
// qu'affirmait l'ancien commentaire. Un devis signé à 1 302,95 € TTC
// donnait une facture de 1 100 € TTC. lignesDeVente renvoie les prix
// marge incluse et le déplacement en ligne (celles figées à la validation
// quand elles existent) : leur somme est exactement le
// total HT du devis, donc la facture retombe sur son total TTC.
export function genererLignesFactureComplete(
  devis: Devis,
  facturesAcompteLiees: Facture[]
): { lignes: LigneFacture[]; tva_pct: number } {
  const lignes: LigneFacture[] = lignesDuDocument(devis).map((l) => ({
    description: l.description,
    categorie: l.categorie === "deplacement" ? "forfait" : l.categorie,
    quantite: l.quantite,
    unite: l.unite,
    prix_unitaire: l.prix_unitaire,
    total: l.total,
    // La note de calcul du devis ("14 h × 45 €/h, coût horaire configuré")
    // est interne à l'artisan : elle n'a rien à faire sur une facture.
    detail_calcul: "",
  }));

  // Une ligne négative par acompte déjà facturé — visible et justifiée sur
  // le document, jamais une simple soustraction silencieuse du total.
  for (const acompte of facturesAcompteLiees) {
    lignes.push({
      description: `Déduction acompte facturé le ${new Date(acompte.date_emission).toLocaleDateString("fr-FR")} (facture n° ${acompte.numero})`,
      categorie: "forfait",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: -acompte.sous_total_ht,
      total: -acompte.sous_total_ht,
      detail_calcul: `Acompte déjà réglé, à ne pas facturer une seconde fois`,
    });
  }

  return { lignes, tva_pct: devis.tva_pct };
}

// Facture d'acompte : une seule ligne, calculée sur un montant TTC saisi
// par l'artisan (ex : "30% à la commande") — jamais un pourcentage
// recalculé par l'IA. On repart du HT pour rester cohérent avec le
// principe "les lignes portent un total HT, la TVA s'applique une seule
// fois au niveau du document" déjà en place pour les devis.
export function genererLignesFactureAcompte(
  devis: Devis,
  montantAcompteTTC: number
): { lignes: LigneFacture[]; tva_pct: number } {
  const tvaPct = devis.tva_pct;
  const montantAcompteHT = arrondir(montantAcompteTTC / (1 + tvaPct / 100));
  const pourcentageDuDevis = devis.total_estime > 0 ? Math.round((montantAcompteTTC / devis.total_estime) * 1000) / 10 : 0;

  const ligne: LigneFacture = {
    description: `Acompte de ${pourcentageDuDevis}% sur le devis n° ${devis.numero}`,
    categorie: "forfait",
    quantite: 1,
    unite: "forfait",
    prix_unitaire: montantAcompteHT,
    total: montantAcompteHT,
    detail_calcul: `${montantAcompteTTC.toFixed(2)} € TTC demandés par l'artisan, ramenés en HT au taux de TVA du devis (${tvaPct}%)`,
  };

  return { lignes: [ligne], tva_pct: tvaPct };
}

// Avoir : reprend exactement les lignes de la facture annulée, montants
// inversés — jamais un nouveau calcul, un avoir n'est qu'un miroir négatif
// du document qu'il annule.
export function genererLignesAvoir(factureOriginale: Facture): { lignes: LigneFacture[]; tva_pct: number } {
  const lignes: LigneFacture[] = factureOriginale.lignes.map((l) => ({
    ...l,
    // Préfixe "Annulation — " : sans lui, une ligne déjà négative sur la
    // facture d'origine (ex : "Déduction acompte facturé...", voir
    // genererLignesFactureComplete) redeviendrait positive une fois
    // inversée par l'avoir, avec un libellé qui parlerait toujours de
    // "déduction" pour un montant qui, lui, s'ajoute — source de confusion
    // à la lecture même si le total final reste mathématiquement correct.
    description: `Annulation — ${l.description}`,
    prix_unitaire: -l.prix_unitaire,
    total: -l.total,
  }));
  return { lignes, tva_pct: factureOriginale.tva_pct };
}

export function calculerTotauxFacture(lignes: LigneFacture[], tvaPct: number) {
  return totauxDepuisLignes(lignes, tvaPct);
}

// Instantané des mentions légales au moment de l'émission — voir le
// commentaire sur factures.mentions_legales dans supabase/schema.sql :
// une facture émise ne doit jamais changer de contenu si l'artisan modifie
// ses paramètres après coup.
export function figerMentionsLegales(
  parametres: ParametresEntreprise,
  mentionTvaReduite: string | null = null
): MentionsLegales {
  return {
    nom_entreprise: parametres.nom_entreprise,
    adresse: parametres.adresse,
    telephone: parametres.telephone,
    email: parametres.email,
    siret: parametres.siret,
    forme_juridique: parametres.forme_juridique,
    numero_tva_intracommunautaire: parametres.numero_tva_intracommunautaire,
    mention_tva_non_applicable: parametres.mention_tva_non_applicable,
    assurance_decennale_compagnie: parametres.assurance_decennale_compagnie,
    assurance_decennale_police: parametres.assurance_decennale_police,
    // Module 42 (17/09) — également obligatoires sur la facture ; figés ici
    // pour les deux documents, qui partagent cette même fonction.
    assurance_decennale_zone: parametres.assurance_decennale_zone,
    rc_pro_compagnie: parametres.rc_pro_compagnie,
    rc_pro_zone: parametres.rc_pro_zone,
    capital_social: parametres.capital_social,
    rcs_numero: parametres.rcs_numero,
    rcs_ville: parametres.rcs_ville,
    rm_numero: parametres.rm_numero,
    mediateur_nom: parametres.mediateur_nom,
    mediateur_url: parametres.mediateur_url,
    moyens_paiement: parametres.moyens_paiement,
    // Les conditions générales font partie de l'engagement : figées avec le
    // reste, pour qu'une modification ultérieure ne réécrive pas un devis
    // déjà envoyé.
    conditions_generales: parametres.conditions_generales,
    iban: parametres.iban,
    bic: parametres.bic,
    // Mention TVA réduite (08/09) — reprise telle quelle du devis d'origine,
    // jamais régénérée : si l'artisan a modifié le texte suggéré sur le
    // devis, c'est CE texte-là (déjà montré/accepté par le client) qui doit
    // figurer sur la facture, pas une nouvelle version recalculée.
    mention_tva_reduite: mentionTvaReduite,
  };
}

// Numéro affiché sur le document — même format que les devis (année +
// séquence sur 3 chiffres), le TYPE (facture/acompte/avoir) est indiqué
// par ailleurs sur le document (titre, badge), jamais par un préfixe dans
// le numéro : une seule séquence continue par organisation et par année,
// voir prochain_numero_facture() dans supabase/schema.sql — mélanger des
// préfixes par type romprait la continuité visible de la numérotation.
export function formaterNumeroFacture(annee: number, numeroSequentiel: number): string {
  return `${annee}-${String(numeroSequentiel).padStart(3, "0")}`;
}
