"use client";

import { useParallaxSouris } from "@/components/useParallaxSouris";

// Panneau "démo" réutilisé par chaque section de fonctionnalité de la
// landing page (voir DemoDevis, DemoImport, DemoPlanning, DemoNotesVocales)
// — fond en grille technique avec quelques repères en croix, légère
// parallaxe à la souris, dans lequel vient flotter un mockup (screenshot
// simulé de l'app). Inspiré du traitement visuel montré par Axel (fond
// grille + halo + contenu qui "flotte" légèrement au mouvement de la
// souris), extrait en composant partagé pour que les 4 sections restent
// cohérentes entre elles plutôt que réinventées séparément.
//
// 100% CSS/SVG, aucune dépendance externe — contrairement à l'essai
// précédent avec Three.js, ce composant est simple et vérifiable.
const REPERES = [
  { x: "8%", y: "18%" },
  { x: "88%", y: "12%" },
  { x: "92%", y: "70%" },
  { x: "12%", y: "82%" },
  { x: "50%", y: "8%" },
];

export function DemoPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useParallaxSouris<HTMLDivElement>(4);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl border border-ink/10 bg-paper-warm transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d] ${className}`}
    >
      {/* Grille technique discrète, en dégradés répétés (pas d'image) —
          voir le même principe dans globals.css pour l'intro. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          color: "rgb(var(--c-ink))",
        }}
      />
      {/* Halo de couleur de marque, centré, très doux */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(201,107,74,0.10), transparent 55%)",
        }}
      />
      {/* Repères en croix, façon plan technique — purement décoratifs */}
      {REPERES.map((r, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute text-ink/15 text-xs font-mono select-none"
          style={{ left: r.x, top: r.y }}
        >
          +
        </span>
      ))}

      <div className="relative p-6 sm:p-8">{children}</div>
    </div>
  );
}
