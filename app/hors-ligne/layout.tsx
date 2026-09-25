import type { Metadata } from "next";

// 25/09 — Page de secours du service worker, hors des résultats de recherche. La page est un composant client, qui ne peut pas
// déclarer ses métadonnées : ce layout serveur le fait pour elle.
export const metadata: Metadata = {
  title: "Hors ligne",
  description: "Compyo n'a pas pu charger cette page sans réseau.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
