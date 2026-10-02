// ============================================================
// Retours tactiles (refonte 02/10 — règle 15 de docs/langage-interface.md).
//
// Une vibration brève quand un geste aboutit (« Fait », « Oui »,
// « Déplacer »), deux brèves quand il échoue. Aucun son, aucun réglage.
// navigator.vibrate n'existe que sur Android : sur iPhone et sur
// ordinateur, ces fonctions ne font rien, et rien ne doit en dépendre.
// ============================================================

function vibration(motif: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(motif);
  } catch {
    // Certains navigateurs refusent la vibration hors geste : sans conséquence.
  }
}

/** Un geste a abouti. */
export function vibrer() {
  vibration(12);
}

/** Un geste a échoué (l'écriture n'a pas été enregistrée). */
export function vibrerEchec() {
  vibration([12, 60, 12]);
}
