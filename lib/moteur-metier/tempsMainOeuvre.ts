import type { LigneDevisCalculee, ParametresEntreprise } from "@/types";

// ============================================================
// Le temps de main-d'œuvre, compté d'une seule façon (21/09).
//
// Question d'Axel : « si l'IA dit une demi-journée alors que c'est 3 jours
// et que l'artisan corrige, les prix suivent ? Et une journée, c'est bien
// 8 h, pas 24 ? » Trois endroits comptaient le temps chacun à sa manière
// — le moteur de chiffrage, l'éditeur de lignes, le score du devis — et
// deux pièges en sortaient :
//
//   1. l'unité d'une ligne était un simple texte : passer « heure » en
//      « jour » gardait le prix HORAIRE. 3 jours × 45 € = 135 € au lieu
//      de 3 × 360 € ;
//   2. la ligne « Ajustement heures minimum facturables » n'était calculée
//      qu'à la génération : si l'artisan montait ensuite ses heures au-delà
//      du minimum, le complément restait, et le client le payait en trop.
//
// Tout passe maintenant par ce fichier. Une journée = 8 heures de travail,
// partout (c'est le temps de travail, pas une durée de 24 h).
// ============================================================

export const HEURES_PAR_JOURNEE = 8;
export const LIBELLE_AJUSTEMENT_MINIMUM = "Ajustement heures minimum facturables";

type Tarifs = Pick<ParametresEntreprise, "cout_horaire" | "cout_journalier" | "heures_min_facturables">;

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

export function estUniteDemiJournee(unite: string | null | undefined): boolean {
  return /demi/i.test(unite ?? "");
}

export function estUniteJour(unite: string | null | undefined): boolean {
  const u = (unite ?? "").trim().toLowerCase();
  if (estUniteDemiJournee(u)) return false;
  return /^(j|jr|jrs)\.?$/.test(u) || /jour|journ/.test(u);
}

export function estUniteHeure(unite: string | null | undefined): boolean {
  const u = (unite ?? "").trim().toLowerCase();
  return /^(h|hr|hrs)\.?$/.test(u) || /heure/.test(u);
}

/** Heures de travail que représente une quantité, selon son unité. Une
 *  unité inconnue (forfait…) est prise pour des heures : c'est ce que le
 *  moteur a toujours fait, et ce que demande la consigne donnée à l'IA. */
export function heuresDepuisQuantite(quantite: number, unite: string | null | undefined): number {
  if (estUniteDemiJournee(unite)) return quantite * (HEURES_PAR_JOURNEE / 2);
  if (estUniteJour(unite)) return quantite * HEURES_PAR_JOURNEE;
  return quantite;
}

/** Temps d'un poste proposé par l'IA, en heures. La consigne lui demande
 *  toujours des heures (temps_estime_heures) ; si elle l'oublie et donne
 *  « 3 » avec l'unité « jour », c'est 24 h — pas 3 h, comme on le
 *  comptait jusqu'ici. */
export function heuresDuPoste(poste: {
  quantite: number;
  unite: string;
  temps_estime_heures?: number;
}): number {
  if (typeof poste.temps_estime_heures === "number" && poste.temps_estime_heures > 0) {
    return poste.temps_estime_heures;
  }
  return heuresDepuisQuantite(poste.quantite, poste.unite);
}

// Types volontairement larges : ces fonctions servent aussi aux lignes de
// VENTE (marge répartie, catégorie « déplacement » en plus) que lit le
// score du devis.
type LigneTemps = { categorie: string; quantite: number; unite: string; description: string };

/** Heures d'une ligne de main-d'œuvre déjà chiffrée. */
export function heuresDeLigne(ligne: Pick<LigneTemps, "quantite" | "unite">): number {
  return heuresDepuisQuantite(ligne.quantite, ligne.unite);
}

/** Tarif d'une journée : celui que l'artisan a configuré, sinon 8 fois son
 *  tarif horaire. */
export function tarifJournee(tarifs: Pick<Tarifs, "cout_horaire" | "cout_journalier">): number {
  return tarifs.cout_journalier && tarifs.cout_journalier > 0
    ? tarifs.cout_journalier
    : arrondi2(tarifs.cout_horaire * HEURES_PAR_JOURNEE);
}

/** Passe une ligne de main-d'œuvre en heures ou en jours. Le TEMPS est
 *  conservé (4 h deviennent 0,5 jour) et le prix unitaire devient le bon
 *  tarif : l'artisan n'a plus qu'à corriger la quantité. */
export function convertirLigneMainOeuvre<T extends LigneDevisCalculee>(
  ligne: T,
  vers: "heure" | "jour",
  tarifs: Pick<Tarifs, "cout_horaire" | "cout_journalier">
): T {
  // Depuis une unité qui n'est pas un temps (« forfait »), on ne devine
  // pas combien d'heures elle représentait : 1 heure ou 1 jour, et
  // l'artisan ajuste la quantité.
  const depuisUnTemps = estUniteHeure(ligne.unite) || estUniteJour(ligne.unite) || estUniteDemiJournee(ligne.unite);
  const heures = depuisUnTemps ? heuresDeLigne(ligne) : vers === "jour" ? HEURES_PAR_JOURNEE : 1;
  const quantite = vers === "jour" ? arrondi2(heures / HEURES_PAR_JOURNEE) : arrondi2(heures);
  const prix = vers === "jour" ? tarifJournee(tarifs) : tarifs.cout_horaire;
  return {
    ...ligne,
    unite: vers,
    quantite,
    prix_unitaire: prix,
    total: arrondi2(quantite * prix),
    detail_calcul:
      vers === "jour"
        ? `${quantite} jour${quantite > 1 ? "s" : ""} × ${prix}€/jour (passé en jours par l'artisan)`
        : `${quantite}h × ${prix}€/h (passé en heures par l'artisan)`,
  };
}

export function estLigneAjustementMinimum(ligne: Pick<LigneTemps, "description" | "categorie">): boolean {
  return ligne.categorie === "main_oeuvre" && ligne.description.trim() === LIBELLE_AJUSTEMENT_MINIMUM;
}

/** Tient à jour la ligne « heures minimum » déjà présente : elle suit les
 *  heures réelles, et disparaît dès que le minimum est atteint. N'en
 *  ajoute jamais une : si l'artisan l'a supprimée, c'est sa décision. Si
 *  l'artisan l'a renommée, elle n'est plus reconnue et reste telle quelle. */
export function reajusterMinimum<T extends LigneDevisCalculee>(lignes: T[], heuresMin: number): T[] {
  const ajustements = lignes.filter(estLigneAjustementMinimum);
  if (ajustements.length === 0) return lignes;

  const heures = lignes
    .filter((l) => l.categorie === "main_oeuvre" && !estLigneAjustementMinimum(l))
    .filter((l) => estUniteHeure(l.unite) || estUniteJour(l.unite) || estUniteDemiJournee(l.unite))
    .reduce((s, l) => s + heuresDeLigne(l), 0);

  const manque = arrondi2(Math.max(0, heuresMin - heures));
  // Même règle que le moteur : pas de complément sans aucune heure de
  // travail, ni quand le minimum est atteint.
  if (heures === 0 || manque === 0) {
    return lignes.filter((l) => !estLigneAjustementMinimum(l));
  }

  let dejaVu = false;
  return lignes.flatMap((l) => {
    if (!estLigneAjustementMinimum(l)) return [l];
    if (dejaVu) return []; // un seul complément, jamais deux
    dejaVu = true;
    if (l.quantite === manque) return [l];
    return [{ ...l, quantite: manque, total: arrondi2(manque * l.prix_unitaire) }];
  });
}

/** Jours de travail que représentent les lignes de main-d'œuvre (les
 *  forfaits, dont on ne connaît pas le temps, ne comptent pas). */
export function joursDeMainOeuvre(lignes: LigneTemps[]): number {
  const heures = lignes
    .filter((l) => l.categorie === "main_oeuvre")
    .filter((l) => estUniteHeure(l.unite) || estUniteJour(l.unite) || estUniteDemiJournee(l.unite))
    .reduce((s, l) => s + heuresDeLigne(l), 0);
  return heures / HEURES_PAR_JOURNEE;
}

const NOMBRES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
};

/** Lit une durée écrite à la main (« ½ journée », « 3 jours », « 2 à 3
 *  semaines », « 4h ») et la renvoie en jours de travail. null si le texte
 *  ne se lit pas : on ne devine jamais. Pour une fourchette, la borne
 *  haute — c'est la plus prudente pour comparer. */
export function joursDepuisTexte(texte: string | null | undefined): number | null {
  if (!texte) return null;
  let t = texte.toLowerCase().replace(/½/g, "0.5").replace(/,/g, ".");
  t = t.replace(/\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/g, (m) => String(NOMBRES[m]));

  if (/demi[- ]?journ/.test(t) && !/\d+(\.\d+)?\s*demi/.test(t)) return 0.5;

  const nombre = "(\\d+(?:\\.\\d+)?)(?:\\s*(?:à|a|-|–)\\s*(\\d+(?:\\.\\d+)?))?";
  const lire = (m: RegExpMatchArray) => Number(m[2] ?? m[1]);

  const demi = t.match(new RegExp(`${nombre}\\s*demi[- ]?journ`));
  if (demi) return lire(demi) * 0.5;
  const semaines = t.match(new RegExp(`${nombre}\\s*(semaines?|sem\\b)`));
  if (semaines) return lire(semaines) * 5; // semaine de travail
  const jours = t.match(new RegExp(`${nombre}\\s*(jours?|journées?|j\\b)`));
  if (jours) return lire(jours);
  const heures = t.match(new RegExp(`${nombre}\\s*(heures?|h\\b)`));
  if (heures) return lire(heures) / HEURES_PAR_JOURNEE;
  return null;
}
