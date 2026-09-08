// Petit set d'icônes ligne, dessinées à la main en SVG — pas de
// bibliothèque externe (lucide-react, heroicons...) : le registre npm
// n'est pas accessible dans cet environnement de développement (déjà
// rencontré avec Framer Motion). Style volontairement minimal (traits
// fins, coins arrondis) pour rester cohérent avec l'identité de la
// marque plutôt que d'importer un style d'icônes générique.
type Props = { className?: string; taille?: number };

const base = (taille: number) => ({
  width: taille,
  height: taille,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IconeAccueil({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconeDossier({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M3 6.5a1 1 0 0 1 1-1h4.5l2 2H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5Z" />
    </svg>
  );
}

export function IconeDocument({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 13h6M9 16.5h6" />
    </svg>
  );
}

// Module 28 (06/09) — distincte de IconeDocument (le devis) : un signe
// euro plutôt qu'une feuille, pour que "Factures" se reconnaisse au
// premier coup d'œil dans la navigation sans lire le libellé.
export function IconeFacture({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M16.5 6.3C15.2 5 13.5 4.3 11.8 4.8c-2.5.7-4.3 3.4-4.3 7.2s1.8 6.5 4.3 7.2c1.7.5 3.4-.2 4.7-1.5" />
      <path d="M5.5 10.5h7.5M5.5 13.5h6.5" />
    </svg>
  );
}

// Bilan mensuel (08/09) — barres croissantes plutôt qu'un signe euro
// (déjà pris par IconeFacture) : distinct au premier coup d'œil dans la
// navigation.
export function IconeBilan({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M5 20V13M12 20V7M19 20v-9" />
      <path d="M3.5 20.5h17" />
    </svg>
  );
}

// Équipe (08/09) — deux silhouettes superposées, lecture immédiate dans la
// navigation.
export function IconeEquipe({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3" />
      <path d="M15.5 5.3a3.2 3.2 0 0 1 0 5.6" />
      <path d="M15 14.4c2.6.4 4.5 2.5 4.5 5.1" />
    </svg>
  );
}

export function IconeCalendrier({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

export function IconeParametres({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.6a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.56 1.04h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function IconeCoeur({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M12 20.5s-7.5-4.6-9.8-9C.5 8 2 4.5 5.5 4a5 5 0 0 1 6.5 2 5 5 0 0 1 6.5-2c3.5.5 5 4 3.3 7.5-2.3 4.4-9.8 9-9.8 9Z" />
    </svg>
  );
}

export function IconeNote({ className, taille = 18 }: Props) {
  // Feuille avec lignes de texte + coin plié : évite la confusion visuelle
  // avec IconeDocument (utilisée pour les devis) tout en restant dans le
  // même style ligne fine — un pense-bête, pas un document officiel.
  return (
    <svg {...base(taille)} className={className}>
      <path d="M6.5 3.5h8l4 4V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14.5 3.5V8h4" />
      <path d="M9 12h6M9 15.5h4" />
    </svg>
  );
}

export function IconeCloche({ className, taille = 18 }: Props) {
  return (
    <svg {...base(taille)} className={className}>
      <path d="M18 16H6l1.4-2.1a4 4 0 0 0 .6-2.2V9a4 4 0 0 1 8 0v2.7c0 .8.2 1.5.6 2.2L18 16Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IconeRetours({ className, taille = 18 }: Props) {
  // Bulle de dialogue avec point d'exclamation : "signaler / donner son avis".
  return (
    <svg {...base(taille)} className={className}>
      <path d="M4 5.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-4.2 3.3a.5.5 0 0 1-.8-.4V17h-.5A1.5 1.5 0 0 1 2 15.5v-10a1.5 1.5 0 0 1 1.5-1.5H4Z" />
      <path d="M12 8v4.2" />
      <circle cx="12" cy="14.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}