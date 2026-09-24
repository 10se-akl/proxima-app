"use client";

import { useEffect, useRef, useState } from "react";
import { IconeChevron, IconeFermer, IconeRetour } from "./icones";

// Les photos en grand (24/09) : plein écran, flèches (clavier ou boutons),
// glisser du doigt pour passer à la suivante, Échap pour fermer.

export function Visionneuse({
  chemins,
  depart,
  urls,
  surFermer,
}: {
  chemins: string[];
  depart: number;
  urls: Record<string, string>;
  surFermer: () => void;
}) {
  const [index, setIndex] = useState(depart);
  const debutGlisse = useRef<number | null>(null);
  const fermer = useRef(surFermer);
  fermer.current = surFermer;
  const bouton = useRef<HTMLButtonElement>(null);

  const aller = (sens: 1 | -1) => setIndex((i) => (i + sens + chemins.length) % chemins.length);

  useEffect(() => {
    const retour = document.activeElement as HTMLElement | null;
    bouton.current?.focus();
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer.current();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % chemins.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + chemins.length) % chemins.length);
    };
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = ancien;
      retour?.focus?.();
    };
  }, [chemins.length]);

  const url = urls[chemins[index]];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} sur ${chemins.length}`}
      className="fixed inset-0 z-[80] flex flex-col bg-black/95 text-white"
      onPointerDown={(e) => (debutGlisse.current = e.clientX)}
      onPointerUp={(e) => {
        if (debutGlisse.current === null) return;
        const dx = e.clientX - debutGlisse.current;
        debutGlisse.current = null;
        if (Math.abs(dx) > 50 && chemins.length > 1) aller(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 [padding-top:calc(0.75rem+env(safe-area-inset-top))]">
        <p className="font-mono text-[13px] tabular-nums text-white/70">
          {index + 1} / {chemins.length}
        </p>
        <button
          ref={bouton}
          type="button"
          onClick={surFermer}
          aria-label="Fermer"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <IconeFermer className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Photo ${index + 1} du projet`} className="max-h-full max-w-full select-none object-contain" draggable={false} />
        ) : (
          <p className="text-white/60">Chargement…</p>
        )}
        {chemins.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => aller(-1)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            >
              <IconeRetour className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => aller(1)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            >
              <IconeChevron className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
