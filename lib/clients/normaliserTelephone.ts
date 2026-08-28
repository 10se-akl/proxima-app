// ============================================================
// Sprint Beta Final (27/08) — normalisation centralisée du téléphone,
// appliquée à CHAQUE écriture (brouillonProjet.ts, creer-depuis-brouillon,
// analyser-captures, création manuelle). Sans ça, "+33 6 12 34 56 78" vs
// "06 12 34 56 78" vs "06.12.34.56.78" vs "(06) 12 34 56 78" ne
// matcheraient jamais en égalité stricte alors qu'ils désignent le même
// numéro — c'est le vrai obstacle au matching client (point 2 du brief),
// identifié à l'audit, pas un détail cosmétique.
//
// Approche : garder les 9 derniers chiffres significatifs après avoir
// supprimé tout ce qui n'est pas un chiffre. Un numéro français fixe/
// mobile a 10 chiffres (0X XX XX XX XX) ; en retirant le premier zéro on
// obtient 9 chiffres, qui restent identiques qu'on parte de "0X..." ou de
// "+33X...". Choix volontairement simple (pas de vraie librairie
// libphonenumber) : suffisant pour un usage France/DOM à ce stade, jamais
// utilisé comme identifiant de sécurité, seulement comme clé de
// rapprochement best-effort — un faux négatif (deux numéros valides mais
// mal reconnus comme différents) est sans risque, un faux positif l'est
// davantage (voir lib/clients/index.ts, seuil de confiance strict).
// ============================================================

export function normaliserTelephone(brut: string | null | undefined): string | null {
  if (!brut) return null;
  const chiffres = brut.replace(/\D/g, "");
  if (chiffres.length < 9) return null; // trop court pour être un vrai numéro
  return chiffres.slice(-9);
}
