import { lignesDuDocument } from "@/lib/moteur-metier/prixDeVente";
import {
  MENTION_MANUSCRITE,
  conditionsOffre,
  identiteJuridique,
  mentionsAssurances,
  mentionsFinDeDocument,
  nomEntreprise,
  type ConditionOffre,
} from "@/lib/devis/mentionsLegales";
import type { Devis, DevisPublic, LigneDeVente, LotDevis, MentionsLegales } from "@/types";

// ============================================================
// Modèle du document "devis" (17/09).
//
// Ce que contient le devis, dans l'ordre où on le lit — sans rien décider
// de sa mise en page. Chaque rendu (aperçu de l'artisan, page de signature
// du client, PDF) affiche CE modèle et rien d'autre : un devis ne peut donc
// pas dire une chose à l'écran et une autre sur papier.
// ============================================================

// Les champs du devis dont le document a besoin — communs au devis complet
// de l'artisan et à la version publique reçue par le client.
export type SourceDocumentDevis = {
  numero: string;
  lignes: LigneDeVente[];
  lots: LotDevis[];
  total_ht: number;
  tva_pct: number;
  montant_tva: number;
  total_estime: number;
  commentaires: string | null;
  mention_tva_reduite: string | null;
  objet: string | null;
  adresse_chantier: string | null;
  validite_jours: number | null;
  date_debut_prevue: string | null;
  duree_estimee: string | null;
  acompte_pct: number | null;
  created_at: string;
  envoye_le: string | null;
};

export type SignatureDocument = {
  nom: string | null;
  le: string;
  image: string | null;
};

export type ModeleDevis = {
  emetteur: {
    nom: string;
    logoUrl: string | null;
    adresse: string | null;
    contact: string | null;
    identite: string[];
  };
  numero: string;
  date: string;
  client: { nom: string; adresse: string | null; telephone: string | null };
  adresseChantier: string | null;
  objet: string | null;
  lignes: LigneDeVente[];
  // Les lignes dans l'ordre d'affichage. Sans lots : un seul groupe, sans
  // titre ni sous-total.
  groupes: GroupeLignes[];
  sousTotaux: { libelle: string; montant: number }[];
  totaux: {
    totalHt: number;
    // null quand l'entreprise est en franchise de TVA (art. 293 B).
    tva: { libelle: string; montant: number } | null;
    mentionTvaNonApplicable: boolean;
    totalTtc: number;
    libelleTotal: string;
  };
  conditions: ConditionOffre[];
  coordonneesBancaires: { iban: string | null; bic: string | null } | null;
  commentaires: string | null;
  mentionTva: string | null;
  assurances: string[];
  conditionsGenerales: string | null;
  mentionsFin: string[];
  mentionManuscrite: string;
  signature: SignatureDocument | null;
};

export type GroupeLignes = {
  // "2. Salle de bain" — et "Salle de bain" seul pour le sous-total.
  titre: string | null;
  nom: string | null;
  lignes: LigneDeVente[];
  sousTotal: number | null;
};

const centimes = (n: number) => Math.round(n * 100);

// Lots (17/09) : chaque lot, dans l'ordre choisi par l'artisan, avec ses
// lignes et son sous-total ; ce qui n'appartient à aucun lot (dont le
// déplacement) ferme la marche. Un lot vide n'apparaît pas sur le devis.
export function grouperLignes(lignes: LigneDeVente[], lots: LotDevis[]): GroupeLignes[] {
  if (lots.length === 0) return [{ titre: null, nom: null, lignes, sousTotal: null }];

  const connus = new Set(lots.map((l) => l.id));
  const groupes: GroupeLignes[] = [];
  let numero = 0;
  for (const lot of lots) {
    const lignesDuLot = lignes.filter((l) => l.lot_id === lot.id);
    if (lignesDuLot.length === 0) continue;
    numero += 1;
    const nom = lot.nom.trim() || "Lot sans nom";
    groupes.push({
      titre: `${numero}. ${nom}`,
      nom,
      lignes: lignesDuLot,
      sousTotal: lignesDuLot.reduce((s, l) => s + centimes(l.total), 0) / 100,
    });
  }
  const horsLot = lignes.filter((l) => !l.lot_id || !connus.has(l.lot_id));
  if (horsLot.length > 0) {
    groupes.push({
      // Un seul lot, plus le déplacement : inutile de numéroter ni de
      // titrer ce qui reste.
      titre: groupes.length > 0 ? "Autres prestations" : null,
      nom: groupes.length > 0 ? "Autres prestations" : null,
      lignes: horsLot,
      sousTotal: groupes.length > 0 ? horsLot.reduce((s, l) => s + centimes(l.total), 0) / 100 : null,
    });
  }
  return groupes;
}

const LIBELLE_CATEGORIE: Record<string, string> = {
  main_oeuvre: "Main-d'œuvre",
  fourniture: "Fournitures",
  forfait: "Prestations au forfait",
};

// À l'heure de Paris, quel que soit l'endroit où le document est rendu
// (serveur en UTC pour la page de signature, navigateur pour le PDF).
export function dateLongue(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

// Main-d'œuvre / fournitures séparées : une vraie faiblesse relevée chez un
// concurrent (Tolteck). Seulement si le devis en mélange au moins deux —
// sinon le sous-total répète le total. Le déplacement, déjà une ligne à
// part, n'entre pas dans ce récapitulatif.
function sousTotauxParCategorie(lignes: LigneDeVente[]): { libelle: string; montant: number }[] {
  const centimes = new Map<string, number>();
  for (const l of lignes) {
    if (l.categorie === "deplacement") continue;
    centimes.set(l.categorie, (centimes.get(l.categorie) ?? 0) + Math.round(l.total * 100));
  }
  if (centimes.size < 2) return [];
  return Array.from(centimes.entries()).map(([categorie, c]) => ({
    libelle: LIBELLE_CATEGORIE[categorie] ?? categorie,
    montant: c / 100,
  }));
}

export function sourceDepuisDevis(devis: Devis): SourceDocumentDevis {
  return {
    numero: devis.numero,
    lignes: lignesDuDocument(devis),
    lots: devis.lots ?? [],
    total_ht: (Math.round(devis.total_estime * 100) - Math.round(devis.montant_tva * 100)) / 100,
    tva_pct: devis.tva_pct,
    montant_tva: devis.montant_tva,
    total_estime: devis.total_estime,
    commentaires: devis.commentaires,
    mention_tva_reduite: devis.mention_tva_reduite,
    objet: devis.objet,
    adresse_chantier: devis.adresse_chantier,
    validite_jours: devis.validite_jours,
    date_debut_prevue: devis.date_debut_prevue,
    duree_estimee: devis.duree_estimee,
    acompte_pct: devis.acompte_pct,
    created_at: devis.created_at,
    envoye_le: devis.envoye_le,
  };
}

export function sourceDepuisDevisPublic(devis: DevisPublic): SourceDocumentDevis {
  return { ...devis };
}

export function construireModeleDevis({
  source,
  mentions,
  client,
  logoUrl,
  nomDeRepli,
  signature = null,
}: {
  source: SourceDocumentDevis;
  mentions: MentionsLegales | null;
  client: { nom: string; adresse: string | null; telephone: string | null };
  logoUrl: string | null;
  nomDeRepli: string;
  signature?: SignatureDocument | null;
}): ModeleDevis {
  const m = mentions;
  const contact = [m?.telephone, m?.email].filter((v): v is string => Boolean(v && v.trim())).join(" · ");

  // Franchise de TVA : on ne l'affiche comme telle que si le devis est
  // réellement sans TVA. Un devis à 20 % d'une entreprise cochée "293 B"
  // est une contradiction — on montre les montants tels qu'ils ont été
  // validés, jamais un total recalculé en douce ; le score qualité la
  // signale à l'artisan.
  // "?? 0" : les tout premiers devis n'ont ni taux ni montant de TVA en base.
  const tvaPct = Number(source.tva_pct ?? 0);
  const sansTva = Boolean(m?.mention_tva_non_applicable) && tvaPct === 0;

  const acompteDemande = Boolean(source.acompte_pct && source.acompte_pct > 0);
  const aDesCoordonnees = Boolean(m?.iban?.trim() || m?.bic?.trim());

  const adresseChantier =
    source.adresse_chantier?.trim() && source.adresse_chantier.trim() !== client.adresse?.trim()
      ? source.adresse_chantier.trim()
      : null;

  return {
    emetteur: {
      nom: nomEntreprise(m, nomDeRepli),
      logoUrl,
      adresse: m?.adresse?.trim() || null,
      contact: contact || null,
      identite: identiteJuridique(m),
    },
    numero: source.numero,
    date: dateLongue(source.envoye_le ?? source.created_at),
    client,
    adresseChantier,
    objet: source.objet?.trim() || null,
    lignes: source.lignes,
    groupes: grouperLignes(source.lignes, source.lots ?? []),
    // Avec des lots, le devis est déjà découpé : le récapitulatif par
    // catégorie ne ferait qu'ajouter des chiffres à lire.
    sousTotaux: (source.lots ?? []).length > 0 ? [] : sousTotauxParCategorie(source.lignes),
    totaux: {
      totalHt: source.total_ht,
      tva: sansTva
        ? null
        : {
            libelle: `TVA ${tvaPct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}\u00a0%`,
            montant: Number(source.montant_tva ?? 0),
          },
      mentionTvaNonApplicable: sansTva,
      totalTtc: source.total_estime,
      libelleTotal: sansTva ? "Total net à payer" : "Total TTC",
    },
    conditions: conditionsOffre(source, m),
    // Le RIB n'a sa place sur un devis que si un acompte est demandé : c'est
    // le seul paiement qui intervient avant la facture.
    coordonneesBancaires:
      acompteDemande && aDesCoordonnees ? { iban: m?.iban?.trim() || null, bic: m?.bic?.trim() || null } : null,
    commentaires: source.commentaires?.trim() || null,
    mentionTva: source.mention_tva_reduite?.trim() || null,
    assurances: mentionsAssurances(m),
    conditionsGenerales: m?.conditions_generales?.trim() || null,
    mentionsFin: mentionsFinDeDocument(m),
    mentionManuscrite: MENTION_MANUSCRITE,
    signature,
  };
}

// Formats partagés par tous les rendus, pour que les nombres s'écrivent
// partout de la même façon.
export function formatMontant(n: number): string {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function formatQuantite(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}
