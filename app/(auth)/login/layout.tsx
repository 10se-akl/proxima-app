import type { Metadata } from "next";

// 25/09 — Page de connexion : utile aux artisans, pas aux résultats de recherche. Elle portait le titre de l'ancien accueil. La page est un composant client, qui ne peut pas
// déclarer ses métadonnées : ce layout serveur le fait pour elle.
export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace Compyo.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
