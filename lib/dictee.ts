// Web Speech API : pas de type officiel dans lib.dom pour tous les
// navigateurs, on le déclare nous-mêmes au minimum nécessaire. Utilisé par
// tous les endroits de l'app qui proposent de dicter plutôt que taper
// (notes vocales, création rapide de projet) — un seul endroit à ajuster
// si le comportement doit changer.
export type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

export function obtenirClasseReconnaissance(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Le texte dicté, à partir de tous les résultats reçus.
 *
 * 27/09 (remonté par Axel) — Sur Android, Chrome renvoie en mode continu
 * des résultats CUMULÉS : chaque résultat reprend tout ce qui a été dit
 * depuis le début (« je », « je veux », « je veux refaire »…). Les mettre
 * bout à bout donnait « je veux je veux je veux… » en boucle. Ici, un
 * résultat qui reprend le précédent le remplace ; sinon il s'ajoute
 * (ordinateur, iPhone : chaque résultat est un nouveau morceau).
 */
export function assemblerTranscription(resultats: ArrayLike<ArrayLike<{ transcript: string }>>): string {
  const cle = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const morceaux: string[] = [];
  for (let i = 0; i < resultats.length; i++) {
    const texte = resultats[i]?.[0]?.transcript?.trim();
    if (!texte) continue;
    const precedent = morceaux[morceaux.length - 1];
    if (precedent !== undefined) {
      const avant = cle(precedent);
      const maintenant = cle(texte);
      if (maintenant.startsWith(avant)) {
        morceaux[morceaux.length - 1] = texte;
        continue;
      }
      if (avant.startsWith(maintenant)) continue;
    }
    morceaux.push(texte);
  }
  return morceaux.join(" ");
}

/** Un titre court tiré d'un texte dicté : la première phrase, coupée
 *  proprement entre deux mots si elle est trop longue. */
export function titreDepuisTexte(texte: string, max = 60): string {
  const phrase = texte.trim().match(/^[^.!?]*/)?.[0]?.trim() || texte.trim();
  if (phrase.length <= max) return phrase;
  const coupe = phrase.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${(dernierEspace > 20 ? coupe.slice(0, dernierEspace) : coupe).trim()}…`;
}

// La dictée navigateur (surtout sur iPhone/Safari) est parfois capricieuse :
// permission refusée, coupure réseau, silence trop long... Toujours proposer
// une issue plutôt qu'un échec silencieux.
export function messageErreurDictee(code?: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Le micro n'est pas autorisé. Vérifiez les réglages de votre navigateur, ou écrivez directement.";
    case "no-speech":
      return "Rien n'a été entendu. Réessayez, ou écrivez directement.";
    case "network":
      return "Connexion trop faible pour la dictée. Écrivez directement.";
    default:
      return "La dictée a été interrompue. Réessayez, ou écrivez directement.";
  }
}
