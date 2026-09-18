"use client";

// ============================================================
// Les avis Google qui défilent (18/09) — voir AvisGoogle.tsx pour leur
// provenance. Une bande qui glisse lentement et en continu, qui s'arrête
// au survol (pour lire) et reste immobile pour qui a demandé à réduire
// les animations. Avec peu d'avis, pas de défilement : une simple grille.
// ============================================================

export type AvisAffiche = {
  auteur: string;
  urlAuteur: string | null;
  photo: string | null;
  note: number;
  quand: string;
  texte: string;
};

const LONGUEUR_MAX = 260;

function Carte({ avis, cachee = false }: { avis: AvisAffiche; cachee?: boolean }) {
  const texte = avis.texte.length > LONGUEUR_MAX ? `${avis.texte.slice(0, LONGUEUR_MAX).trimEnd()}…` : avis.texte;
  return (
    <figure
      aria-hidden={cachee || undefined}
      className="flex w-[300px] shrink-0 flex-col rounded-3xl border border-white/10 bg-[#241C16]/90 p-6 sm:w-[340px]"
    >
      <div className="flex gap-0.5" role="img" aria-label={`${avis.note} étoiles sur 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} aria-hidden viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${i < avis.note ? "text-[#E8B23D]" : "text-white/15"}`}>
            <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.45 6.19 20.5l1.11-6.47-4.7-4.58 6.5-.95L12 2.6z" />
          </svg>
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-[#E8DCCB]">« {texte} »</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        {avis.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avis.photo} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#C96B4A]/25 text-sm font-semibold text-[#E8956F]">
            {avis.auteur.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          {avis.urlAuteur ? (
            <a href={avis.urlAuteur} target="_blank" rel="noopener noreferrer" tabIndex={cachee ? -1 : undefined} className="block truncate text-sm font-semibold text-[#F5F1EA] hover:underline">
              {avis.auteur}
            </a>
          ) : (
            <p className="truncate text-sm font-semibold text-[#F5F1EA]">{avis.auteur}</p>
          )}
          <p className="text-xs text-[#C9C0B4]/70">{avis.quand ? `${avis.quand} · Google` : "Google"}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export function CarrouselAvis({ avis }: { avis: AvisAffiche[] }) {
  if (avis.length <= 2) {
    return (
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap justify-center gap-4 px-6">
        {avis.map((a, i) => (
          <Carte key={i} avis={a} />
        ))}
      </div>
    );
  }

  // Défilement infini : la liste est posée deux fois, et la bande glisse
  // de la moitié de sa largeur avant de reboucler sans à-coup.
  const duree = Math.max(30, avis.length * 9);
  return (
    <div className="bande mt-12 overflow-hidden">
      <div className="piste flex w-max gap-4 px-2" style={{ animationDuration: `${duree}s` }}>
        {avis.map((a, i) => (
          <Carte key={`a-${i}`} avis={a} />
        ))}
        {avis.map((a, i) => (
          <Carte key={`b-${i}`} avis={a} cachee />
        ))}
      </div>
      <style jsx>{`
        .bande {
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .piste {
          animation: glisser linear infinite;
        }
        .bande:hover .piste,
        .bande:focus-within .piste {
          animation-play-state: paused;
        }
        @keyframes glisser {
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .piste {
            animation: none;
          }
          .bande {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
