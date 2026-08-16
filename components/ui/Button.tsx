import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-signal text-white hover:bg-signal-fonce",
  secondary: "bg-ink text-paper hover:bg-signal-fonce",
  ghost: "bg-transparent text-ink hover:bg-ink/5 border border-ink/15",
};

// rounded-xl + léger scale/ombre au survol, cohérent avec le reste de
// l'app repolie (voir Card.tsx) et avec la landing page — avant ça, tous
// les boutons de l'app avaient des coins droits et aucune interaction au
// survol, contrairement au site vitrine (relevé directement par
// l'artisan qui teste l'app). focus-visible ajouté pour l'accessibilité
// clavier, absent auparavant.
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
