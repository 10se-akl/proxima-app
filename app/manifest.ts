import type { MetadataRoute } from "next";

// Convention Next.js App Router : ce fichier génère automatiquement
// /manifest.webmanifest et injecte lui-même la balise <link rel="manifest">
// dans le <head> — pas besoin de fichier public/manifest.json ni de lien
// manuel. Documentation : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
//
// Choix retenus (Release Candidate — PWA) :
// - name/short_name : "Compyo" seul, sans slogan — c'est ce qui s'affiche
//   sous l'icône sur l'écran d'accueil, doit rester court et net.
// - display "standalone" plutôt que "fullscreen" : fullscreen masque aussi
//   la barre de statut (heure, réseau, batterie) du téléphone, ce qu'un
//   artisan qui doit rester joignable/vérifier l'heure sur chantier ne
//   souhaite pas perdre. "standalone" retire déjà la barre d'adresse du
//   navigateur (l'objectif "oublier que c'est un site") sans cacher l'OS.
// - theme_color reprend --c-signal (terracotta, la couleur de marque),
//   pas le fond crème : c'est la couleur qui teinte la barre de statut
//   Android et la bordure de la fenêtre — un accent de marque visible y
//   a plus de sens qu'un ton neutre.
// - background_color = --c-paper (fond crème) : c'est la couleur affichée
//   une fraction de seconde entre le tap sur l'icône et le premier rendu
//   React, avant même que le CSS soit chargé — donc idéalement identique
//   au fond réel de l'app pour qu'aucun flash de couleur ne soit visible.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Compyo",
    short_name: "Compyo",
    description:
      "L'assistant qui s'occupe de l'administratif des artisans du bâtiment.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF8F5",
    theme_color: "#C96B4A",
    lang: "fr-FR",
    icons: [
      { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
