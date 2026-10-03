import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// Refonte (03/10) — règles 5, 6 et 15 de docs/langage-interface.md :
// l'action principale est en encre (anthracite en clair, clair en sombre),
// plus en terracotta : le blanc sur terracotta n'atteint que 3,7:1, illisible
// au soleil, et deux couleurs de « primaire » se côtoyaient. Le terracotta
// plein reste au « + » de la barre du bas. Une action destructrice n'est
// jamais pleine : contour d'alerte. Pas de zoom au survol (sans effet sous
// le doigt) : l'appui fonce la couleur.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper active:bg-ink/80 sm:hover:bg-ink/90",
  secondary: "bg-ink text-paper active:bg-ink/80 sm:hover:bg-ink/90",
  ghost: "bg-transparent text-ink ring-1 ring-inset ring-ink/60 active:bg-ink/10 sm:hover:bg-ink/5",
  // Audit Cycle 2 (Agent UX Senior) : aucune variante ne distinguait
  // visuellement une action destructrice/négative (refuser un devis,
  // retirer un employé) d'une action neutre — les deux utilisaient le même
  // "ghost", risque réel de clic accidentel en plein soleil sur chantier.
  // Fond plein (pas juste une bordure colorée) pour que ce soit visible
  // même avec un contraste dégradé en extérieur.
  danger:
    "bg-transparent text-signal-fonce ring-1 ring-inset ring-signal-fonce/50 active:bg-signal-fonce/10 dark:text-signal-clair dark:ring-signal-clair/50",
};

// rounded-xl + léger scale/ombre au survol, cohérent avec le reste de
// l'app repolie (voir Card.tsx) et avec la landing page — avant ça, tous
// les boutons de l'app avaient des coins droits et aucune interaction au
// survol, contrairement au site vitrine (relevé directement par
// l'artisan qui teste l'app). focus-visible ajouté pour l'accessibilité
// clavier, absent auparavant.
// Sprint Beta Final (27/08) — 🔴I : les actions IA de la fiche projet
// (analyse, devis, réponse) ne changeaient QUE le texte du bouton pendant
// l'appel ("Analyse…") sans aucun indice visuel — un artisan sur un
// réseau de chantier lent pouvait cliquer une seconde fois en pensant que
// rien ne s'était passé. `loading` ajoute un spinner cohérent partout où
// le bouton est utilisé, désactive automatiquement le bouton (plus besoin
// de dupliquer `disabled={chargement}` en plus de `loading={chargement}`
// dans les appelants), et reste optionnel — les boutons existants sans ce
// prop ne changent pas de comportement.
export function Button({
  variant = "primary",
  className = "",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 shrink-0 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
