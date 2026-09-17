import { figerMentionsLegales } from "@/lib/moteur-metier/genererFacture";
import type { Devis, MentionsLegales, ParametresEntreprise } from "@/types";

// ============================================================
// Mentions légales et conditions du devis (Module 42, 17/09).
//
// SEUL endroit qui décide QUOI écrire sur un devis et COMMENT le formuler.
// Les rendus (aperçu de l'artisan, page de signature du client, PDF) ne
// font qu'afficher ce que ces fonctions renvoient — sans quoi le même texte
// juridique finit dupliqué, et tôt ou tard incohérent, d'un écran à
// l'autre.
//
// Sources : cahier-des-charges-devis-compyo.md (arrêté du 24 janvier 2017,
// code des assurances L241-2 et L243-3, code de la consommation).
// ============================================================

export const MENTION_MANUSCRITE =
  "Devis reçu avant l'exécution des travaux — Bon pour accord";

const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const nonVide = (v: string | null | undefined): v is string => Boolean(v && v.trim());

// Tant que le devis n'est pas envoyé, il affiche les paramètres vivants de
// l'entreprise (un oubli corrigé se voit aussitôt) ; une fois envoyé,
// l'instantané figé à ce moment-là.
export function mentionsEffectives(
  devis: Pick<Devis, "mentions_legales" | "mention_tva_reduite">,
  parametres: ParametresEntreprise | null | undefined
): MentionsLegales | null {
  if (devis.mentions_legales) return devis.mentions_legales;
  if (!parametres) return null;
  return figerMentionsLegales(parametres, devis.mention_tva_reduite);
}

// Depuis la réforme de 2022, tout entrepreneur individuel — micro-
// entrepreneur compris — doit faire figurer "EI" à côté de son nom. Aucun
// champ à remplir : la forme juridique suffit à le savoir.
export function estEntrepreneurIndividuel(forme: string | null | undefined): boolean {
  if (!forme) return false;
  const f = forme
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    /\bei\b/.test(f) ||
    f.includes("entrepreneur individuel") ||
    f.includes("entreprise individuelle") ||
    f.includes("auto-entrepreneur") ||
    f.includes("auto entrepreneur") ||
    f.includes("micro")
  );
}

export function nomEntreprise(m: MentionsLegales | null, repli: string): string {
  const nom = nonVide(m?.nom_entreprise) ? m!.nom_entreprise!.trim() : repli;
  if (!estEntrepreneurIndividuel(m?.forme_juridique)) return nom;
  return /\bEI\b/.test(nom) ? nom : `${nom} EI`;
}

// "SARL au capital de 10 000 € · SIRET … · RCS Lyon … · RM … · TVA …"
export function identiteJuridique(m: MentionsLegales | null): string[] {
  if (!m) return [];
  const lignes: string[] = [];

  const forme = nonVide(m.forme_juridique) ? m.forme_juridique!.trim() : null;
  if (forme && m.capital_social) {
    lignes.push(`${forme} au capital de ${euros(Number(m.capital_social))}`);
  } else if (forme) {
    lignes.push(forme);
  }
  if (nonVide(m.siret)) lignes.push(`SIRET ${m.siret!.trim()}`);
  // L'artisan écrit parfois déjà "RCS …" ou "RM …" dans le champ : on ne
  // double pas le préfixe.
  const sansPrefixe = (valeur: string, prefixe: string) =>
    valeur.trim().replace(new RegExp(`^${prefixe}\\b\\s*`, "i"), "");
  if (nonVide(m.rcs_numero)) {
    const numero = sansPrefixe(m.rcs_numero!, "RCS");
    lignes.push(nonVide(m.rcs_ville) ? `RCS ${m.rcs_ville!.trim()} ${numero}` : `RCS ${numero}`);
  }
  if (nonVide(m.rm_numero)) lignes.push(`RM ${sansPrefixe(m.rm_numero!, "RM")}`);
  if (m.mention_tva_non_applicable) {
    lignes.push("TVA non applicable, art. 293 B du CGI");
  } else if (nonVide(m.numero_tva_intracommunautaire)) {
    lignes.push(`TVA intracom. ${m.numero_tva_intracommunautaire!.trim()}`);
  }
  return lignes;
}

// Les deux assurances du bâtiment, avec TOUT ce que la loi exige : assureur,
// numéro de police (décennale) et couverture géographique. Une assurance
// dont seule une partie est renseignée s'affiche quand même — mieux vaut une
// mention incomplète qu'aucune, et le score qualité signale le manque.
export function mentionsAssurances(m: MentionsLegales | null): string[] {
  if (!m) return [];
  const lignes: string[] = [];

  const decennale = [
    m.assurance_decennale_compagnie?.trim(),
    nonVide(m.assurance_decennale_police) ? `police n° ${m.assurance_decennale_police!.trim()}` : null,
    nonVide(m.assurance_decennale_zone) ? `couverture : ${m.assurance_decennale_zone!.trim()}` : null,
  ].filter(nonVide);
  if (decennale.length > 0) lignes.push(`Assurance décennale : ${decennale.join(" — ")}`);

  const rcPro = [
    m.rc_pro_compagnie?.trim(),
    nonVide(m.rc_pro_zone) ? `couverture : ${m.rc_pro_zone!.trim()}` : null,
  ].filter(nonVide);
  if (rcPro.length > 0) lignes.push(`Responsabilité civile professionnelle : ${rcPro.join(" — ")}`);

  return lignes;
}

// Date de fin de validité, comptée à partir de l'envoi au client — c'est à
// ce moment-là que l'offre lui est faite. Avant l'envoi, on compte depuis la
// création, pour que l'aperçu montre une date plausible.
export function finDeValidite(
  devis: Pick<Devis, "validite_jours" | "envoye_le" | "created_at">
): Date | null {
  if (!devis.validite_jours) return null;
  const depart = new Date(devis.envoye_le ?? devis.created_at);
  depart.setDate(depart.getDate() + devis.validite_jours);
  return depart;
}

// Conditions de départ d'un NOUVEAU devis, reprises des paramètres de
// l'entreprise. L'artisan les règle une fois ; chaque devis part rempli.
// Partagé par toutes les routes qui créent un devis (génération IA, devis
// express), pour qu'elles ne divergent jamais.
export function conditionsParDefaut(parametres: Partial<ParametresEntreprise> | null | undefined): {
  validite_jours: number;
  acompte_pct: number | null;
} {
  return {
    validite_jours: parametres?.devis_validite_jours ?? 30,
    acompte_pct: parametres?.devis_acompte_pct ?? null,
  };
}

export type ConditionOffre = { libelle: string; valeur: string };

// Le bloc "Conditions" : validité, calendrier et paiement. Ne renvoie que ce
// qui est renseigné — une condition absente est signalée par le score
// qualité, jamais par une ligne vide sur le document du client.
export function conditionsOffre(
  devis: Pick<
    Devis,
    | "validite_jours"
    | "envoye_le"
    | "created_at"
    | "date_debut_prevue"
    | "duree_estimee"
    | "acompte_pct"
    | "total_estime"
  >,
  m: MentionsLegales | null
): ConditionOffre[] {
  const conditions: ConditionOffre[] = [];
  const dateLongue = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const fin = finDeValidite(devis);
  if (fin && devis.validite_jours) {
    conditions.push({
      libelle: "Validité de l'offre",
      valeur: `${devis.validite_jours} jours, soit jusqu'au ${dateLongue(fin)}`,
    });
  }

  if (devis.date_debut_prevue) {
    // "2026-10-05" lu comme une date locale, jamais UTC : sinon la veille
    // s'affiche pour tout le fuseau à l'ouest de Greenwich.
    const [a, mo, j] = devis.date_debut_prevue.split("-").map(Number);
    conditions.push({ libelle: "Début des travaux", valeur: `À partir du ${dateLongue(new Date(a, mo - 1, j))}` });
  }
  if (nonVide(devis.duree_estimee)) {
    conditions.push({ libelle: "Durée estimée", valeur: devis.duree_estimee!.trim() });
  }

  if (devis.acompte_pct && devis.acompte_pct > 0) {
    const acompte = Math.round(devis.total_estime * devis.acompte_pct) / 100;
    const solde = Math.round((devis.total_estime - acompte) * 100) / 100;
    conditions.push({
      libelle: "Acompte à la signature",
      valeur: `${formatPourcentage(devis.acompte_pct)}, soit ${euros(acompte)} TTC`,
    });
    conditions.push({ libelle: "Solde", valeur: `${euros(solde)} TTC à la fin des travaux` });
  }
  // Pas d'acompte renseigné : on n'écrit RIEN à la place. Écrire "paiement
  // à la fin des travaux" serait inventer une condition que l'artisan n'a
  // jamais posée, sur un document qui l'engage. Le score qualité signale le
  // manque ; l'artisan décide.

  if (nonVide(m?.moyens_paiement)) {
    conditions.push({ libelle: "Moyens de paiement", valeur: m!.moyens_paiement!.trim() });
  }

  return conditions;
}

function formatPourcentage(pct: number): string {
  return `${Number(pct).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}\u00a0%`;
}

// Mentions de bas de document, dans l'ordre de lecture.
export function mentionsFinDeDocument(m: MentionsLegales | null): string[] {
  const mentions = ["Devis gratuit."];

  // Dans le bâtiment, le devis est presque toujours signé au domicile du
  // client, c'est-à-dire "hors établissement" au sens du code de la
  // consommation. La mention est formulée au conditionnel de fait ("si")
  // pour rester exacte dans les autres cas.
  mentions.push(
    "Si ce devis est signé hors établissement, le client dispose d'un délai de rétractation de 14 jours à compter de la signature (art. L221-18 du code de la consommation)."
  );

  if (nonVide(m?.mediateur_nom)) {
    const coordonnees = nonVide(m?.mediateur_url)
      ? `${m!.mediateur_nom!.trim()} — ${m!.mediateur_url!.trim()}`
      : m!.mediateur_nom!.trim();
    mentions.push(
      `En cas de litige, le client peut recourir gratuitement au médiateur de la consommation : ${coordonnees}.`
    );
  }

  return mentions;
}
