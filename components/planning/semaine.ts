// ============================================================
// Les jours du planning, à l'heure de Paris (refonte 03/10, duel G).
//
// Le serveur (Vercel) tourne en UTC : `new Date().setHours(0, 0, 0, 0)` y
// donne minuit UTC, soit 2 h du matin à Paris l'été. Un « aujourd'hui »
// calculé là-bas se trompe de jour entre minuit et 2 h, et la fenêtre de
// sept jours du téléphone en hérite. Tout ce qui découpe le planning en
// jours passe donc par ici : la page (serveur) comme l'affichage (client).
//
// Un jour est une clé « AAAA-MM-JJ » (celle que renvoie aussi la météo).
// Fichier sans aucune importation : il se vérifie avec `node --test`
// (voir semaine.test.mjs).
// ============================================================

export type CleJour = string;

const FUSEAU = "Europe/Paris";

const FORMAT_PARTIES = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSEAU,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function parties(instant: Date) {
  const v = Object.fromEntries(FORMAT_PARTIES.formatToParts(instant).map((m) => [m.type, m.value]));
  return { annee: +v.year, mois: +v.month, jour: +v.day, heure: +v.hour % 24, minute: +v.minute };
}

const deux = (n: number) => String(n).padStart(2, "0");

/** Écart entre Paris et UTC à un instant donné, en minutes (+60 l'hiver, +120 l'été). */
function decalageParis(instant: Date): number {
  const p = parties(instant);
  return Math.round((Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute) - instant.getTime()) / 60000);
}

// ---------------------------------------------------------------- les clés

/** Le jour, à Paris, d'un instant : « 2026-10-03 ». */
export function cleParis(instant: Date | string): CleJour {
  const p = parties(typeof instant === "string" ? new Date(instant) : instant);
  return `${p.annee}-${deux(p.mois)}-${deux(p.jour)}`;
}

export function aujourdhuiCle(maintenant: Date = new Date()): CleJour {
  return cleParis(maintenant);
}

function decouper(cle: CleJour) {
  const [annee, mois, jour] = cle.split("-").map(Number);
  return { annee, mois, jour };
}

/** Le jour d'après (ou d'avant, avec n < 0). Les débordements de mois sont admis. */
export function ajouterJours(cle: CleJour, n: number): CleJour {
  const { annee, mois, jour } = decouper(cle);
  const d = new Date(Date.UTC(annee, mois - 1, jour + n));
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

/** 0 = dimanche, 1 = lundi… 6 = samedi. */
export function jourSemaine(cle: CleJour): number {
  const { annee, mois, jour } = decouper(cle);
  return new Date(Date.UTC(annee, mois - 1, jour, 12)).getUTCDay();
}

/** L'instant exact d'une heure de Paris (« 08:30 ») un jour donné. Les
 *  jours de changement d'heure ont 23 ou 25 h : on corrige deux fois. */
export function instantParis(cle: CleJour, heureMinute: string = "00:00"): Date {
  const { annee, mois, jour } = decouper(cle);
  const [h, m] = heureMinute.split(":").map(Number);
  const commeUtc = Date.UTC(annee, mois - 1, jour, h, m || 0);
  const premier = commeUtc - decalageParis(new Date(commeUtc)) * 60000;
  return new Date(commeUtc - decalageParis(new Date(premier)) * 60000);
}

// ---------------------------------------------------------------- les heures

/** « 08:30 », l'heure de Paris d'un instant, au format d'un champ time. */
export function heureChamp(instant: Date | string): string {
  const p = parties(typeof instant === "string" ? new Date(instant) : instant);
  return `${deux(p.heure)}:${deux(p.minute)}`;
}

/** « 8h30 », « 14h00 » : l'heure de Paris, comme on la dit. */
export function heureEnLettres(instant: Date | string): string {
  const p = parties(typeof instant === "string" ? new Date(instant) : instant);
  return `${p.heure}h${deux(p.minute)}`;
}

/** « 1 h », « 1 h 30 », « 45 min ». */
export function dureeEnLettres(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${deux(m)}` : `${h} h`;
}

// ---------------------------------------------------------------- les mots

const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export const jourCourt = (cle: CleJour) => JOURS_COURTS[jourSemaine(cle)];
export const jourLong = (cle: CleJour) => JOURS_LONGS[jourSemaine(cle)];
export const numeroDuJour = (cle: CleJour) => decouper(cle).jour;
export const nomDuMois = (cle: CleJour) => MOIS[decouper(cle).mois - 1];

/** « vendredi 4 octobre ». */
export function jourEnLettres(cle: CleJour): string {
  return `${jourLong(cle)} ${numeroDuJour(cle)} ${nomDuMois(cle)}`;
}

/** « Aujourd'hui », « Demain », sinon « Sam. 3 ». */
export function libelleChoix(cle: CleJour, aujourdhui: CleJour): string {
  if (cle === aujourdhui) return "Aujourd'hui";
  if (cle === ajouterJours(aujourdhui, 1)) return "Demain";
  const c = jourCourt(cle);
  return `${c[0].toUpperCase()}${c.slice(1)} ${numeroDuJour(cle)}`;
}

/** « aujourd'hui », « demain », « lundi 5 » (dans la semaine), sinon « lundi 5 octobre ».
 *  Pour finir une phrase : « Déplacer à demain », « Planifié : Dupont, demain ». */
export function quandEnLettres(cle: CleJour, aujourdhui: CleJour): string {
  if (cle === aujourdhui) return "aujourd'hui";
  if (cle === ajouterJours(aujourdhui, 1)) return "demain";
  const proche = cle > aujourdhui && cle <= ajouterJours(aujourdhui, 6);
  return proche ? `${jourLong(cle)} ${numeroDuJour(cle)}` : jourEnLettres(cle);
}

/** « 5 – 11 octobre », ou « 28 septembre – 4 octobre » à cheval sur deux mois. */
export function libelleFenetre(premier: CleJour, dernier: CleJour): string {
  return nomDuMois(premier) === nomDuMois(dernier)
    ? `${numeroDuJour(premier)} – ${numeroDuJour(dernier)} ${nomDuMois(dernier)}`
    : `${numeroDuJour(premier)} ${nomDuMois(premier)} – ${numeroDuJour(dernier)} ${nomDuMois(dernier)}`;
}

// ---------------------------------------------------------------- les fenêtres

export type Fenetre = {
  /** Sept jours de suite. */
  jours: CleJour[];
  /** Minuit à Paris du premier jour (inclus). */
  debut: Date;
  /** Minuit à Paris du jour d'après le dernier (exclu). */
  fin: Date;
};

function fenetreDepuis(premier: CleJour): Fenetre {
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(premier, i));
  return { jours, debut: instantParis(premier), fin: instantParis(ajouterJours(premier, 7)) };
}

/** Téléphone : sept jours glissants à partir d'aujourd'hui, puis de sept en
 *  sept avec `offset` (0, 1, -1…). */
export function fenetreGlissante(maintenant: Date, offset: number): Fenetre {
  return fenetreDepuis(ajouterJours(aujourdhuiCle(maintenant), offset * 7));
}

/** Ordinateur : du lundi au dimanche, la semaine d'aujourd'hui décalée de `offset` semaines. */
export function fenetreSemaine(maintenant: Date, offset: number): Fenetre {
  const aujourdhui = aujourdhuiCle(maintenant);
  const dow = jourSemaine(aujourdhui);
  const versLundi = dow === 0 ? -6 : 1 - dow;
  return fenetreDepuis(ajouterJours(aujourdhui, versLundi + offset * 7));
}

// ---------------------------------------------------------------- les groupes

export type GroupeJour<E> = {
  /** Un jour, ou deux (un samedi et un dimanche vides, fondus en une ligne). */
  cles: CleJour[];
  evenements: E[];
};

/** Les événements regroupés par jour, dans l'ordre des heures. Un samedi et
 *  un dimanche qui se suivent, tous deux vides, ne font qu'un groupe. */
export function grouperParJour<E extends { date_heure: string }>(jours: CleJour[], evenements: E[]): GroupeJour<E>[] {
  const parJour = new Map<CleJour, E[]>(jours.map((c) => [c, []]));
  for (const e of evenements) parJour.get(cleParis(e.date_heure))?.push(e);
  for (const liste of parJour.values()) liste.sort((a, b) => Date.parse(a.date_heure) - Date.parse(b.date_heure));

  const groupes: GroupeJour<E>[] = [];
  for (let i = 0; i < jours.length; i++) {
    const cle = jours[i];
    const liste = parJour.get(cle) ?? [];
    const suivant = jours[i + 1];
    if (
      liste.length === 0 &&
      jourSemaine(cle) === 6 &&
      suivant !== undefined &&
      jourSemaine(suivant) === 0 &&
      (parJour.get(suivant) ?? []).length === 0
    ) {
      groupes.push({ cles: [cle, suivant], evenements: [] });
      i++;
      continue;
    }
    groupes.push({ cles: [cle], evenements: liste });
  }
  return groupes;
}

// ---------------------------------------------------------------- le « quoi »

function echapper(texte: string) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Le « quoi » d'un rendez-vous, sans répéter le nom du client que la ligne
 *  porte déjà : « Chantier Dupont · Cloisons » devient « Chantier · Cloisons ».
 *  Si rien ne reste, le titre entier. */
export function quoiDuRendezVous(titre: string, nomClient?: string | null): string {
  const nom = (nomClient ?? "").trim();
  if (!nom) return titre.trim();
  const sans = titre
    .replace(new RegExp(echapper(nom), "gi"), " ")
    // « Visite chez Dupont » : il ne reste pas « Visite chez ».
    .replace(/\s+(?:chez|pour|de|du|d')(?=\s*(?:[·\-–—:,]|$))/gi, "")
    // Les séparateurs restés au bout ou en double.
    .replace(/\s*[·\-–—:,]\s*(?=[·\-–—:,]|$)/g, "")
    .replace(/^[\s·\-–—:,]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return sans || titre.trim();
}

// ---------------------------------------------------------------- le « déjà pris »

export type Occupation = { id: string; date_heure: string; duree_minutes: number | null };

/** Le rendez-vous qui gêne un créneau, s'il y en a un. Même règle que le
 *  contrôle du formulaire : un rendez-vous sans durée compte pour 1 h. Ce
 *  n'est qu'un avertissement avant de choisir : la base reste seule juge
 *  (contrainte de non-chevauchement). */
export function occupationEnConflit<O extends Occupation>(
  debut: Date,
  dureeMinutes: number,
  existants: O[],
  ignorer?: string
): O | undefined {
  const fin = debut.getTime() + dureeMinutes * 60000;
  return existants.find((o) => {
    if (o.id === ignorer) return false;
    const d = Date.parse(o.date_heure);
    return debut.getTime() < d + (o.duree_minutes ?? 60) * 60000 && fin > d;
  });
}

// ---------------------------------------------------------------- les valeurs par défaut

export type DernierRendezVous = { date_heure: string; duree_minutes: number | null };

export const HEURE_PAR_DEFAUT = "08:00";
export const DUREE_PAR_DEFAUT = 60;

/** Ce que « Planifier » propose avant que l'artisan ait touché à quoi que ce
 *  soit : demain, à l'heure et pour la durée du dernier rendez-vous du
 *  projet, sinon 8 h pour 1 h. */
export function creneauParDefaut(dernier: DernierRendezVous | null | undefined, maintenant: Date = new Date()) {
  return {
    jour: ajouterJours(aujourdhuiCle(maintenant), 1),
    heure: dernier ? heureChamp(dernier.date_heure) : HEURE_PAR_DEFAUT,
    duree: dernier?.duree_minutes && dernier.duree_minutes > 0 ? dernier.duree_minutes : DUREE_PAR_DEFAUT,
  };
}
