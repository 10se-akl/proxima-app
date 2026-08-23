import { Reveal, SectionLabel } from "./LandingPage";

// ============================================================
// Mettre l'URL ici (ex: un lien Mux/YouTube/Vimeo non-listé, ou un
// fichier .mp4 dans /public) quand la vraie vidéo de démo existe.
// Tant que c'est null, un placeholder élégant s'affiche à la place —
// aucun autre changement n'est nécessaire ailleurs : renseigner cette
// constante suffit à faire apparaître le vrai lecteur.
// ============================================================
const URL_VIDEO_DEMO: string | null = null;

// Détection très simple : si l'URL renseignée pointe vers YouTube ou
// Vimeo, on utilise un <iframe> plutôt qu'une balise <video> (ces
// plateformes ne servent pas de fichier vidéo brut lisible nativement).
// Sinon (fichier .mp4 dans /public, ou lien direct type Mux), on suppose
// un fichier vidéo classique.
function estUrlIntegration(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function SectionDemoVideo() {
  const videoDisponible = URL_VIDEO_DEMO !== null;

  return (
    <section className="bg-paper">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal className="text-center">
          <SectionLabel>Démonstration</SectionLabel>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Compyo, en 2 minutes.
          </h2>
          <p className="mt-4 text-ink/60 max-w-md mx-auto leading-relaxed">
            {videoDisponible
              ? "Le tour du propriétaire, sans détour."
              : "La vidéo arrive bientôt — en attendant, demandez un accès pour découvrir Compyo en direct."}
          </p>

          {videoDisponible ? (
            <a
              href="#demo-video"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
            >
              Voir une démonstration de 2 minutes
            </a>
          ) : (
            // Pas de vraie vidéo : le bouton reste visible (cohérence
            // visuelle avec le reste du site) mais désactivé et honnête,
            // plutôt qu'un lien mort ou une fausse promesse de lecture.
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 text-ink/40 font-medium px-7 py-3.5 cursor-not-allowed"
              title="Vidéo bientôt disponible"
            >
              Voir une démonstration de 2 minutes
            </button>
          )}
        </Reveal>

        <Reveal delay={100} className="mt-14">
          <div id="demo-video" className="max-w-4xl mx-auto scroll-mt-24">
            {videoDisponible ? (
              <LecteurVideo url={URL_VIDEO_DEMO as string} />
            ) : (
              <PlaceholderVideo />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LecteurVideo({ url }: { url: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-ink/10 bg-anthracite">
      {estUrlIntegration(url) ? (
        <iframe
          src={url}
          title="Démonstration de Compyo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <video src={url} controls className="w-full h-full" />
      )}
    </div>
  );
}

// ============================================================
// Placeholder honnête : cadre au même ratio que le futur lecteur, fond
// décoratif façon DemoPanel (grille technique + halo de marque très
// doux), et un bouton play qui ne déclenche jamais rien — juste un
// aperçu visuel de ce que sera la section, sans jamais laisser croire
// qu'une vidéo existe déjà.
// ============================================================
function PlaceholderVideo() {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-ink/10 bg-surface">
      {/* Grille technique discrète */}
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
      {/* Halo doux, couleur de marque */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgb(var(--c-signal) / 0.05), transparent 55%)",
        }}
      />

      <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Vidéo de démonstration bientôt disponible"
          title="Vidéo bientôt disponible"
          className="group grid place-items-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-signal text-white shadow-lg shadow-signal/20 transition-transform duration-300 hover:scale-110 cursor-default"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="w-8 h-8 sm:w-9 sm:h-9 translate-x-0.5"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-ink/40">
          Bientôt disponible
        </span>
      </div>
    </div>
  );
}
