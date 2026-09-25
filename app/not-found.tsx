import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer } from "@/components/marketing/Cadre";

// ============================================================
// La page introuvable (25/09). Avant : la page par défaut de Next.js, en
// anglais (« This page could not be found »), sans en-tête ni lien. Un
// visiteur arrivé par un vieux lien repartait ; un moteur n'y trouvait
// rien à suivre. Next répond toujours 404 et ajoute « noindex ».
// ============================================================

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

const PISTES = [
  { href: "/", titre: "L'accueil", texte: "Ce que fait Compyo, en une journée d'artisan." },
  { href: "/metiers", titre: "Votre métier", texte: "Électricien, plombier, maçon, couvreur… métier par métier." },
  { href: "/questions-frequentes", titre: "Questions fréquentes", texte: "Les réponses courtes aux questions des artisans." },
];

export default function PageIntrouvable() {
  return (
    <div className="bg-paper text-ink">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-24 sm:px-8 sm:py-36">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">Erreur 404</p>
        <h1 className="mt-6 text-balance font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-6xl">
          Cette page n&apos;existe pas, ou plus.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink/70">
          Le lien est peut-être ancien, ou l&apos;adresse a une faute de frappe. Voici où reprendre :
        </p>
        <ul className="mt-10 grid gap-3">
          {PISTES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="group flex items-center justify-between gap-4 rounded-[1.4rem] bg-surface px-6 py-5 ring-1 ring-ink/10 transition hover:ring-ink/25"
              >
                <span>
                  <span className="block font-display text-lg font-semibold text-ink">{p.titre}</span>
                  <span className="mt-0.5 block text-[14.5px] text-ink/60">{p.texte}</span>
                </span>
                <span aria-hidden className="text-ink/35 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-[14.5px] text-ink/60">
          Un lien cassé sur le site ?{" "}
          <Link href="/contact" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
            Signalez-le
          </Link>
          , il sera corrigé.
        </p>
      </main>
      <Footer />
    </div>
  );
}
