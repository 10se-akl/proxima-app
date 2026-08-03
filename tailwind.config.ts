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
        ink: "#1C2A33",
        paper: "#F3F0E8",
        "paper-warm": "#EDE7D9",
        signal: "#D9631A",
        steel: "#5C7080",
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
