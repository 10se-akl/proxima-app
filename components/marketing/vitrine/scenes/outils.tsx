import type { CSSProperties, ReactNode } from "react";

/** Le moment où un élément entre en scène (en secondes après l'arrivée de
 *  la scène à l'écran), plus d'autres variables CSS au besoin. */
export function d(secondes: number, autres: Record<string, string> = {}): CSSProperties {
  return { "--d": `${secondes}s`, ...autres } as CSSProperties;
}

/** Les montants comme sur un devis français, écrits à la main plutôt
 *  qu'avec toLocaleString : Node et les navigateurs ne séparent pas les
 *  milliers avec le même caractère, ce qui casse l'hydratation. */
export function euros(n: number): string {
  const negatif = n < 0;
  const [entier, centimes] = Math.abs(n).toFixed(2).split(".");
  return `${negatif ? "−" : ""}${entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${centimes} €`;
}

/** Une carte « objet » de la vitrine : surface, ombre en couches, liseré. */
export function Carte({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-[1.4rem] bg-surface shadow-[var(--v-ombre)] ring-1 ring-ink/[0.06] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Etiquette({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.18em] text-steel ${className}`}>
      {children}
    </p>
  );
}

export function Coche({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
