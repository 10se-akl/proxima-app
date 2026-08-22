"use client";

import { DemoPanel } from "./DemoPanel";
import { Reveal, SectionLabel } from "./LandingPage";

// Section dédiée aux notes vocales + résumé de fin de journée — remplace
// la carte "Notes vocales" de l'ancienne grille Solutions. Mockup à gauche
// (DemoPanel), texte à droite : alterne avec DemoDevis (texte à gauche),
// DemoImport et DemoPlanning pour que les 4 sections ne se répètent pas
// visuellement une fois mises bout à bout sur la page.
export function DemoNotesVocales() {
  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div className="lg:order-1">
          <DemoPanel>
            <MockupNoteVocale />
          </DemoPanel>
        </div>

        <Reveal className="lg:order-2">
          <SectionLabel>Notes vocales</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-balance">
            Dictez sur la route. Compyo transcrit, range et résume.
          </h2>
          <p className="mt-5 text-base text-ink/60 max-w-md leading-relaxed">
            En sortant d&apos;un rendez-vous, dictez l&apos;essentiel — Compyo transcrit
            automatiquement et rattache la note au bon chantier. Aucun fichier audio n&apos;est
            conservé.
          </p>
          <p className="mt-3 text-base text-ink/60 max-w-md leading-relaxed">
            En fin de journée, l&apos;IA prépare un résumé factuel : qui a besoin d&apos;un devis,
            qui attend encore une réponse, quel chantier urgent n&apos;a pas de rendez-vous.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// Maquette : une note vocale en cours de transcription, suivie du résumé
// de fin de journée que l'IA en tire — même style que MockupProduit dans
// LandingPage.tsx (rounded-2xl, bordures ink/10, tokens de couleur).
function MockupNoteVocale() {
  return (
    <div className="rounded-2xl border border-ink/10 bg-surface shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink/10 bg-paper/60">
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="ml-3 font-mono text-[11px] text-ink/50">Note vocale — chantier Dupont</span>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="relative shrink-0 grid place-items-center w-10 h-10 rounded-full bg-signal/10 text-signal">
            <span aria-hidden className="absolute inset-0 rounded-full bg-signal/20 animate-ping" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
              Transcription en cours
            </p>
            <p className="font-mono text-[10px] text-ink/30">00:14</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-paper p-4">
          <p className="text-sm text-ink/70 leading-relaxed">
            &laquo; Douche italienne, 4m², accès facile. Il manque encore le choix de la
            robinetterie avant de finaliser le devis. &raquo;
          </p>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel mb-2">
            Résumé de fin de journée — IA
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-ink/10 px-4 py-3 text-sm">
              <span className="shrink-0">⚠️</span>
              <span className="text-ink/70">
                <strong className="text-ink">Dupont</strong> — dossier urgent, toujours pas de
                rendez-vous prévu.
              </span>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-ink/10 px-4 py-3 text-sm">
              <span className="shrink-0">💬</span>
              <span className="text-ink/70">
                <strong className="text-ink">Sophie Martin</strong> attend une réponse depuis 3
                jours.
              </span>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-ink/10 px-4 py-3 text-sm opacity-70">
              <span className="shrink-0">📄</span>
              <span className="text-ink/70">
                <strong className="text-ink">Julien Roche</strong> a besoin d&apos;un devis.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
