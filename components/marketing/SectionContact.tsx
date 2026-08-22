import { Reveal, SectionLabel } from "./LandingPage";

// ============================================================
// Nous contacter — Compyo est un projet solo en bêta privée,
// pas une entreprise avec une équipe support. Cette section reste
// honnête : un email direct, pas de formulaire qui ne mène nulle part,
// pas de promesse de support 24/7.
// ============================================================

export function SectionContact() {
  return (
    <section id="contact" className="bg-paper">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <SectionLabel>Nous contacter</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight">
            Une question ? Écrivez-nous directement.
          </h2>
          <p className="mt-5 text-base text-ink/60 leading-relaxed">
            Compyo est encore un petit projet en bêta privée — pas une grosse équipe support.
            Mais chaque message est lu et vous aurez une vraie réponse, rapidement.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <a
            href="mailto:proxima.saas@gmail.com?subject=Question%20sur%20Compyo"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
          >
            Nous écrire à proxima.saas@gmail.com
          </a>
        </Reveal>
      </div>
    </section>
  );
}
