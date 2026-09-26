import Link from "next/link";
import { TelephoneSoir } from "./TelephoneSoir";
import { EcranSoir } from "./EcranSoir";
import { CadrePhoto } from "./CadrePhoto";
import { PHOTOS } from "./photos";
import { FondParticules } from "./FondParticules";

// ============================================================
// Le hero (24/09). Un résultat, pas une technologie : le mot « IA »
// n'apparaît pas ici. Trois temps, dans cet ordre, lisibles en cinq
// secondes :
//   1. la promesse (le titre, immense) ;
//   2. ce qu'est Compyo, en une phrase ;
//   3. son périmètre, en une ligne.
// À côté, la preuve : un écran verrouillé à 19h04 où l'administratif de
// la journée est déjà fait.
//
// Le mur et la lumière de fenêtre sont en CSS (voir vitrine.css). Le jour
// où une vraie photo arrive (photos.ts, emplacement "hero"), elle prend
// la place du mur, sans rien changer d'autre.
//
// Téléphone (25/09) : un autre écran, pas le même en plus petit. Tout
// l'écran devient le soir de l'artisan — le ciel, la promesse, puis les
// notifications de Compyo à leur vraie taille (EcranSoir.tsx), et le
// bouton d'inscription en bas, sous le pouce. Le téléphone dessiné et le
// mur n'existent que sur les écrans plus larges.
// ============================================================

function LumiereFenetre() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden max-md:hidden">
      <div className="v-halo" />
      <div className="v-fenetre">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/** Téléphone : le ciel du soir, le soleil bas qui respire lentement. */
function CielSoir() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden md:hidden">
      <div className="v-ciel-hero absolute inset-0" />
      <div className="v-soleil-hero absolute left-1/2 top-full h-[150vw] w-[150vw] -translate-x-1/2 -translate-y-[42%] rounded-full" />
    </div>
  );
}

const CLASSE_CTA =
  "rounded-full bg-signal px-8 py-4 text-[15px] font-medium text-white shadow-[0_10px_30px_-12px_rgb(201_107_74/0.9)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function Hero() {
  return (
    <section className="v-mur relative overflow-hidden max-md:bg-[#17110e]">
      {PHOTOS.hero ? (
        <CadrePhoto photo={PHOTOS.hero} priorite className="absolute inset-0 max-md:hidden" voile="hero" />
      ) : (
        <LumiereFenetre />
      )}
      <CielSoir />
      {/* 27/09 — Le nuage de particules, derrière le texte (voir
          FondParticules.tsx : léger, en pause hors de l'écran). */}
      <FondParticules />

      <div className="relative mx-auto grid max-w-7xl items-center gap-y-16 px-5 pb-20 pt-14 max-md:flex max-md:min-h-[calc(100svh-4rem)] max-md:flex-col max-md:items-stretch max-md:gap-y-0 max-md:pb-5 max-md:pt-7 sm:px-8 sm:pt-20 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12 lg:py-24">
        <div className="v-hero-texte">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel max-md:text-white/50">
            Bêta privée · artisans du bâtiment
          </p>
          {/* Taille pensée pour que la phrase tombe en trois ou quatre
              lignes équilibrées à chaque palier (text-balance) — jamais un
              mot orphelin sur la dernière. */}
          <h1 className="mt-7 text-balance font-display text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.035em] text-ink max-md:mt-4 max-md:text-[2.75rem] max-md:text-white sm:text-7xl lg:text-[5.2rem] xl:text-[6rem]">
            Vos soirées ne sont pas faites pour la paperasse.
          </h1>
          <p className="mt-9 max-w-xl text-balance font-display text-[1.35rem] font-medium leading-snug tracking-[-0.01em] text-ink max-md:mt-5 max-md:text-[1.2rem] max-md:text-white/90 sm:text-[1.7rem]">
            Compyo est votre compagnon administratif.
          </p>
          <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-ink/60 max-md:mt-1.5 max-md:text-[15px] max-md:leading-snug max-md:text-white/60 sm:text-lg">
            Du premier message du client à la facture réglée.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-5 max-md:hidden">
            <Link href="/demander-acces" className={CLASSE_CTA}>
              Rejoindre la bêta
            </Link>
            <Link href="#journee" className="group inline-flex items-center gap-2 text-[15px] font-medium text-ink">
              <span className="underline decoration-ink/25 underline-offset-8 transition-colors group-hover:decoration-ink">
                Voir une journée
              </span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
            </Link>
          </div>
          <p className="mt-8 font-mono text-[11px] tracking-wide text-steel max-md:hidden">
            Sur candidature · réponse sous 48 h
          </p>
        </div>

        {/* Ordinateur et tablette : le téléphone dessiné. */}
        <div className="relative mx-auto w-[min(18.5rem,76vw)] max-md:hidden sm:w-[20rem] xl:w-[21.5rem]">
          <TelephoneSoir />
        </div>

        {/* Téléphone : l'écran verrouillé, puis l'inscription sous le pouce. */}
        <div className="mt-8 flex flex-1 flex-col md:hidden">
          <EcranSoir />
          <div className="mt-auto pt-5">
            <Link
              id="cta-hero"
              data-cache-barre
              href="/demander-acces"
              className="flex w-full items-center justify-center rounded-full bg-signal py-4 text-[16px] font-semibold text-white shadow-[0_14px_36px_-12px_rgb(201_107_74/0.95)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Rejoindre la bêta
            </Link>
            <div className="mt-3.5 flex items-center justify-between px-1">
              <p className="font-mono text-[10.5px] tracking-wide text-white/45">Sur candidature · réponse sous 48 h</p>
              <Link href="#deux-soirees" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-white/75">
                La suite
                <svg viewBox="0 0 16 16" className="v-rebond h-3.5 w-3.5" fill="none" aria-hidden>
                  <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
