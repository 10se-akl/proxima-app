// ============================================================
// Ce que montre la cloche (04/11/2026, règle d'Axel) :
//   - un CHIFFRE pour ce qui attend une réponse de l'artisan : un rappel
//     qu'il a lui-même demandé et dont l'heure est passée, et chaque
//     message de Compyo pas encore lu (nouveauté, offre, message) ;
//   - sinon, un simple POINT ROUGE s'il a des chantiers à faire
//     aujourd'hui (il les connaît, on le lui rappelle sans compter) ;
//   - sinon, rien.
// ============================================================

export type BadgeCloche = { genre: "chiffre"; valeur: number; texte: string } | { genre: "point" } | null;

export function badgeCloche({
  rappelsDus,
  messagesNonLus,
  chantiersDuJour,
}: {
  rappelsDus: number;
  messagesNonLus: number;
  chantiersDuJour: number;
}): BadgeCloche {
  const n = Math.max(0, rappelsDus) + Math.max(0, messagesNonLus);
  if (n > 0) return { genre: "chiffre", valeur: n, texte: n > 9 ? "9+" : String(n) };
  if (chantiersDuJour > 0) return { genre: "point" };
  return null;
}

/** Pour les lecteurs d'écran : ce que dit le badge, en mots. */
export function libelleCloche(badge: BadgeCloche): string {
  if (!badge) return "Notifications";
  if (badge.genre === "point") return "Notifications : des chantiers aujourd’hui";
  return `Notifications : ${badge.valeur} en attente`;
}
