"use client";

import { DemoPanel } from "./DemoPanel";
import { Reveal, SectionLabel } from "./Cadre";

// ============================================================
// Section dédiée "Planning" — remplace la carte générique de la grille
// Solutions par un vrai traitement démo : rendez-vous ET tâches dans un
// seul agenda, rattachés au bon projet, avec une détection de conflit
// d'horaire réelle (pas juste un argument marketing).
// ============================================================
export function DemoPlanning() {
  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <SectionLabel>Planning</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-lg">
            Un seul agenda pour les rendez-vous et les tâches.
          </h2>
          <p className="mt-5 text-base text-ink/60 max-w-md leading-relaxed">
            Un rendez-vous chez un client, une tâche à faire avant midi — &laquo; relancer
            Durand &raquo;, &laquo; envoyer le devis Martin &raquo; — tout vit dans le même
            planning, rattaché automatiquement au bon chantier. Plus besoin de jongler entre
            un agenda et un pense-bête.
          </p>
          <p className="mt-4 text-base text-ink/60 max-w-md leading-relaxed">
            Et impossible de se retrouver à deux endroits en même temps : Compyo détecte le
            conflit d&apos;horaire avant même que le rendez-vous soit enregistré.
          </p>
        </Reveal>

        <DemoPanel>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
              Aujourd&apos;hui — mardi
            </p>
            <span className="font-mono text-[10px] text-ink/30">4 créneaux</span>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-4 rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm">
              <span className="font-mono text-[11px] text-steel w-11 shrink-0">9h00</span>
              <span className="w-2 h-2 rounded-full bg-signal shrink-0" />
              <span className="flex-1">RDV — Sophie Martin, salle de bain</span>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm">
              <span className="font-mono text-[11px] text-steel w-11 shrink-0">11h00</span>
              <span className="w-2 h-2 rounded-full bg-[#D9861A] shrink-0" />
              <span className="flex-1">Tâche — Envoyer devis Durand</span>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm">
              <span className="font-mono text-[11px] text-steel w-11 shrink-0">14h30</span>
              <span className="w-2 h-2 rounded-full bg-[#2F8F5B] shrink-0" />
              <span className="flex-1">RDV — Nicolas Girard, chaudière</span>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm opacity-60">
              <span className="font-mono text-[11px] text-steel w-11 shrink-0">17h00</span>
              <span className="w-2 h-2 rounded-full bg-signal/60 shrink-0" />
              <span className="flex-1">Tâche — Relancer Amandine Roy</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-signal/25 bg-signal/[0.06] p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-signal mb-1.5">
              Conflit détecté
            </p>
            <p className="text-xs text-ink/70 leading-relaxed">
              Nouveau RDV 14h45 impossible — chevauche Nicolas Girard (14h30-15h15).
              Choisissez un autre créneau.
            </p>
          </div>
        </DemoPanel>
      </div>
    </section>
  );
}
