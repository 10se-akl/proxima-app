import { DemoPanel } from "@/components/marketing/DemoPanel";
import { Reveal, SectionLabel } from "@/components/marketing/LandingPage";

// Section dédiée à la génération de devis — l'IA propose les postes à
// partir de la description du projet, mais ne fixe jamais les prix : un
// moteur de calcul déterministe s'en charge, selon les paramètres propres
// à l'artisan (coût horaire, TVA, marge...). Le mockup ci-contre illustre
// un devis généré, pas une simulation de chat IA — c'est le résultat qui
// compte, pas le processus.
export function DemoDevis() {
  const points = [
    "L'IA lit la description du chantier et propose les postes de travaux, avec quantités et unités cohérentes.",
    "Les prix ne sont jamais inventés par l'IA : un moteur de calcul applique votre coût horaire, votre marge et la TVA.",
    "Un devis structuré, prêt à envoyer, en quelques secondes plutôt qu'en fin de journée.",
  ];

  return (
    <section className="bg-paper">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <SectionLabel>Préparation des devis</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-balance">
            L&apos;IA rédige les postes.
            <br />
            Le calcul fixe les prix.
          </h2>
          <p className="mt-5 text-ink/70 leading-relaxed max-w-md">
            À partir de la description du projet — notes, photos, message client — Compyo propose
            une liste de postes de travaux cohérente. Les montants, eux, viennent toujours d&apos;un
            moteur de calcul déterministe, réglé sur vos propres paramètres. Jamais l&apos;IA.
          </p>

          <ul className="mt-8 flex flex-col gap-3.5">
            {points.map((texte) => (
              <li key={texte} className="flex gap-3 text-sm text-ink/70 leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-signal shrink-0" />
                {texte}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="order-2 lg:order-2">
          <DemoPanel>
            <div className="rounded-2xl border border-ink/10 bg-surface shadow-xl shadow-ink/[0.06] overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-ink/10 bg-paper/60">
                <span className="font-mono text-[11px] text-ink/50">Devis n°2026-0142</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-signal">
                  Brouillon
                </span>
              </div>

              <div className="p-6">
                <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
                  Sophie Martin — Salle de bain
                </p>

                <div className="mt-4 flex flex-col divide-y divide-ink/10">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 py-2.5 text-[11px] font-mono uppercase tracking-wider text-ink/40">
                    <span>Description</span>
                    <span className="text-right">Qté</span>
                    <span className="text-right">Prix</span>
                  </div>
                  {[
                    { d: "Dépose ancienne baignoire", q: "1 u", p: "180 €" },
                    { d: "Fourniture et pose receveur extra-plat", q: "1 u", p: "620 €" },
                    { d: "Étanchéité + faïence murale", q: "4 m²", p: "540 €" },
                    { d: "Robinetterie thermostatique", q: "1 u", p: "310 €" },
                  ].map((ligne) => (
                    <div
                      key={ligne.d}
                      className="grid grid-cols-[1fr_auto_auto] gap-3 py-3 text-sm items-center"
                    >
                      <span className="text-ink/80">{ligne.d}</span>
                      <span className="text-right text-ink/50 font-mono text-xs">{ligne.q}</span>
                      <span className="text-right font-mono text-xs text-ink/70">{ligne.p}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-paper p-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
                      Total TTC — TVA 10%
                    </p>
                    <p className="text-[11px] text-ink/40 mt-0.5">Calculé selon vos paramètres</p>
                  </div>
                  <span className="font-display text-xl font-semibold text-ink">1 815 €</span>
                </div>
              </div>
            </div>
          </DemoPanel>
        </div>
      </div>
    </section>
  );
}
