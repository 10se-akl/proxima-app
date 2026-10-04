import type { Projet, StatutProjet } from "@/types";
import type { CouleurPastille } from "@/components/ui/Pastille";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";

// ============================================================
// Comment un projet se présente dans une liste (refonte visuelle 04/10) :
// l'accueil (« Mes projets ») et la page Projets disent la même chose de
// la même façon.
// ============================================================

/** L'étape en mots de chantier, et sa couleur. Orange : ça attend
 *  l'artisan ; bleu : ça attend le client ; violet : signé ; vert : le
 *  chantier tourne ou il est fini. */
export const ETAPE_PROJET: Record<StatutProjet, { libelle: string; couleur: CouleurPastille }> = {
  nouveau: { libelle: "À cadrer", couleur: "orange" },
  analyse: { libelle: "Devis à préparer", couleur: "orange" },
  devis_genere: { libelle: "Devis à relire", couleur: "orange" },
  devis_envoye: { libelle: "Devis envoyé", couleur: "bleu" },
  accepte: { libelle: "Accepté", couleur: "violet" },
  en_cours: { libelle: "En cours", couleur: "vert" },
  termine: { libelle: "Terminé", couleur: "vert" },
};

// La colonne demandes.statut n'a pas de contrainte SQL (schema.sql) : les
// tout premiers projets portent encore les anciennes valeurs « nouvelle »
// et « analysee », d'avant le passage à sept étapes, et rien n'empêche une
// valeur inconnue. ETAPE_PROJET[statut] seul renvoyait alors undefined, et
// « .libelle » faisait tomber tout l'écran (04/10, l'accueil ne se
// chargeait plus). On passe toujours par etapeDe.
const ANCIENS_STATUTS: Record<string, StatutProjet> = { nouvelle: "nouveau", analysee: "analyse" };

/** L'étape d'un statut, quel qu'il soit : jamais undefined. */
export function etapeDe(statut: string | null | undefined): { libelle: string; couleur: CouleurPastille } {
  if (statut && Object.prototype.hasOwnProperty.call(ETAPE_PROJET, statut)) return ETAPE_PROJET[statut as StatutProjet];
  if (statut && Object.prototype.hasOwnProperty.call(ANCIENS_STATUTS, statut)) return ETAPE_PROJET[ANCIENS_STATUTS[statut]];
  return { libelle: "En préparation", couleur: "bleu" };
}

/** « Lyon · 69003 » depuis une adresse postale, sinon son dernier morceau. */
export function lieuDe(adresse: string | null): string | null {
  if (!adresse) return null;
  const m = adresse.match(/(\d{5})\s+([^,\n]+)/);
  if (m) return `${m[2].trim()} · ${m[1]}`;
  const morceaux = adresse
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return morceaux[morceaux.length - 1] ?? null;
}

/** Le type de travaux, sinon la première phrase de la description. */
export function quoiDe(p: Pick<Projet, "type_chantier" | "description">): string | null {
  const type = LABEL_TYPE_CHANTIER[p.type_chantier];
  return (type && p.type_chantier !== "autre" ? type : p.description?.trim().split(/[.,\n]/)[0]) || null;
}

const JOUR_MS = 86400000;
const CLE_JOUR = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "2-digit" });
const JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
const DATE_COURTE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
const heureCourte = (d: Date) => HEURE.format(d).replace(":", "h").replace(/h00$/, "h");

/** « Rendez-vous aujourd'hui à 14h », « … demain à 9h », « … lun. à 14h »,
 *  « … 12 oct. à 14h » (heure de Paris). */
export function prochainRendezVous(iso: string, maintenant: Date = new Date()): string {
  const d = new Date(iso);
  const ecart = Math.round((Date.parse(CLE_JOUR.format(d)) - Date.parse(CLE_JOUR.format(maintenant))) / JOUR_MS);
  const quand =
    ecart <= 0 ? "aujourd'hui" : ecart === 1 ? "demain" : ecart < 7 ? JOUR_SEMAINE.format(d) : DATE_COURTE.format(d);
  return `Rendez-vous ${quand} à ${heureCourte(d)}`;
}
