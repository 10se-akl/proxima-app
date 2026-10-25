// ============================================================
// L'heure, écrite d'une seule façon dans toute l'application (25/10).
//
// Avant : « 14h00 », « 9h00 », « 08:00 », « 13 h 00 », « 9 h » selon
// l'écran. Désormais : « 9 h », « 14 h 30 » (l'usage typographique
// français), en heure de Paris, avec des espaces fines insécables : l'heure
// ne se coupe jamais en fin de ligne.
// ============================================================

const FINE = " ";

const PARTIES = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** « 9 h », « 14 h 30 » à partir d'une heure et de minutes. */
export function heureEnMots(h: number, m: number): string {
  return m === 0 ? `${h}${FINE}h` : `${h}${FINE}h${FINE}${String(m).padStart(2, "0")}`;
}

/** « 9 h », « 14 h 30 » : l'heure de Paris d'un instant. */
export function heure(instant: Date | string | number): string {
  const d = instant instanceof Date ? instant : new Date(instant);
  // Une date invalide (saisie incomplète) ne fait jamais planter l'écran.
  if (Number.isNaN(d.getTime())) return "";
  let h = 0;
  let m = 0;
  for (const p of PARTIES.formatToParts(d)) {
    if (p.type === "hour") h = Number(p.value) % 24;
    if (p.type === "minute") m = Number(p.value);
  }
  return heureEnMots(h, m);
}

/** « lun. 3 nov. à 14 h 30 » : une date (format libre, sans heure) suivie
 *  de l'heure. Le format de date doit être en Europe/Paris. */
export function dateEtHeure(instant: Date | string | number, formatDate: Intl.DateTimeFormat): string {
  const d = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDate.format(d)} à ${heure(d)}`;
}

/** « 14 h » à partir d'un texte « 14:00 » (heure lue par l'IA) ; le texte
 *  tel quel s'il n'a pas cette forme. */
export function heureLue(texte: string): string {
  const m = /^(\d{1,2})[:h](\d{2})?$/.exec(texte.trim());
  return m ? heureEnMots(Number(m[1]), Number(m[2] ?? 0)) : texte;
}
