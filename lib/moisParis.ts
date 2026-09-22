// ============================================================
// Les mois, à l'heure de Paris (21/09).
//
// Le serveur (Vercel) tourne en UTC. `new Date(2026, 8, 1)` y vaut donc
// minuit UTC, soit 2 h du matin à Paris l'été : un devis accepté le 1er
// septembre à 1 h du matin tombait dans le bilan d'août. Rien de grave
// isolément, mais un bilan qui ne colle pas à ce que l'artisan a vécu perd
// toute sa valeur — c'est exactement le chiffre qu'il vérifie de tête.
//
// Tout ce qui découpe l'activité en mois passe par ici : la page du bilan
// comme l'email mensuel.
// ============================================================

export type Mois = { annee: number; mois: number }; // mois : 0 = janvier

const FUSEAU = "Europe/Paris";

// Écart entre Paris et UTC à un instant donné, en minutes (+60 l'hiver,
// +120 l'été). Calculé par Intl plutôt que codé en dur : les dates de
// changement d'heure bougent d'une année à l'autre.
function decalageParis(instant: Date): number {
  const morceaux = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSEAU,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const v = Object.fromEntries(morceaux.map((m) => [m.type, m.value]));
  const commeUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute);
  return Math.round((commeUtc - instant.getTime()) / 60000);
}

/** Minuit à Paris, pour n'importe quel jour. Les débordements sont admis
 *  (jour 32 = le 1er du mois suivant), comme avec Date.UTC. */
export function minuitParis(annee: number, mois: number, jour: number): Date {
  const minuitUtc = Date.UTC(annee, mois, jour);
  return new Date(minuitUtc - decalageParis(new Date(minuitUtc)) * 60000);
}

/** L'instant exact où commence ce mois à Paris. */
export function debutMois({ annee, mois }: Mois): Date {
  return minuitParis(annee, mois, 1);
}

/** L'année en cours à Paris — celle des numéros de devis et de factures.
 *  `new Date().getFullYear()` sur le serveur (UTC) donnait encore l'année
 *  précédente le 1er janvier entre minuit et 1 h. */
export function anneeParis(maintenant = new Date()): number {
  return aujourdhuiParis(maintenant).annee;
}

export function decaler({ annee, mois }: Mois, n: number): Mois {
  const total = annee * 12 + mois + n;
  return { annee: Math.floor(total / 12), mois: ((total % 12) + 12) % 12 };
}

/** [début, fin[ du mois, à l'heure de Paris. */
export function bornes(m: Mois): { debut: Date; fin: Date } {
  return { debut: debutMois(m), fin: debutMois(decaler(m, 1)) };
}

/** Date du jour à Paris : année, mois et jour du mois. */
export function aujourdhuiParis(maintenant = new Date()): Mois & { jour: number } {
  const v = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSEAU,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
      .formatToParts(maintenant)
      .map((m) => [m.type, m.value])
  );
  return { annee: +v.year, mois: +v.month - 1, jour: +v.day };
}

export function moisCourant(maintenant = new Date()): Mois {
  const { annee, mois } = aujourdhuiParis(maintenant);
  return { annee, mois };
}

export function memeMois(a: Mois, b: Mois): boolean {
  return a.annee === b.annee && a.mois === b.mois;
}

export function avant(a: Mois, b: Mois): boolean {
  return a.annee * 12 + a.mois < b.annee * 12 + b.mois;
}

/** "2026-09" — le format du paramètre d'adresse ?mois=. */
export function cle({ annee, mois }: Mois): string {
  return `${annee}-${String(mois + 1).padStart(2, "0")}`;
}

export function depuisCle(texte: string | undefined): Mois | null {
  if (!texte || !/^\d{4}-\d{2}$/.test(texte)) return null;
  const [annee, m] = texte.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return { annee, mois: m - 1 };
}

const NOMS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function nomMois({ mois }: Mois): string {
  return NOMS[mois];
}

export function libelle(m: Mois): string {
  return `${NOMS[m.mois]} ${m.annee}`;
}

/** "sept." — pour les axes de graphique, où la place manque. */
export function nomCourt({ mois }: Mois): string {
  return ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][mois];
}

/** Jour du mois (Paris) d'un instant ISO — pour "au 21 septembre". */
export function jourParis(iso: string): { annee: number; mois: number; jour: number } {
  return aujourdhuiParis(new Date(iso));
}

/** Nombre de jours calendaires, bornes incluses, entre deux instants —
 *  à l'heure de Paris. Du lundi au vendredi = 5 jours, comme on compte
 *  sur un chantier. */
export function joursCalendaires(debutIso: string, finIso: string): number {
  const d = jourParis(debutIso);
  const f = jourParis(finIso);
  const a = Date.UTC(d.annee, d.mois, d.jour);
  const b = Date.UTC(f.annee, f.mois, f.jour);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
