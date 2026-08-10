import type { Config } from "tailwindcss";

// Palette reprise de la landing page, pour garder une identité cohérente
// entre le site vitrine et le produit.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette officielle Compyo (identité visuelle v2, voir BRAND.md) —
        // les noms de tokens ("ink", "paper", "signal"...) restent
        // inchangés pour que toute l'app se mette à jour automatiquement,
        // seules les valeurs hexadécimales évoluent vers la nouvelle
        // palette premium.
        ink: "#1F2937", // anthracite
        paper: "#FAF8F5", // blanc cassé
        "paper-warm": "#F3EDE6",
        signal: "#C96B4A", // terracotta principal
        "signal-clair": "#E8C5B6", // terracotta clair
        "signal-fonce": "#A8563A", // nuance survol (hover), pas dans la palette officielle
        steel: "#5C7080",
        "gris-clair": "#E8E8E8",
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
