"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

// ============================================================
// Le lecteur des vidéos de la vitrine (18/09, refait le 18/10 pour le film
// d'une minute).
//
// - Deux cadrages dans un seul lecteur : la vidéo paysage à partir de
//   640 px, la verticale en dessous (en 16:9 sur un téléphone, l'écran de
//   l'application serait illisible). Le parent réserve la place (le ratio),
//   rien ne saute au chargement.
// - Rien n'est téléchargé tant que le visiteur n'approche pas : la source
//   n'est posée qu'à 600 px de l'écran, et seulement les métadonnées.
// - Lecture automatique, muette, quand la vidéo est bien à l'écran (la
//   moitié) ; pause quand elle en sort, reprise au retour. Une pause du
//   visiteur est respectée : on ne relance jamais à sa place.
// - Pas de boucle : à la fin, « Revoir ».
// - Jamais de lecture automatique pour qui a demandé à réduire les
//   animations : l'affiche reste, « Lecture » la lance.
// - Commandes : Pause · Lecture · Revoir, le temps qui avance, et le son
//   seulement si la vidéo en a un (avecSon).
// ============================================================

type Source = { src: string; affiche: string };
type Etat = "attente" | "lecture" | "pause" | "fini";

function mmss(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function IconeLecture() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function IconePause() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function IconeRevoir() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  );
}

function IconeSon({ coupe }: { coupe: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {coupe ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
    </svg>
  );
}

export function VideoDemo({
  src,
  affiche,
  vertical,
  description,
  avecSon = false,
}: {
  /** La vidéo (paysage, ou la seule). */
  src: string;
  affiche: string;
  /** La version verticale, montrée sous 640 px. */
  vertical?: Source;
  /** Ce que montre la vidéo, pour les lecteurs d'écran. */
  description: string;
  /** La vidéo a une piste son : on propose de l'activer (coupée au départ). */
  avecSon?: boolean;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const idDescription = useId();
  const [source, setSource] = useState<Source | null>(null);
  const [etat, setEtat] = useState<Etat>("attente");
  const etatRef = useRef<Etat>("attente");
  const [temps, setTemps] = useState(0);
  const [duree, setDuree] = useState(0);
  const [muet, setMuet] = useState(true);
  // L'affiche reste par-dessus tant que la vidéo n'a pas commencé (sinon on
  // verrait sa première image, vide) ; elle s'efface au premier « play ».
  const [demarree, setDemarree] = useState(false);
  const reduit = useRef(false);
  // Une pause qui vient de la sortie de l'écran (et pas du visiteur).
  const pauseAuto = useRef(false);
  // Bien à l'écran en ce moment ; et un « Lecture » touché avant que la
  // source soit là.
  const bienVisible = useRef(false);
  const veutLire = useRef(false);

  const changer = useCallback((e: Etat) => {
    etatRef.current = e;
    setEtat(e);
  }, []);

  // Le cadrage, selon la largeur (et s'il change, l'autre source).
  const choisir = useCallback(() => {
    const large = !vertical || window.matchMedia("(min-width: 640px)").matches;
    return large ? { src, affiche } : vertical;
  }, [src, affiche, vertical]);

  // La source n'arrive qu'à l'approche ; la lecture, quand la vidéo est
  // bien à l'écran.
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    reduit.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const approche = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setSource(choisir());
        approche.disconnect();
      },
      { rootMargin: "600px 0px" }
    );
    approche.observe(el);

    const vue = new IntersectionObserver(
      ([e]) => {
        const v = video.current;
        if (!v) return;
        bienVisible.current = e.isIntersecting && e.intersectionRatio >= 0.5;
        const actuel = etatRef.current;
        if (bienVisible.current && !reduit.current && (actuel === "attente" || (actuel === "pause" && pauseAuto.current))) {
          pauseAuto.current = false;
          // Refusée par certains navigateurs économes (mode batterie) :
          // l'affiche et « Lecture » restent.
          v.play().catch(() => {});
        } else if (!e.isIntersecting && actuel === "lecture") {
          pauseAuto.current = true;
          v.pause();
        }
      },
      { threshold: [0, 0.5] }
    );
    vue.observe(el);

    const media = window.matchMedia("(min-width: 640px)");
    const surLargeur = () => {
      if (!vertical) return;
      setSource((avant) => (avant ? choisir() : avant));
      setDemarree(false);
      setTemps(0);
      changer("attente");
    };
    media.addEventListener("change", surLargeur);
    return () => {
      approche.disconnect();
      vue.disconnect();
      media.removeEventListener("change", surLargeur);
    };
  }, [choisir, changer, vertical]);

  // La source arrive alors que la vidéo est déjà à l'écran (arrivée par une
  // ancre, défilement très rapide), ou après un « Lecture » : on lance.
  const surPrete = () => {
    const v = video.current;
    if (!v || etatRef.current !== "attente") return;
    if (veutLire.current || (bienVisible.current && !reduit.current)) {
      veutLire.current = false;
      v.play().catch(() => {});
    }
  };

  const surBouton = () => {
    const v = video.current;
    if (!v) return;
    pauseAuto.current = false;
    if (!source) {
      veutLire.current = true;
      setSource(choisir());
      return;
    }
    if (etat === "lecture") {
      v.pause();
      return;
    }
    if (etat === "fini") v.currentTime = 0;
    v.play().catch(() => {});
  };

  const bouton =
    etat === "lecture"
      ? { libelle: "Pause", icone: <IconePause /> }
      : etat === "fini"
        ? { libelle: "Revoir", icone: <IconeRevoir /> }
        : { libelle: "Lecture", icone: <IconeLecture /> };

  return (
    <div ref={cadre} className="relative h-full w-full">
      <video
        ref={video}
        src={source?.src}
        muted={muet}
        playsInline
        preload="metadata"
        aria-describedby={idDescription}
        onCanPlay={surPrete}
        onPlaying={() => setDemarree(true)}
        onLoadedMetadata={(e) => setDuree(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setTemps(e.currentTarget.currentTime)}
        onPlay={() => changer("lecture")}
        onPause={(e) => {
          if (!e.currentTarget.ended) changer("pause");
        }}
        onEnded={() => {
          pauseAuto.current = false;
          changer("fini");
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* L'affiche : là avant tout, même sans JavaScript, au bon cadrage. */}
      <picture>
        {vertical && <source media="(max-width: 639px)" srcSet={vertical.affiche} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={affiche}
          alt=""
          loading="lazy"
          decoding="async"
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${demarree ? "opacity-0" : "opacity-100"}`}
        />
      </picture>
      <p id={idDescription} className="sr-only">
        {description}
      </p>

      {/* Les commandes, en bas : une capsule sur un voile léger. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/50 via-black/20 to-transparent p-3 pt-12 sm:gap-4 sm:p-4 sm:pt-14">
        <button
          type="button"
          onClick={surBouton}
          className="pointer-events-auto inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-white/95 px-5 text-[15px] font-semibold text-anthracite shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
        >
          {bouton.icone}
          {bouton.libelle}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3 font-mono text-[12px] tabular-nums text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]" aria-hidden>
          <span>{mmss(temps)}</span>
          <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <span
              className="absolute inset-0 origin-left rounded-full bg-white"
              style={{ transform: `scaleX(${duree ? Math.min(1, temps / duree) : 0})` }}
            />
          </span>
          <span className="text-white/75">{duree ? mmss(duree) : "--:--"}</span>
        </div>
        {avecSon && (
          <button
            type="button"
            onClick={() => setMuet((m) => !m)}
            aria-label={muet ? "Activer le son" : "Couper le son"}
            aria-pressed={!muet}
            className="pointer-events-auto grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/95 text-anthracite transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconeSon coupe={muet} />
          </button>
        )}
      </div>
    </div>
  );
}
