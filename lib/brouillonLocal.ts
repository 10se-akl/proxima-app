// ============================================================
// Brouillons locaux (26/09 — « moins mais mieux », lot H.2 : rien ne se
// perd, jamais).
//
// Une saisie longue est gardée sur le téléphone tant qu'elle n'est pas
// enregistrée : un rechargement, une coupure réseau au moment
// d'enregistrer ou un départ par la barre du bas ne la font plus perdre.
// Elle est effacée après un enregistrement réussi.
//
// `base` est l'empreinte de ce qui était enregistré quand la saisie a
// commencé : si l'enregistrement a changé depuis (un collègue, un autre
// appareil, une nouvelle version), le brouillon est jeté plutôt que de
// remettre par-dessus des valeurs périmées.
//
// Même principe que les brouillons déjà en place (FormulaireNote,
// NotesVocales, nouvelle demande), mis en commun. Toujours dans un
// try/catch : navigation privée ou stockage plein = filet absent, jamais
// une erreur.
// ============================================================

const DUREE_MAX_MS = 14 * 86400000;

type Enveloppe<T> = { base: string; le: number; valeur: T };

/** Empreinte courte d'une valeur (djb2 sur son JSON). */
export function empreinte(valeur: unknown): string {
  const texte = JSON.stringify(valeur) ?? "";
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export function lireBrouillon<T>(cle: string, base: string): T | null {
  try {
    const brut = window.localStorage.getItem(cle);
    if (!brut) return null;
    const e = JSON.parse(brut) as Enveloppe<T>;
    if (e.base !== base || Date.now() - e.le > DUREE_MAX_MS) {
      window.localStorage.removeItem(cle);
      return null;
    }
    return e.valeur;
  } catch {
    return null;
  }
}

export function ecrireBrouillon<T>(cle: string, base: string, valeur: T) {
  try {
    const e: Enveloppe<T> = { base, le: Date.now(), valeur };
    window.localStorage.setItem(cle, JSON.stringify(e));
  } catch {
    // Stockage indisponible : filet de sécurité simplement absent.
  }
}

export function effacerBrouillon(cle: string) {
  try {
    window.localStorage.removeItem(cle);
  } catch {
    // Idem.
  }
}
