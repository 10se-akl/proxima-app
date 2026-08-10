"use client";

import Link from "next/link";
import { CompyoMark } from "./CompyoMark";

// Layout partagé par les 3 pages juridiques (mentions légales, CGU,
// politique de confidentialité). Volontairement séparé du Header/Footer
// de la landing page : ces derniers utilisent des ancres (#parcours,
// #solutions...) qui n'existent que sur "/", les réutiliser tels quels
// sur une autre route casserait la navigation. Un en-tête minimal avec
// juste un retour à l'accueil suffit ici.
export function LayoutJuridique({
  titre,
  misAJour,
  children,
}: {
  titre: string;
  misAJour: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <CompyoMark taille={26} />
            <span className="font-display font-semibold tracking-tight text-sm">Compyo</span>
          </Link>
          <Link href="/" className="text-sm text-ink/60 hover:text-ink transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
          Dernière mise à jour : {misAJour}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink mb-10">
          {titre}
        </h1>
        <div className="space-y-8 text-[15px] leading-relaxed text-ink/80 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:mb-0 [&_strong]:text-ink [&_strong]:font-medium [&_a]:text-signal [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </main>

      <footer className="border-t border-ink/10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink/50">
          <Link href="/mentions-legales" className="hover:text-ink/80 transition-colors">
            Mentions légales
          </Link>
          <Link href="/politique-de-confidentialite" className="hover:text-ink/80 transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-ink/80 transition-colors">
            CGU
          </Link>
        </div>
      </footer>
    </div>
  );
}
