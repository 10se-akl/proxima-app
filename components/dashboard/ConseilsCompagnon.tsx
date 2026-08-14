"use client";

import { useEffect, useState } from "react";
import { useParallaxSouris } from "@/components/useParallaxSouris";

// Comble l'espace vide à droite du contenu principal sur grand écran (le
// contenu de l'accueil est volontairement étroit — max-w-2xl — pour rester
// lisible, ce qui laisse un grand vide sur un écran large). Un conseil
// différent à chaque rechargement plutôt qu'un vrai "tuto" complet : plus
// léger à construire, et plus utile dans la durée qu'un tutoriel qu'on ne
// revoit qu'une fois. Effet de tilt au survol de la souris identique à la
// maquette du Hero sur le site vitrine (voir useParallaxSouris) — sans
// selecteurZone, donc l'écoute se fait directement sur la carte elle-même
// (adapté à un petit panneau autonome, pas à une grande section).
//
// Chaque conseil a un emoji associé, affiché en grand dans un badge coloré
// au-dessus du texte — pas une vraie photo (pas de banque d'images utilisée
// nulle part ailleurs sur le site, pour rester cohérent), mais un repère
// visuel fort qui rend la carte plus "parlante" qu'un simple bloc de texte.
const CONSEILS = [
  {
    emoji: "📸",
    texte:
      "Une capture d'écran WhatsApp suffit : l'IA en extrait le client et le chantier, vous validez avant tout enregistrement.",
  },
  {
    emoji: "🎙️",
    texte:
      "Dictez une note vocale juste en sortant du rendez-vous — c'est à chaud, sur la route, que l'essentiel se dit.",
  },
  {
    emoji: "🧮",
    texte:
      "L'IA ne propose jamais de prix : c'est votre moteur de calcul qui décide, toujours, à partir de vos propres tarifs.",
  },
  {
    emoji: "✅",
    texte:
      "Un rendez-vous passé sans réponse ? Compyo vous demande de confirmer, pour ne jamais perdre le fil d'un chantier.",
  },
  {
    emoji: "📁",
    texte:
      "Toutes les infos d'un client restent liées à son chantier, automatiquement — rien à reclasser à la main.",
  },
  {
    emoji: "🌙",
    texte:
      "Le bouton en bas à gauche du menu bascule entre mode clair et mode sombre, selon votre préférence.",
  },
];

export function ConseilsCompagnon() {
  const ref = useParallaxSouris<HTMLDivElement>(5);
  // Valeur initiale FIXE (le premier conseil), identique au serveur et au
  // client au premier rendu — indispensable pour éviter une erreur
  // d'hydratation React (le HTML généré côté serveur doit correspondre
  // exactement au premier rendu côté client). Le tirage aléatoire n'a
  // lieu qu'ensuite, dans useEffect, qui ne s'exécute qu'après
  // l'hydratation : React s'attend alors à une mise à jour, pas de
  // mismatch. Comme useEffect se relance à chaque chargement de page,
  // le conseil change bien à chaque rechargement, comme demandé.
  const [conseil, setConseil] = useState(CONSEILS[0]);

  useEffect(() => {
    setConseil(CONSEILS[Math.floor(Math.random() * CONSEILS.length)]);
  }, []);

  return (
    <div
      ref={ref}
      className="sticky top-8 rounded-2xl border border-ink/10 bg-surface p-6 transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
    >
      <div className="w-12 h-12 rounded-full bg-signal/10 grid place-items-center text-2xl mb-4">
        {conseil.emoji}
      </div>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-steel mb-3">
        Le saviez-vous ?
      </p>
      <p className="text-sm text-ink/70 leading-relaxed">{conseil.texte}</p>
    </div>
  );
}
