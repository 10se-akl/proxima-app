"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { DessinMetier } from "@/components/marketing/illustrations/Outils";
import { totalLigne, totaux } from "@/components/marketing/metiers/exemplesMetiers";
import { CadrePhoto } from "../CadrePhoto";
import { PHOTOS } from "../photos";
import { euros } from "../scenes/outils";
import { METIERS_VITRINE, type MetierVitrine } from "./donnees";
import { Matiere, MATIERES_CLAIRES } from "./Matiere";

// ============================================================
// « Votre métier » (24/09) — dix-sept cartes, une fiche qui se déploie.
//
// Un rail de cartes qu'on fait défiler du doigt (ou avec les flèches) ;
// la carte choisie se déploie en fiche : sa matière en grand, une scène,
// ce que l'artisan dicte sur place, le devis qui en sort, les questions
// que Compyo pose avant de chiffrer. Tout change d'un métier à l'autre.
//
// Le déploiement utilise les View Transitions du navigateur (natives,
// aucune bibliothèque) : la carte grandit réellement jusqu'à devenir le
// visuel de la fiche. Là où elles n'existent pas, ou pour qui demande
// moins de mouvement, la fiche change simplement, avec un fondu.
//
// Accessibilité : un groupe d'onglets (flèches gauche/droite, Début,
// Fin), la fiche est le panneau associé.
//
// Téléphone (25/09) : le schéma onglets + panneau est celui d'un écran de
// bureau — la fiche se déployait sous le rail, et la section faisait
// 1 800 px. Ici, le rail passe sur deux rangées et chaque carte s'ouvre
// dans une feuille qui monte du bas (FeuilleMetier) : la carte grandit
// jusqu'à devenir le visuel de la feuille, et on la referme en la tirant
// vers le bas, comme dans une application.
// ============================================================

const NOM_TRANSITION = "metier-visuel";

function Visuel({ m, grand = false }: { m: MetierVitrine; grand?: boolean }) {
  const photo = PHOTOS.metiers[m.id];
  const clair = !photo && MATIERES_CLAIRES.has(m.id);
  return (
    <>
      {photo ? (
        <CadrePhoto
          photo={photo}
          voile="carte"
          className="absolute inset-0"
          sizes={grand ? "(min-width: 1024px) 40vw, 100vw" : "12rem"}
        />
      ) : (
        <>
          <Matiere id={m.id} />
          <DessinMetier
            id={m.id}
            className={`absolute ${
              grand ? "right-[5%] top-[6%] h-[46%] w-[46%] sm:h-[52%] sm:w-[52%] lg:right-[6%] lg:top-[7%] lg:h-[58%] lg:w-[58%]" : "right-[4%] top-[6%] h-[62%] w-[62%]"
            } ${
              clair ? "text-[#1F2937]/60" : "text-white/75"
            }`}
          />
        </>
      )}
    </>
  );
}

function Carte({
  m,
  choisie,
  telephone,
  onChoisir,
  onClavier,
  refBouton,
}: {
  m: MetierVitrine;
  choisie: boolean;
  telephone: boolean;
  onChoisir: () => void;
  onClavier: (e: React.KeyboardEvent) => void;
  refBouton: (el: HTMLButtonElement | null) => void;
}) {
  // Ordinateur : un onglet, la fiche est le panneau associé. Téléphone :
  // un bouton qui ouvre la fiche dans une feuille.
  const onglet = !telephone;
  return (
    <button
      ref={refBouton}
      type="button"
      role={onglet ? "tab" : undefined}
      id={`onglet-${m.id}`}
      aria-selected={onglet ? choisie : undefined}
      aria-controls={onglet ? "fiche-metier" : undefined}
      aria-haspopup={onglet ? undefined : "dialog"}
      tabIndex={onglet && !choisie ? -1 : 0}
      onClick={onChoisir}
      onKeyDown={onglet ? onClavier : undefined}
      className={`group relative h-[13rem] w-[9.75rem] shrink-0 snap-start overflow-hidden rounded-[1.3rem] text-left transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper max-md:h-[44vw] max-md:max-h-[12rem] max-md:w-[37vw] max-md:max-w-[10rem] max-md:rounded-[1.15rem] max-md:active:scale-[0.97] sm:h-[15rem] sm:w-[11.25rem] ${
        choisie && onglet
          ? "-translate-y-1.5 shadow-[var(--v-ombre)] ring-2 ring-signal ring-offset-2 ring-offset-paper"
          : "shadow-[var(--v-ombre-legere)] hover:-translate-y-1 hover:shadow-[var(--v-ombre)] max-md:hover:translate-y-0"
      }`}
    >
      <span data-visuel className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
        <Visuel m={m} />
      </span>
      <span
        className={`absolute left-3.5 top-3 font-mono text-[10.5px] tracking-[0.16em] max-md:left-3 max-md:top-2.5 ${
          !PHOTOS.metiers[m.id] && MATIERES_CLAIRES.has(m.id) ? "text-[#1F2937]/70" : "text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]"
        }`}
      >
        {m.numero}
      </span>
      <span className="absolute inset-x-3.5 bottom-3.5 font-display text-[1.05rem] font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.35)] max-md:inset-x-3 max-md:bottom-3 max-md:text-[1rem] sm:text-[1.15rem]">
        {m.fiche.nom}
      </span>
    </button>
  );
}

/** Ce que l'artisan dicte, puis le devis qui en sort. Recréé à chaque
 *  changement de métier : les animations d'entrée rejouent. */
function Demonstration({ m }: { m: MetierVitrine }) {
  const mots = m.dictee.split(" ");
  const somme = totaux(m.exemple);
  const debutDevis = 0.5 + mots.length * 0.045;
  return (
    <div className="rounded-[1.3rem] bg-paper-warm/70 p-4 ring-1 ring-ink/[0.06] sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-signal text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
        </span>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-steel">Dicté sur place</p>
      </div>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink/85">
        «&nbsp;
        {mots.map((mot, i) => (
          <span key={i} className="v-apparait-mot" style={{ "--d": `${0.25 + i * 0.045}s` } as CSSProperties}>
            {mot}{" "}
          </span>
        ))}
        »
      </p>

      <div className="v-apparait mt-4 border-t border-ink/10 pt-3" style={{ "--d": `${debutDevis}s` } as CSSProperties}>
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-ink">{m.exemple.chantier}</p>
        </div>
        <ul className="mt-2 space-y-1.5">
          {m.exemple.lignes.map((l, i) => (
            <li
              key={l.designation}
              className="v-apparait flex items-baseline justify-between gap-3 text-[12.5px]"
              style={{ "--d": `${debutDevis + 0.15 + i * 0.12}s` } as CSSProperties}
            >
              <span className="min-w-0 truncate text-ink/75">{l.designation}</span>
              <span className="shrink-0 font-mono tabular-nums text-ink/80">{euros(totalLigne(l))}</span>
            </li>
          ))}
        </ul>
        <div
          className="v-apparait mt-3 flex items-baseline justify-between border-t border-ink/10 pt-2.5"
          style={{ "--d": `${debutDevis + 0.3 + m.exemple.lignes.length * 0.12}s` } as CSSProperties}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
            TTC · TVA {String(m.exemple.tvaPct).replace(".", ",")} %
          </span>
          <span className="font-display text-xl font-semibold tabular-nums text-ink">{euros(somme.ttc)}</span>
        </div>
      </div>
    </div>
  );
}

/** Le grand visuel de la fiche : la matière, le chantier type, ses cotes. */
function VisuelFiche({ m, refVisuel, className = "" }: { m: MetierVitrine; refVisuel?: React.Ref<HTMLDivElement>; className?: string }) {
  return (
    <div ref={refVisuel} className={`relative overflow-hidden ${className}`}>
      <Visuel m={m} grand />
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/70">Chantier type</p>
          <p className="mt-1 max-w-[16rem] font-display text-lg font-semibold leading-tight text-white max-sm:max-w-[11rem] max-sm:text-base sm:text-xl">
            {m.exemple.chantier}
          </p>
        </div>
        <dl className="flex gap-2">
          {m.exemple.cotes.map((c) => (
            <div key={c.libelle} className="rounded-xl bg-black/30 px-3 py-2 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/65">{c.libelle}</dt>
              <dd className="text-[14px] font-semibold">{c.valeur}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Le texte de la fiche : le métier, ce que Compyo change, la dictée et le
 *  devis, les questions posées avant de chiffrer. Recréé à chaque
 *  changement de métier : les animations d'entrée rejouent. */
function CorpsFiche({ m, dansFeuille = false }: { m: MetierVitrine; dansFeuille?: boolean }) {
  // Sur téléphone, un volet à la fois : ce qui se passe sur le chantier
  // (la dictée et le devis), ou les questions posées avant de chiffrer.
  // Empilés, les deux faisaient une fiche de 1 200 px.
  const [volet, setVolet] = useState<"chantier" | "questions">("chantier");
  const TitreFiche = dansFeuille ? "h2" : "h3";
  return (
    <>
      <p className="v-apparait font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
        {m.numero} / {String(METIERS_VITRINE.length).padStart(2, "0")}
      </p>
      <TitreFiche
        id={dansFeuille ? "titre-feuille-metier" : undefined}
        className="v-apparait mt-3 font-display text-[2.2rem] font-semibold leading-[1] tracking-[-0.03em] text-ink max-md:mt-2 sm:text-5xl"
        style={{ "--d": "0.05s" } as CSSProperties}
      >
        {m.fiche.nom}.
      </TitreFiche>
      <p className="v-apparait mt-4 max-w-xl text-[16px] leading-relaxed text-ink/65 max-md:mt-3 max-md:text-[15px] sm:text-[17px]" style={{ "--d": "0.1s" } as CSSProperties}>
        {m.accroche}
      </p>
      <ul className="mt-5 flex flex-wrap gap-2 max-md:mt-4" aria-label="Ce que Compyo change pour ce métier">
        {m.atouts.map((a, i) => (
          <li
            key={a}
            className="v-apparait rounded-full bg-signal/10 px-3 py-1.5 text-[12.5px] font-medium text-signal-fonce dark:text-signal-clair"
            style={{ "--d": `${0.15 + i * 0.06}s` } as CSSProperties}
          >
            {a}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-ink/[0.06] p-1 md:hidden">
        {(
          [
            ["chantier", "Sur le chantier"],
            ["questions", "Avant de chiffrer"],
          ] as const
        ).map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            aria-pressed={volet === cle}
            onClick={() => setVolet(cle)}
            className={`rounded-full px-3 py-2 text-[13.5px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 ${
              volet === cle ? "bg-surface text-ink shadow-[var(--v-ombre-legere)]" : "text-ink/55"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-5 max-md:mt-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className={volet === "chantier" ? "" : "max-md:hidden"}>
          <Demonstration m={m} />
        </div>
        <div className={`v-apparait px-1 ${volet === "questions" ? "" : "max-md:hidden"}`} style={{ "--d": "0.3s" } as CSSProperties}>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-steel max-md:hidden">Avant de chiffrer, Compyo demande</p>
          <ul className="mt-3 space-y-2.5 max-md:mt-1">
            {m.exemple.checklist.map((q) => (
              <li key={q} className="flex gap-2.5 text-[14px] leading-snug text-ink/80">
                <span aria-hidden className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-signal" />
                {q}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-steel">Les questions de l&apos;application, mot pour mot.</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-7 max-md:pt-5">
        <p className="text-[12.5px] leading-relaxed text-steel">Devis d&apos;exemple. Dans Compyo, les montants viennent de vos prix.</p>
        {m.fiche.redigee && (
          <Link
            href={`/metiers/${m.fiche.slug}`}
            className="inline-flex items-center gap-2 text-[14px] font-medium text-ink underline decoration-ink/25 underline-offset-4 transition hover:decoration-signal"
          >
            Compyo pour {m.fiche.article} {m.fiche.nom.toLowerCase()}
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </>
  );
}

const FOCUSABLES = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Téléphone : la fiche d'un métier dans une feuille qui monte du bas,
 *  comme dans une application. On la ferme en la tirant vers le bas, avec
 *  la croix, ou en touchant le fond. Dialogue modal : le focus y entre et
 *  y reste, Échap ferme, la page derrière ne défile plus. */
function FeuilleMetier({
  m,
  refVisuel,
  refPanneau,
  surFermer,
}: {
  m: MetierVitrine;
  refVisuel: React.RefObject<HTMLDivElement>;
  refPanneau: React.RefObject<HTMLDivElement>;
  /** `glisse` : fermée du doigt, la feuille est déjà sortie de l'écran —
   *  pas de transition en plus. */
  surFermer: (glisse?: boolean) => void;
}) {
  // Sans View Transitions (ou pour qui demande moins de mouvement), la
  // feuille monte avec sa propre animation ; sinon, c'est la transition qui
  // la fait monter (vitrine.css), et les deux ne doivent pas s'additionner.
  const [animerEntree] = useState(
    () => typeof document === "undefined" || typeof document.startViewTransition !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const fermer = useRef(surFermer);
  fermer.current = surFermer;
  const depart = useRef<number | null>(null);
  const ecart = useRef(0);

  useEffect(() => {
    const panneau = refPanneau.current;
    if (!panneau) return;
    const ancien = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    panneau.querySelector<HTMLElement>("[data-fermer]")?.focus({ preventScroll: true });
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fermer.current();
        return;
      }
      if (e.key !== "Tab") return;
      const liste = [...panneau.querySelectorAll<HTMLElement>(FOCUSABLES)].filter((el) => el.offsetParent !== null);
      if (liste.length === 0) return;
      const premier = liste[0];
      const dernier = liste[liste.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.documentElement.style.overflow = ancien;
    };
  }, [refPanneau]);

  // Tirer la feuille vers le bas par son visuel : elle suit le doigt, et
  // se ferme passé un seuil ; sinon elle remonte à sa place.
  const glisser = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      depart.current = e.clientY;
      ecart.current = 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (refPanneau.current) refPanneau.current.style.transition = "none";
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (depart.current === null || !refPanneau.current) return;
      ecart.current = Math.max(0, e.clientY - depart.current);
      refPanneau.current.style.transform = `translate3d(0, ${ecart.current}px, 0)`;
    },
    onPointerUp: () => {
      if (depart.current === null || !refPanneau.current) return;
      depart.current = null;
      const panneau = refPanneau.current;
      panneau.style.transition = "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
      if (ecart.current > 110) {
        panneau.style.transform = "translate3d(0, 110%, 0)";
        window.setTimeout(() => fermer.current(true), 280);
      } else {
        panneau.style.transform = "";
      }
    },
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:hidden" role="presentation">
      <button type="button" tabIndex={-1} aria-label="Fermer" onClick={() => surFermer()} className="feuille-voile absolute inset-0 cursor-default bg-black/55 backdrop-blur-[3px]" />
      <div
        ref={refPanneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-feuille-metier"
        className={`relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[1.8rem] bg-paper shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.6)] [view-transition-name:metier-feuille] ${
          animerEntree ? "feuille-panneau" : ""
        }`}
      >
        <div className="overflow-y-auto overscroll-contain [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Le visuel sert aussi de poignée. */}
          <div {...glisser} onPointerCancel={glisser.onPointerUp} className="relative touch-none">
            <VisuelFiche m={m} refVisuel={refVisuel} className="aspect-[16/11]" />
            <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70" />
            <button
              type="button"
              data-fermer
              onClick={() => surFermer()}
              aria-label="Fermer la fiche"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div key={m.id} className="flex flex-col px-5 pt-5">
            <CorpsFiche m={m} dansFeuille />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Metiers() {
  const [actif, setActif] = useState(0);
  const [vu, setVu] = useState(false);
  const [reduit, setReduit] = useState(false);
  const [telephone, setTelephone] = useState(false);
  const [ouverte, setOuverte] = useState(false);
  const section = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const cartes = useRef<(HTMLButtonElement | null)[]>([]);
  const visuelFiche = useRef<HTMLDivElement>(null);
  const visuelFeuille = useRef<HTMLDivElement>(null);
  const panneauFeuille = useRef<HTMLDivElement>(null);
  const m = METIERS_VITRINE[actif];

  useEffect(() => {
    setReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const ecran = window.matchMedia("(max-width: 767px)");
    const suivre = () => {
      setTelephone(ecran.matches);
      if (!ecran.matches) setOuverte(false);
    };
    suivre();
    ecran.addEventListener("change", suivre);
    const el = section.current;
    if (!el) return () => ecran.removeEventListener("change", suivre);
    // La fiche rejoue son entrée la première fois qu'on arrive ici :
    // montée au chargement, elle aurait fini de s'animer hors de l'écran.
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVu(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      ecran.removeEventListener("change", suivre);
    };
  }, []);

  const montrerCarte = (i: number) => {
    const carte = cartes.current[i];
    const r = rail.current;
    if (!carte || !r) return;
    const cible = carte.offsetLeft - (r.clientWidth - carte.offsetWidth) / 2;
    r.scrollTo({ left: cible, behavior: reduit ? "auto" : "smooth" });
  };

  /** La carte touchée devient le visuel d'arrivée (fiche ou feuille) :
   *  le navigateur fait grandir l'une jusqu'à l'autre. */
  const transition = (depart: HTMLElement | null | undefined, changer: () => void, arrivee: () => HTMLElement | null | undefined) => {
    if (reduit || !depart || typeof document.startViewTransition !== "function") {
      changer();
      return;
    }
    depart.style.viewTransitionName = NOM_TRANSITION;
    const t = document.startViewTransition(() => {
      flushSync(changer);
      depart.style.viewTransitionName = "";
      const cible = arrivee();
      if (cible) cible.style.viewTransitionName = NOM_TRANSITION;
    });
    t.finished.finally(() => {
      depart.style.viewTransitionName = "";
      const cible = arrivee();
      if (cible) cible.style.viewTransitionName = "";
    });
  };

  const choisir = (i: number) => {
    const visuelCarte = cartes.current[i]?.querySelector<HTMLElement>("[data-visuel]");
    // Téléphone : la carte s'ouvre en feuille.
    if (telephone) {
      transition(
        visuelCarte,
        () => {
          setActif(i);
          setOuverte(true);
        },
        () => visuelFeuille.current
      );
      return;
    }
    if (i === actif) return;
    montrerCarte(i);
    transition(visuelCarte, () => setActif(i), () => visuelFiche.current);
  };

  const fermerFeuille = (glisse = false) => {
    const carte = cartes.current[actif];
    if (glisse) {
      setOuverte(false);
      carte?.focus({ preventScroll: true });
      return;
    }
    transition(
      visuelFeuille.current,
      () => setOuverte(false),
      () => carte?.querySelector<HTMLElement>("[data-visuel]")
    );
    carte?.focus({ preventScroll: true });
  };

  const auClavier = (e: React.KeyboardEvent, i: number) => {
    const dernier = METIERS_VITRINE.length - 1;
    let cible: number | null = null;
    if (e.key === "ArrowRight") cible = i === dernier ? 0 : i + 1;
    if (e.key === "ArrowLeft") cible = i === 0 ? dernier : i - 1;
    if (e.key === "Home") cible = 0;
    if (e.key === "End") cible = dernier;
    if (cible === null) return;
    e.preventDefault();
    choisir(cible);
    cartes.current[cible]?.focus({ preventScroll: true });
  };

  const defiler = (sens: 1 | -1) => {
    const r = rail.current;
    if (r) r.scrollBy({ left: sens * r.clientWidth * 0.75, behavior: reduit ? "auto" : "smooth" });
  };

  return (
    <div ref={section}>
      {/* Le rail — sur téléphone, deux rangées : cinq métiers à l'écran au
          lieu de deux, le sien se trouve en un ou deux glissements. */}
      <div className="relative">
        <div className="mb-3 hidden justify-end gap-2 sm:flex">
          {([-1, 1] as const).map((sens) => (
            <button
              key={sens}
              type="button"
              onClick={() => defiler(sens)}
              aria-label={sens === 1 ? "Métiers suivants" : "Métiers précédents"}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface text-ink shadow-[var(--v-ombre-legere)] ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d={sens === 1 ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
        <div
          ref={rail}
          role={telephone ? "group" : "tablist"}
          aria-label="Choisissez votre métier"
          className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-8 pt-3 [scrollbar-width:none] max-md:grid max-md:grid-flow-col max-md:grid-rows-2 max-md:gap-2.5 max-md:pb-4 max-md:pt-1 sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 xl:mr-[calc(50%-50vw)] [&::-webkit-scrollbar]:hidden"
        >
          {METIERS_VITRINE.map((metier, i) => (
            <Carte
              key={metier.id}
              m={metier}
              choisie={i === actif}
              telephone={telephone}
              onChoisir={() => choisir(i)}
              onClavier={(e) => auClavier(e, i)}
              refBouton={(el) => {
                cartes.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>

      {/* La fiche — ordinateur et tablette. Sur téléphone, elle s'ouvre
          dans une feuille. */}
      <div
        id="fiche-metier"
        role="tabpanel"
        aria-labelledby={`onglet-${m.id}`}
        className="grid gap-6 rounded-[2rem] bg-surface p-3 shadow-[var(--v-ombre)] ring-1 ring-ink/[0.06] max-md:hidden sm:p-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10 lg:p-6"
      >
        <VisuelFiche m={m} refVisuel={visuelFiche} className="aspect-[16/10] rounded-[1.5rem] lg:aspect-auto lg:min-h-[36rem]" />
        <div key={`${m.id}-${vu}`} className="flex flex-col px-2 pb-3 pt-1 sm:px-2 lg:py-4 lg:pr-4">
          <CorpsFiche m={m} />
        </div>
      </div>

      {telephone && ouverte && (
        <FeuilleMetier m={m} refVisuel={visuelFeuille} refPanneau={panneauFeuille} surFermer={fermerFeuille} />
      )}
    </div>
  );
}
