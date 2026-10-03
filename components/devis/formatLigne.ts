import type { LigneDevisCalculee } from "@/types";

// ============================================================
// Comment une ligne se lit sur téléphone (refonte du 03/10, duel F lot 3) :
// « 18 m² × 22,00 € », « 2 jours × 360,00 € », « Forfait ». La quantité en
// clair est le seul moyen de repérer une quantité fausse (24 m² au lieu de
// 20) qu'aucune règle ne signale : elle doit se lire sans effort.
// ============================================================

export const formatEuros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const formatNombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

// « 2 jour » se lit mal : on accorde les deux unités de temps que Compyo
// écrit lui-même (voir calculerDevis). Les autres unités (m², u, forfait…)
// sont laissées telles que l'artisan les a écrites.
function uniteAccordee(quantite: number, unite: string): string {
  const u = unite.trim();
  return quantite > 1 && /^(jour|heure)$/i.test(u) ? `${u}s` : u;
}

type LigneAffichable = Pick<LigneDevisCalculee, "quantite" | "unite" | "prix_unitaire">;

/** « 18 m² × 22,00 € », ou « Forfait » pour un forfait unique (son prix est
 *  alors le montant de la ligne, inutile de le répéter). */
export function detailLigne(ligne: LigneAffichable): string {
  if (ligne.quantite === 1 && /^forfait$/i.test(ligne.unite.trim())) return "Forfait";
  const quantite = [formatNombre(ligne.quantite), uniteAccordee(ligne.quantite, ligne.unite)].filter(Boolean).join(" ");
  return `${quantite} × ${formatEuros(ligne.prix_unitaire)}`;
}

/** « Prix par m² », « Prix par heure » ; un forfait n'a qu'un prix. */
export function libellePrix(unite: string): string {
  const u = unite.trim();
  return !u || /^forfait$/i.test(u) ? "Prix" : `Prix par ${u}`;
}

/** Texte saisi au clavier (virgule ou point, espaces) vers un nombre ; null
 *  quand ce n'est pas encore un nombre. Vide = 0, comme dans l'éditeur. */
export function nombreSaisi(texte: string): number | null {
  const propre = texte.replace(/\s/g, "").replace(",", ".");
  if (propre === "") return 0;
  const n = Number(propre);
  return Number.isFinite(n) ? n : null;
}

/** Un nombre tel qu'on le remet dans un champ : pas de zéros inutiles, la
 *  virgule française. */
export function texteDepuisNombre(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}
