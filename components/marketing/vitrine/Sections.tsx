import Link from "next/link";
import { VideoDemo } from "@/components/marketing/VideoDemo";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";
import { CadrePhoto } from "./CadrePhoto";
import { PHOTOS } from "./photos";
import { Engagements } from "@/components/confiance/Engagements";

// ============================================================
// Les sections courtes de l'accueil (24/09) : le film, et la dernière
// section, « 19:04 ». (La comparaison des deux soirées a été retirée le
// 13/10 ; « En vrai » et ses deux anciennes démos, le 18/10 : le film
// d'une minute fait leur travail.)
// ============================================================

function Surtitre({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-steel">{children}</p>;
}

// Le film (18/10) : rendu image par image depuis compyo/pub-motion/film-1min
// (film.html, rendu.mjs), en paysage et en vertical. Les écrans sont ceux
// de l'application, reconstruits avec des données fictives.
const FILM = {
  paysage: { src: "/compyo-film.mp4", affiche: "/compyo-film-affiche.jpg" },
  vertical: { src: "/compyo-film-vertical.mp4", affiche: "/compyo-film-vertical-affiche.jpg" },
  duree: "PT1M3S",
};

const DESCRIPTION_FILM =
  "Film d'une minute, sans son, sur un seul chantier : le message de la cliente devient un projet, l'artisan dicte une note sur place, relit et corrige le devis préparé par Compyo, l'envoie depuis son téléphone ; la cliente signe, le chantier se planifie, la facture part du devis signé, un rappel de paiement est prêt à relire. Le soir, tout est réglé. Données fictives de démonstration.";

// Ce que dit et montre le film, moment par moment : pour qui ne le voit
// pas, et pour qui préfère lire.
const MOMENTS: [string, string][] = [
  ["07:48", "Mme Garnier écrit : une fuite sous l'évier. Vous partagez son message vers Compyo, qui lit le nom, le téléphone, l'adresse et la demande. Vous vérifiez, vous créez le projet."],
  ["10:15", "Sur place, vous dictez une note et prenez trois photos. Tout se range dans le projet."],
  ["12:30", "Compyo prépare le devis avec vos tarifs. Vous corrigez la main-d'œuvre (3 h → 4 h), puis vous validez : 387,20 € TTC."],
  ["12:34", "Vous envoyez le devis par SMS, depuis votre téléphone."],
  ["15:10", "Mme Garnier le lit et le signe sur son téléphone. Dans Compyo, le projet passe à « Signé »."],
  ["17:20", "Vous planifiez le chantier pour le lendemain matin et prévenez la cliente."],
  ["Mercredi, 11:40", "Le chantier est terminé : vous créez la facture de solde, numérotée, à partir du devis signé."],
  ["11:42", "Un rappel de paiement est déjà écrit pour une autre facture en retard. Vous le relisez, vous l'envoyez."],
  ["19:04", "Tout est réglé. Vos soirées ne sont pas faites pour la paperasse."],
];

export function SectionFilm() {
  return (
    <section id="film" aria-labelledby="titre-film" className="scroll-mt-16 px-5 py-24 max-md:pb-12 max-md:pt-16 sm:px-8 sm:py-32">
      <JsonLd
        donnees={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: "Compyo, un chantier en une minute",
          description: DESCRIPTION_FILM,
          duration: FILM.duree,
          thumbnailUrl: [`${SITE_URL}${FILM.paysage.affiche}`, `${SITE_URL}${FILM.vertical.affiche}`],
          contentUrl: `${SITE_URL}${FILM.paysage.src}`,
          inLanguage: "fr-FR",
        }}
      />
      <div className="mx-auto max-w-6xl">
        <div data-revele className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <Surtitre>En une minute</Surtitre>
            <h2
              id="titre-film"
              className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.035em] text-ink max-md:mt-3 max-md:text-[2.3rem] sm:text-7xl"
            >
              Le même chantier, en entier.
            </h2>
          </div>
          <p className="max-w-xs text-[16px] leading-relaxed text-ink/60 max-md:hidden">
            Du premier message à la facture, sans coupe.
          </p>
        </div>

        {/* Un seul lecteur, deux cadrages : vertical sur téléphone (la plus
            grande image de la page, comme un réel), paysage au-dessus de
            640 px. La place est réservée : rien ne saute au chargement. */}
        <div
          data-sans-barre
          className="mx-auto mt-8 aspect-[9/16] w-[min(100%,26rem,calc((100svh-7rem)*0.5625))] overflow-hidden rounded-[1.8rem] bg-paper-warm shadow-[var(--v-ombre)] ring-1 ring-ink/10 sm:mt-12 sm:aspect-video sm:w-full sm:rounded-[2rem]"
        >
          <VideoDemo
            src={FILM.paysage.src}
            affiche={FILM.paysage.affiche}
            vertical={FILM.vertical}
            description={DESCRIPTION_FILM}
          />
        </div>
        <p className="mt-5 text-center text-[13px] text-steel max-md:mt-4 max-md:text-[12.5px]">
          Les écrans de l&apos;application, reconstitués avec des données fictives de démonstration. Sans son.
        </p>

        <details className="mx-auto mt-6 max-w-2xl rounded-2xl bg-surface/70 px-5 ring-1 ring-ink/10">
          <summary className="flex min-h-12 cursor-pointer items-center text-[15px] font-medium text-ink">
            Lire ce que montre le film
          </summary>
          <ol className="pb-5">
            {MOMENTS.map(([heure, texte]) => (
              <li key={heure} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-t border-ink/10 py-3 text-[15px] leading-snug max-sm:grid-cols-1 max-sm:gap-1">
                <span className="font-mono text-[12.5px] text-steel">{heure}</span>
                <span className="text-ink/80">{texte}</span>
              </li>
            ))}
          </ol>
        </details>
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
            className="inline-flex min-h-11 items-center text-[15px] font-medium text-white/85 underline decoration-white/30 underline-offset-8 transition-colors hover:decoration-white"
          >
            Installer l&apos;application
          </Link>
        </div>
        <p className="mt-8 font-mono text-[11px] tracking-wide text-white/45">Sur candidature · réponse sous 48 h</p>
        {/* Lot G — à côté de l'appel à rejoindre la bêta, derrière son
            drapeau (lib/confiance.ts). */}
        <Engagements ton="sombre" className="mx-auto mt-10 max-w-sm" />
      </div>
    </section>
  );
}
