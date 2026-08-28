// ============================================================
// Sprint Beta Final (27/08) — étape "Regex" de la règle d'architecture
// SQL → Regex → Règles → IA posée pour ce sprint (point 9 du brief) :
// extraire un numéro de téléphone français d'un texte brut AVANT tout
// appel IA. Une regex ne peut jamais halluciner un numéro — elle le
// trouve ou ne le trouve pas — contrairement à un LLM qui pourrait
// "compléter" un numéro partiel. Utilisé par app/api/partage/matcher/
// route.ts (point 2 du brief : chercher un client existant avant l'IA).
// ============================================================

const REGEX_TELEPHONE_FR = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;

export function extraireTelephone(texte: string): string | null {
  const trouve = texte.match(REGEX_TELEPHONE_FR);
  return trouve ? trouve[0] : null;
}
