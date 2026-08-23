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