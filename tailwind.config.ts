import type { Config } from "tailwindcss";

// Palette reprise de la landing page, pour garder une identité cohérente
// entre le site vitrine et le produit.
const config: Config = {
  // Mode sombre activé via une classe .dark sur <html> (voir
  // components/ThemeToggle.tsx et le script anti-flash dans
  // app/layout.tsx), plutôt que "media" : on veut un bouton que
  // l'utilisateur contrôle lui-même, pas uniquement la préférence système.
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette officielle Compyo (identité visuelle v2, voir BRAND.md).
        // Les noms de tokens ("ink", "paper", "signal"...) restent
        // inchangés pour que toute l'app se mette à jour automatiquement.
        // Depuis l'ajout du vrai mode sombre, les valeurs ne sont plus des
        // hex fixes mais des variables CSS (voir app/globals.css, blocs
        // :root et .dark) : chaque token change de valeur selon le mode,
        // sans qu'aucun composant n'ait besoin de connaître le mode actif —
        // un bg-paper reste juste "bg-paper" partout dans le code.
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        "paper-warm": "rgb(var(--c-paper-warm) / <alpha-value>)",
        signal: "rgb(var(--c-signal) / <alpha-value>)",
        "signal-clair": "rgb(var(--c-signal-clair) / <alpha-value>)",
        "signal-fonce": "rgb(var(--c-signal-fonce) / <alpha-value>)",
        steel: "rgb(var(--c-steel) / <alpha-value>)",
        "gris-clair": "rgb(var(--c-gris-clair) / <alpha-value>)",
        // Nouveau : pour les blocs volontairement toujours sombres (pied de
        // page, section "Pourquoi Compyo") qui doivent rester un accent
        // anthracite constant, dans les DEUX modes — contrairement à "ink"
        // qui, lui, s'inverse avec le mode (texte sombre en clair, texte
        // clair en sombre). Réutiliser "ink" pour ces blocs aurait fait
        // disparaître le contraste voulu une fois le mode sombre actif.
        anthracite: "rgb(var(--c-anthracite) / <alpha-value>)",
        // Surface "élevée" (cartes, panneaux) par-dessus le fond de page —
        // blanc pur en mode clair (plus clair que "paper", pour un léger
        // effet de relief), un gris légèrement plus clair que "paper" en
        // mode sombre (même logique de relief, inversée). Remplace les
        // bg-white codés en dur qui restaient blancs même en mode sombre.
        surface: "rgb(var(--c-surface) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Manrope", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
