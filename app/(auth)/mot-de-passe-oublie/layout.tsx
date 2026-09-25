import type { Metadata } from "next";

// 25/09 — Page utilitaire, hors des résultats de recherche. La page est un composant client, qui ne peut pas
// déclarer ses métadonnées : ce layout serveur le fait pour elle.
export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien pour choisir un nouveau mot de passe Compyo.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
