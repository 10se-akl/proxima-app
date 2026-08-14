"use client";

import { useParallaxSouris } from "@/components/useParallaxSouris";

// Mini "comment ça marche" sous le panneau de conseils — même habillage
// "fenêtre" (barre à trois points) que la maquette du Hero sur le site
// vitrine (voir components/marketing/LandingPage.tsx, MockupProduit), et
// même effet "tactile" au survol (léger tilt 3D qui suit la souris) —
// demandé explicitement pour retrouver la sensation de la maquette du
// site directement dans l'app. Étape "capture d'écran" ajoutée : le
// parcours ne mentionnait pas encore que coller une capture de
// conversation (WhatsApp/SMS) suffit à créer le projet, alors que c'est
// un vrai raccourci du produit (voir app/dashboard/demandes/importer-capture).
const ETAPES = [
  { emoji: "💬", texte: "Un client écrit — SMS, WhatsApp, email" },
  { emoji: "📸", texte: "Vous collez une capture d'écran de la conversation" },
  { emoji: "🗂️", texte: "Le projet se crée automatiquement, en quelques secondes" },
  { emoji: "🎙️", texte: "Vous dictez une note sur le chantier" },
  { emoji: "📄", texte: "L'IA propose un devis, vous validez" },
];

export function MiniApercu() {
  const ref = useParallaxSouris<HTMLDivElement>(5);

  return (
    <div
      ref={ref}
      className="mt-6 rounded-2xl border border-ink/10 bg-surface overflow-hidden transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/10 bg-paper/60">
        <span className="w-2 h-2 rounded-full bg-ink/15" />
        <span className="w-2 h-2 rounded-full bg-ink/15" />
        <span className="w-2 h-2 rounded-full bg-ink/15" />
        <span className="ml-2 font-mono text-[10px] text-ink/50">Comment ça marche</span>
      </div>
      <div className="p-4">
        {ETAPES.map((etape, i) => (
          <div key={etape.texte} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span className="w-7 h-7 rounded-full bg-signal/10 grid place-items-center text-sm shrink-0">
                {etape.emoji}
              </span>
              {i < ETAPES.length - 1 && (
                <span className="w-px flex-1 bg-ink/10 my-1 min-h-[14px]" />
              )}
            </div>
            <p className="text-xs text-ink/70 pt-1 pb-4 leading-snug">{etape.texte}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
