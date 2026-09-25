import Link from "next/link";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { DeuxSoirees } from "./DeuxSoirees";
import { CadrePhoto } from "./CadrePhoto";
import { PHOTOS } from "./photos";

// ============================================================
// Les sections courtes de l'accueil (24/09) : la comparaison des deux
// soirées, la démonstration filmée, et la dernière section, « 19:04 ».
// ============================================================

function Surtitre({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">{children}</p>;
}

export function SectionDeuxSoirees() {
  // Sur téléphone, le titre voyage avec la table épinglée (DeuxSoirees).
  return (
    <section
      id="deux-soirees"
      aria-labelledby="titre-soirees"
      className="scroll-mt-16 px-5 pb-8 pt-24 max-md:px-0 max-md:pb-0 max-md:pt-6 sm:px-8 sm:pt-36"
    >
      <div className="mx-auto max-w-7xl">
        <DeuxSoirees
          entete={
            <>
              <Surtitre>Le soir</Surtitre>
              <h2
                id="titre-soirees"
                className="mt-6 max-w-4xl text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink max-md:mt-3 max-md:text-[2.3rem] sm:text-7xl"
              >
                Même journée. Deux soirées.
              </h2>
            </>
          }
        />
      </div>
    </section>
  );
}

const DESCRIPTION_DEMO =
  "Démonstration filmée dans l'application : un message de client partagé vers Compyo crée le projet, une note dictée sur le chantier le complète, le devis se prépare avec les tarifs de l'artisan, puis part à la signature.";

export function SectionEnVrai() {
  return (
    <section aria-labelledby="titre-en-vrai" className="px-5 py-24 max-md:pb-12 max-md:pt-16 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div data-revele>
            <Surtitre>En vrai</Surtitre>
            <h2
              id="titre-en-vrai"
              className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink sm:text-7xl"
            >
              Une minute. Sans coupe.
            </h2>
          </div>
          <p className="max-w-xs text-[16px] leading-relaxed text-ink/60 max-md:hidden">
            Le même parcours, filmé dans l&apos;application.
          </p>
        </div>

        {/* Paysage à partir de sm ; en dessous la version verticale : en
            16:9 sur un téléphone, le devis serait illisible. Un lecteur
            masqué ne télécharge rien (preload="none", lecture à l'écran). */}
        <div className="mt-12 hidden sm:block">
          <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-paper-warm shadow-[var(--v-ombre)] ring-1 ring-ink/10">
            <VideoDemo src="/compyo-demo.mp4" affiche="/compyo-demo-affiche.jpg" description={DESCRIPTION_DEMO} />
          </div>
        </div>
        {/* Téléphone : la vidéo verticale en pleine largeur, comme un
            réel — la plus grande image de la page. */}
        <div data-sans-barre data-revele className="mx-auto mt-8 max-w-[26rem] sm:hidden">
          <div className="aspect-[9/16] max-h-[calc(100svh-6rem)] overflow-hidden rounded-[1.8rem] bg-paper-warm shadow-[var(--v-ombre)] ring-1 ring-ink/10 max-md:mx-auto">
            <VideoDemo
              src="/compyo-demo-vertical.mp4"
              affiche="/compyo-demo-vertical-affiche.jpg"
              description={DESCRIPTION_DEMO}
            />
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-steel max-md:mt-4 max-md:text-[12.5px]">
          Reconstitution d&apos;un parcours réel dans l&apos;application, sans étape coupée.
        </p>
      </div>
    </section>
  );
}

export function SectionSoiree() {
  return (
    <section aria-labelledby="titre-soiree" className="relative isolate overflow-hidden bg-[#17120f] text-white">
      {PHOTOS.soiree ? (
        <CadrePhoto photo={PHOTOS.soiree} voile="soiree" className="absolute inset-0 -z-10" />
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="v-ciel absolute inset-0" />
          <div className="v-soleil-couchant absolute left-1/2 top-full h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-[38%] rounded-full sm:h-[48rem] sm:w-[48rem]" />
        </div>
      )}

      <div className="mx-auto max-w-4xl px-5 pb-40 pt-32 text-center max-md:flex max-md:min-h-[100svh] max-md:flex-col max-md:justify-center max-md:pb-24 max-md:pt-20 sm:px-8 sm:pb-56 sm:pt-44">
        <p className="font-mono text-[13px] tracking-[0.2em] text-white/60">19:04</p>
        <h2
          id="titre-soiree"
          className="mt-6 text-balance font-display text-[3rem] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-8xl"
        >
          La soirée est à vous.
        </h2>
        <p className="mx-auto mt-8 max-w-md text-[17px] leading-relaxed text-white/70 sm:text-lg">
          Compyo est en bêta privée, gratuite. Chaque candidature est lue.
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
          <Link
            href="/demander-acces"
            data-cache-barre
            className="rounded-full bg-signal px-9 py-4 text-[15px] font-medium text-white shadow-[0_14px_40px_-12px_rgb(201_107_74/0.95)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17120f]"
          >
            Rejoindre la bêta
          </Link>
          <Link
            href="/installer"
            className="text-[15px] font-medium text-white/85 underline decoration-white/30 underline-offset-8 transition-colors hover:decoration-white"
          >
            Installer l&apos;application
          </Link>
        </div>
        <p className="mt-8 font-mono text-[11px] tracking-wide text-white/45">Sur candidature · réponse sous 48 h</p>
      </div>
    </section>
  );
}
