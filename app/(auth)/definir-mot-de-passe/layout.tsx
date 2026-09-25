import type { Metadata } from "next";

// 25/09 — Page utilitaire, hors des résultats de recherche. La page est un composant client, qui ne peut pas
// déclarer ses métadonnées : ce layout serveur le fait pour elle.
export const metadata: Metadata = {
  title: "Définir votre mot de passe",
  description: "Choisissez le mot de passe de votre espace Compyo.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
