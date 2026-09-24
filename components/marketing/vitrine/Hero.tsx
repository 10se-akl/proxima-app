import Link from "next/link";
import { TelephoneSoir } from "./TelephoneSoir";
import { CadrePhoto } from "./CadrePhoto";
import { PHOTOS } from "./photos";

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
// ============================================================

function LumiereFenetre() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
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

export function Hero() {
  return (
    <section className="v-mur relative overflow-hidden">
      {PHOTOS.hero ? (
        <CadrePhoto photo={PHOTOS.hero} priorite className="absolute inset-0" voile="hero" />
      ) : (
        <LumiereFenetre />
      )}

      <div className="relative mx-auto grid max-w-7xl items-center gap-y-16 px-5 pb-20 pt-14 max-md:gap-y-9 max-md:pb-0 max-md:pt-9 sm:px-8 sm:pt-20 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12 lg:py-24">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">
            Bêta privée · artisans du bâtiment
          </p>
          {/* Taille pensée pour que la phrase tombe en trois ou quatre
              lignes équilibrées à chaque palier (text-balance) — jamais un
              mot orphelin sur la dernière. */}
          <h1 className="mt-7 text-balance max-md:mt-5 font-display text-[2.9rem] font-semibold leading-[0.98] tracking-[-0.035em] text-ink sm:text-7xl lg:text-[5.2rem] xl:text-[6rem]">
            Vos soirées ne sont pas faites pour la paperasse.
          </h1>
          <p className="mt-9 max-w-xl text-balance font-display max-md:mt-6 text-[1.35rem] font-medium leading-snug tracking-[-0.01em] text-ink sm:text-[1.7rem]">
            Compyo est votre compagnon administratif.
          </p>
          <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-ink/60 sm:text-lg">
            Du premier message du client à la facture réglée.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-5 max-md:mt-8">
            <Link
              href="/demander-acces"
              className="rounded-full bg-signal px-8 py-4 text-[15px] font-medium text-white shadow-[0_10px_30px_-12px_rgb(201_107_74/0.9)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Rejoindre la bêta
            </Link>
            <Link
              href="#journee"
              className="group inline-flex items-center gap-2 text-[15px] font-medium text-ink"
            >
              <span className="underline decoration-ink/25 underline-offset-8 transition-colors group-hover:decoration-ink">
                Voir une journée
              </span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
            </Link>
          </div>
          <p className="mt-8 font-mono text-[11px] tracking-wide text-steel max-md:mt-6">
            Sur candidature · réponse sous 48 h
          </p>
        </div>

        <div className="relative mx-auto w-[min(18.5rem,76vw)] max-md:h-[min(112vw,28rem)] max-md:w-[min(20rem,80vw)] max-md:overflow-hidden max-md:pt-2 max-md:[mask-image:linear-gradient(to_bottom,black_72%,transparent)] sm:w-[20rem] xl:w-[21.5rem]">
          <TelephoneSoir />
        </div>
      </div>
    </section>
  );
}
