"use client";

import { DemoPanel } from "@/components/marketing/DemoPanel";
import { Reveal, SectionLabel } from "@/components/marketing/Cadre";

// Section dédiée à l'import automatique : l'artisan colle un message reçu
// (SMS/WhatsApp/mail) ou une capture d'écran de conversation, et Compyo en
// extrait le client, le besoin, et une proposition de rendez-vous s'il y a
// une date — sans ressaisie. Le mockup à gauche simule ce collage suivi du
// résultat, le texte à droite explique le principe.
export function DemoImport() {
  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div className="lg:order-1">
          <DemoPanel>
            <MockupImport />
          </DemoPanel>
        </div>

        <Reveal className="lg:order-2">
          <SectionLabel>Import automatique</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Collez le message. Compyo crée le projet.
          </h2>
          <p className="mt-5 text-ink/70 leading-relaxed max-w-md">
            Un SMS, un message WhatsApp, un mail — ou même une simple capture d&apos;écran de la
            conversation. Collez-le dans Compyo : l&apos;IA reconnaît le client, comprend le
            besoin, et propose un rendez-vous si une date est mentionnée. Le projet est créé,
            prêt à être complété. Zéro ressaisie.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {[
              "Texte collé ou capture d'écran, au choix",
              "Nom du client et besoin identifiés automatiquement",
              "Rendez-vous proposé si une date est évoquée",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-ink/70">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-signal shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function MockupImport() {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
        Message collé
      </p>

      {/* Bulle façon SMS/WhatsApp reçue */}
      <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm border border-ink/10 bg-paper px-4 py-3 shadow-sm shadow-ink/[0.04]">
        <p className="text-sm text-ink/80 leading-relaxed">
          Bonjour, j&apos;aurais besoin d&apos;un devis pour refaire ma salle de bain, vous êtes
          dispo cette semaine ? Peut-être jeudi si possible.
        </p>
        <p className="mt-2 text-[10px] font-mono text-ink/35">Julien Roche — 09:14</p>
      </div>

      <div className="flex items-center justify-center py-1">
        <span className="text-ink/25 font-mono text-sm">↓</span>
      </div>

      {/* Résultat : projet créé */}
      <div className="rounded-xl border border-signal/25 bg-surface px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-signal shrink-0" />
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Projet créé automatiquement
          </p>
        </div>
        <p className="mt-2 text-sm font-medium text-ink">Julien Roche — Salle de bain</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="font-mono text-[10px] text-ink/50 rounded-full border border-ink/10 px-2.5 py-1">
            Devis à préparer
          </span>
          <span className="font-mono text-[10px] text-ink/50 rounded-full border border-ink/10 px-2.5 py-1">
            RDV proposé — jeudi
          </span>
        </div>
      </div>
    </div>
  );
}
