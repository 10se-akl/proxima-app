"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// ============================================================
// « Une journée avec Compyo » (24/09) — le fil conducteur de l'accueil.
//
// Six scènes, de 07:48 à 18:40. Ce composant ne dessine aucune scène : il
// les met en mouvement.
//   - Une scène joue quand elle arrive à l'écran ([data-actif] posé une
//     fois, et l'évènement "v-joue" pour les scènes interactives).
//   - Le bouton « Rejouer » d'une scène la relance.
//   - L'horloge suit la lecture : sur grand écran (1280 px et plus), une
//     colonne collante à gauche ; sur tablette, une barre fine sous
//     l'en-tête. Ses aiguilles tournent jusqu'à l'heure du chapitre en
//     cours.
//
// Sur téléphone (moins de 768 px, 80 % des visiteurs), la journée se
// regarde comme une story (25/09) : elle tient en un écran, six segments
// en haut se remplissent l'un après l'autre et font avancer les scènes
// toutes seules. Au premier toucher, le visiteur prend la main : il fait
// glisser, ou se sert des flèches. Chaque scène rejoue en arrivant. La
// barre collante de la tablette, qui s'ajoutait à l'en-tête et répétait le
// titre de la carte, n'existe plus à cette taille.
//
// Les scènes elles-mêmes restent rendues côté serveur (sauf celles qui se
// manipulent) : le texte est dans le HTML, lisible sans JavaScript et par
// les moteurs de recherche.
// ============================================================

export type Chapitre = { heure: string; titre: string; /** Téléphone : durée de la scène dans la story, en secondes. */ duree?: number };

const TELEPHONE = "(max-width: 767px)";

function minutes(heure: string) {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

/** Un cadran à deux aiguilles. Les angles ne sont pas ramenés à un tour :
 *  de 07:48 à 10:15, la grande aiguille fait vraiment ses deux tours et
 *  demi, en avant, comme le temps qui passe — jamais en arrière. */
function Cadran({ heure, className = "" }: { heure: string; className?: string }) {
  const total = minutes(heure);
  const angleMinutes = total * 6;
  const angleHeures = (total / 60) * 30;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="20"
          y1="3.8"
          x2="20"
          y2={i % 3 === 0 ? "6.6" : "5.4"}
          stroke="currentColor"
          strokeOpacity={i % 3 === 0 ? 0.6 : 0.3}
          strokeWidth="1.1"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 20 20)`}
        />
      ))}
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transform: `rotate(${angleHeures}deg)`, transformOrigin: "20px 20px", transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <line
        x1="20"
        y1="20"
        x2="20"
        y2="6.5"
        stroke="rgb(var(--c-signal))"
        strokeWidth="1.4"
        strokeLinecap="round"
        style={{ transform: `rotate(${angleMinutes}deg)`, transformOrigin: "20px 20px", transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Relancer une scène depuis le début. */
function jouer(scene: Element, depuisLeDebut: boolean) {
  if (depuisLeDebut) {
    scene.removeAttribute("data-actif");
    // Forcer le navigateur à constater la suppression, sinon les
    // animations CSS ne repartent pas de zéro.
    void (scene as HTMLElement).offsetWidth;
  }
  scene.setAttribute("data-actif", "");
  scene.dispatchEvent(new CustomEvent("v-joue"));
}

export function Journee({ chapitres, children }: { chapitres: Chapitre[]; children: ReactNode }) {
  const racine = useRef<HTMLDivElement>(null);
  const piste = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  const [courant, setCourant] = useState(0);
  const [telephone, setTelephone] = useState(false);
  // La story : elle avance seule tant que le visiteur n'a pas pris la main.
  const [lecture, setLecture] = useState(true);
  const [aLEcran, setALEcran] = useState(false);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const el = racine.current;
    const p = piste.current;
    if (!el || !p) return;
    setPret(true);
    const moinsDeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduit(moinsDeMouvement);
    if (moinsDeMouvement) setLecture(false);

    const scenes = [...el.querySelectorAll("[data-scene]")];
    const blocs = [...el.querySelectorAll<HTMLElement>("[data-chapitre]")];
    const ecran = window.matchMedia(TELEPHONE);

    // Ordinateur et tablette : une scène joue quand elle arrive à l'écran.
    // Sur téléphone, c'est la story qui les lance (voir plus bas).
    let activation: IntersectionObserver | null = null;
    // Ordinateur et tablette : le chapitre qui traverse le milieu de
    // l'écran. Téléphone : la carte la plus centrée dans le carrousel.
    let suivi: IntersectionObserver | null = null;
    let image = 0;
    const surDefilement = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        const milieu = p.scrollLeft + p.clientWidth / 2;
        let meilleur = 0;
        let ecart = Infinity;
        blocs.forEach((b, i) => {
          const distance = Math.abs(b.offsetLeft + b.offsetWidth / 2 - milieu);
          if (distance < ecart) {
            ecart = distance;
            meilleur = i;
          }
        });
        setCourant(meilleur);
      });
    };
    const brancher = () => {
      activation?.disconnect();
      activation = null;
      suivi?.disconnect();
      suivi = null;
      p.removeEventListener("scroll", surDefilement);
      setTelephone(ecran.matches);
      if (ecran.matches) {
        p.addEventListener("scroll", surDefilement, { passive: true });
        surDefilement();
      } else {
        activation = new IntersectionObserver(
          (entrees) => {
            for (const e of entrees) {
              if (!e.isIntersecting) continue;
              jouer(e.target, false);
              activation?.unobserve(e.target);
            }
          },
          { threshold: 0.3 }
        );
        scenes.filter((s) => !s.hasAttribute("data-actif")).forEach((s) => activation?.observe(s));
        suivi = new IntersectionObserver(
          (entrees) => {
            for (const e of entrees) {
              if (e.isIntersecting) setCourant(Number(e.target.getAttribute("data-chapitre")));
            }
          },
          { rootMargin: "-45% 0px -54% 0px" }
        );
        blocs.forEach((b) => suivi?.observe(b));
      }
    };
    brancher();
    ecran.addEventListener("change", brancher);

    // La story n'avance que lorsqu'elle occupe l'écran.
    const presence = new IntersectionObserver(([e]) => setALEcran(e.isIntersecting), { threshold: 0.55 });
    presence.observe(el);

    const surClic = (e: MouseEvent) => {
      const bouton = (e.target as HTMLElement).closest("[data-rejouer]");
      const scene = bouton?.closest("[data-scene]");
      if (scene) jouer(scene, true);
    };
    el.addEventListener("click", surClic);

    return () => {
      activation?.disconnect();
      suivi?.disconnect();
      presence.disconnect();
      cancelAnimationFrame(image);
      ecran.removeEventListener("change", brancher);
      p.removeEventListener("scroll", surDefilement);
      el.removeEventListener("click", surClic);
    };
  }, []);

  // Téléphone : la scène au centre rejoue chaque fois qu'elle y arrive, et
  // quand la story revient à l'écran.
  useEffect(() => {
    if (!telephone || !aLEcran) return;
    const scene = racine.current?.querySelectorAll("[data-chapitre]")[courant]?.querySelector("[data-scene]");
    if (scene) jouer(scene, true);
  }, [telephone, aLEcran, courant]);

  /** Aller à un chapitre : dans le carrousel sur téléphone, en faisant
   *  défiler la page ailleurs. */
  const allerA = (i: number) => {
    const bloc = racine.current?.querySelectorAll<HTMLElement>("[data-chapitre]")[i];
    const p = piste.current;
    if (!bloc) return;
    const comportement = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (p && window.matchMedia(TELEPHONE).matches) {
      p.scrollTo({ left: bloc.offsetLeft - (p.clientWidth - bloc.offsetWidth) / 2, behavior: comportement });
    } else {
      bloc.scrollIntoView({ behavior: comportement, block: "start" });
    }
  };

  const chapitre = chapitres[courant] ?? chapitres[0];
  const dernier = chapitres.length - 1;
  const enLecture = telephone && lecture && aLEcran;

  return (
    <div
      ref={racine}
      data-pret={pret ? "" : undefined}
      data-sans-barre
      className="relative max-md:flex max-md:h-[calc(100svh-4rem)] max-md:min-h-[36rem] max-md:flex-col"
    >
      {/* Tablette : la barre de l'heure, collée sous l'en-tête tant que la
          journée est à l'écran. Téléphone : l'en-tête de la story — les
          segments, l'heure, et de quoi reprendre la main. */}
      <div className="sticky top-16 z-20 -mx-5 mb-4 border-b border-ink/10 bg-paper/85 px-5 py-2.5 backdrop-blur-md max-md:static max-md:order-first max-md:mx-0 max-md:mb-3 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:backdrop-blur-none sm:-mx-8 sm:px-8 xl:hidden">
        {/* Téléphone : les segments de la story, en haut. */}
        <div className="flex gap-1 md:hidden">
          {chapitres.map((c, i) => (
            <button
              key={c.heure}
              type="button"
              onClick={() => {
                setLecture(false);
                allerA(i);
              }}
              aria-label={`Aller à ${c.heure}, ${c.titre}`}
              aria-current={i === courant ? "step" : undefined}
              className="group relative min-h-0 flex-1 py-2 before:absolute before:inset-x-0 before:-inset-y-[13px] before:content-[''] focus-visible:outline-none"
            >
              <span className="relative block h-[3px] overflow-hidden rounded-full bg-ink/15 group-focus-visible:ring-2 group-focus-visible:ring-signal/60">
                <span
                  key={i === courant ? `${courant}-${lecture}` : undefined}
                  // Avant : plein. Après : vide. En cours : se remplit tant
                  // que la story avance, plein si le visiteur a pris la main.
                  className={`absolute inset-0 origin-left rounded-full bg-signal ${
                    i < courant ? "" : i > courant ? "scale-x-0" : lecture && telephone && !reduit ? "v-segment" : ""
                  }`}
                  style={
                    i === courant
                      ? ({ "--duree": `${chapitres[i].duree ?? 7}s`, animationPlayState: enLecture ? "running" : "paused" } as CSSProperties)
                      : undefined
                  }
                  onAnimationEnd={() => {
                    if (i !== courant || !lecture) return;
                    if (courant < dernier) allerA(courant + 1);
                    else setLecture(false);
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 max-md:mt-1.5">
          <Cadran heure={chapitre.heure} className="h-8 w-8 shrink-0 text-ink" />
          <p className="min-w-0 flex-1 truncate text-[14px] max-md:text-[15px]">
            <span className="font-mono tabular-nums text-signal">{chapitre.heure}</span>
            <span className="mx-2 text-ink/25 max-md:hidden">·</span>
            <span className="text-ink/85 max-md:hidden">{chapitre.titre}</span>
            <span className="ml-2 text-ink/40 md:hidden">
              {courant + 1}/{chapitres.length}
            </span>
          </p>
          <div className="flex items-center gap-1.5 md:hidden">
            {!reduit && (
              <button
                type="button"
                onClick={() => {
                  if (!lecture && courant === dernier) allerA(0);
                  setLecture((v) => !v);
                }}
                aria-label={lecture ? "Mettre la journée en pause" : "Lire la journée"}
                className="grid h-11 w-11 place-items-center rounded-full text-ink/70 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
              >
                {lecture ? (
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
                    <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7Z" />
                  </svg>
                )}
              </button>
            )}
            {([-1, 1] as const).map((sens) => (
              <button
                key={sens}
                type="button"
                onClick={() => {
                  setLecture(false);
                  allerA(Math.max(0, Math.min(dernier, courant + sens)));
                }}
                disabled={sens === -1 ? courant === 0 : courant === dernier}
                aria-label={sens === 1 ? "Moment suivant" : "Moment précédent"}
                className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-[var(--v-ombre-legere)] ring-1 ring-ink/10 transition disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                  <path d={sens === 1 ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        {/* Tablette : la progression, six traits qu'on peut toucher pour
            sauter à un moment de la journée. */}
        <div className="mt-1.5 flex gap-1.5 max-md:hidden">
          {chapitres.map((c, i) => (
            <button
              key={c.heure}
              type="button"
              onClick={() => allerA(i)}
              aria-label={`Aller à ${c.heure}, ${c.titre}`}
              aria-current={i === courant ? "step" : undefined}
              className="group flex-1 py-1.5 focus-visible:outline-none"
            >
              <span
                className={`block h-1 rounded-full transition-colors duration-500 group-focus-visible:ring-2 group-focus-visible:ring-signal/60 ${
                  i <= courant ? "bg-signal" : "bg-ink/15"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-16 2xl:grid-cols-[15rem_minmax(0,1fr)] 2xl:gap-20">
        {/* Ordinateur : la colonne de l'heure, collante. */}
        <nav aria-label="Les heures de la journée" className="hidden xl:block">
          <div className="sticky top-28">
            <Cadran heure={chapitre.heure} className="h-16 w-16 text-ink" />
            <p className="mt-4 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {chapitre.heure}
            </p>
            <div className="relative mt-8">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-px origin-top bg-signal transition-transform duration-700 ease-out"
                style={{ transform: `scaleY(${(courant + 1) / chapitres.length})` }}
              />
              <ol className="space-y-3.5 border-l border-ink/10 pl-5">
                {chapitres.map((c, i) => (
                  <li key={c.heure}>
                    <a
                      href={`#chapitre-${i + 1}`}
                      className={`block text-[13px] leading-snug transition-colors duration-500 hover:text-ink ${
                        i === courant ? "text-ink" : "text-ink/40"
                      }`}
                      aria-current={i === courant ? "step" : undefined}
                    >
                      <span className="font-mono tabular-nums">{c.heure}</span>
                      <span className="ml-2">{c.titre}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </nav>

        {/* Téléphone : la piste du carrousel — défilement horizontal natif,
            aimanté au centre de chaque carte. Ailleurs, une simple pile.
            `relative` n'est pas décoratif : sans lui, les textes réservés
            aux lecteurs d'écran (position absolue) des cartes hors champ
            se rattachaient à un parent hors du carrousel, échappaient au
            rognage et élargissaient toute la page.
            Le premier toucher arrête la lecture automatique : le visiteur
            a pris la main. */}
        <div
          ref={piste}
          onPointerDown={() => telephone && setLecture(false)}
          className="max-md:relative max-md:-mx-5 max-md:flex max-md:min-h-0 max-md:flex-1 max-md:snap-x max-md:snap-mandatory max-md:gap-3 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-[6vw] max-md:pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Pour les scènes qui se manipulent : sait quand la scène joue (et
 *  chaque fois qu'on la rejoue), et si le visiteur a demandé moins de
 *  mouvement. */
export function useScene<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [tour, setTour] = useState(0);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    setReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const scene = ref.current?.closest("[data-scene]");
    if (!scene) return;
    const surJoue = () => setTour((t) => t + 1);
    if (scene.hasAttribute("data-actif")) surJoue();
    scene.addEventListener("v-joue", surJoue);
    return () => scene.removeEventListener("v-joue", surJoue);
  }, []);

  return { ref, tour, actif: tour > 0, reduit };
}
