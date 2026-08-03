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
