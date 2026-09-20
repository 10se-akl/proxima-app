import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, Reveal } from "@/components/marketing/LandingPage";
import { CadreDessin } from "@/components/marketing/accueil/Maquettes";
import { CONTENUS_METIERS } from "@/components/marketing/metiers/contenusMetiers";
import {
  EXEMPLES_METIERS,
  totalLigne,
  totaux,
  type ExempleMetier,
} from "@/components/marketing/metiers/exemplesMetiers";
import { FICHES_METIERS, FICHE_PAR_SLUG } from "@/lib/metiersPages";

// ============================================================
// /metiers/[slug] (20/09) — dix-huit adresses, trois pages écrites.
//
// L'architecture est complète tout de suite (génération statique des
// dix-huit, métadonnées propres, fil d'Ariane), le contenu vient
// progressivement. Les quinze pages sans texte propre sont en `noindex`
// et absentes du sitemap : quinze pages quasi identiques feraient baisser
// TOUT le domaine dans les résultats de recherche, la sanction ne se
// limite pas aux pages creuses. Elles restent accessibles par leur
// adresse (utile pour les montrer, ou pour un lien envoyé à la main),
// simplement pas référencées.
//
// Le jour où l'une d'elles est écrite : ajouter son texte dans
// contenusMetiers.ts et passer `redigee` à true dans lib/metiersPages.ts.
// Le sitemap, le noindex et le lien depuis l'accueil suivent tout seuls.
// ============================================================

export function generateStaticParams() {
  return FICHES_METIERS.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const fiche = FICHE_PAR_SLUG[params.slug];
  if (!fiche) return {};
  const contenu = CONTENUS_METIERS[fiche.slug];

  if (!contenu) {
    return {
      title: `Compyo pour ${fiche.article} ${fiche.nom.toLowerCase()}`,
      // Pas encore de contenu propre : hors index, et hors sitemap (voir
      // app/sitemap.ts). `follow` reste actif, les liens de la page (vers
      // l'accueil, vers la bêta) gardent leur valeur.
      robots: { index: false, follow: true },
    };
  }

  return {
    title: contenu.titreMeta,
    description: contenu.descriptionMeta,
    alternates: { canonical: `/metiers/${fiche.slug}` },
    openGraph: {
      title: contenu.titreMeta,
      description: contenu.descriptionMeta,
      url: `/metiers/${fiche.slug}`,
      type: "article",
    },
  };
}

function euros(n: number): string {
  const [entier, centimes] = n.toFixed(2).split(".");
  return `${entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${centimes} €`;
}

function DevisExemple({ metier }: { metier: ExempleMetier }) {
  const somme = totaux(metier);
  return (
    <div className="rounded-[1.6rem] border border-ink/10 bg-surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between border-b border-ink/10 pb-4">
        <p className="font-display text-lg font-semibold text-ink">{metier.chantier}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">Exemple</p>
      </div>
      <ul className="divide-y divide-ink/10">
        {metier.lignes.map((l) => (
          <li key={l.designation} className="flex items-baseline justify-between gap-4 py-3.5">
            <span className="min-w-0 text-[14px] leading-snug text-ink">{l.designation}</span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">
              {euros(totalLigne(l))}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink/80 pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
          Total TTC · TVA {metier.tvaPct} %
        </span>
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">
          {euros(somme.ttc)}
        </span>
      </div>
      <p className="mt-5 text-[12.5px] leading-relaxed text-steel">
        Exemple de structure, pas un tarif : dans Compyo, les montants viennent de vos prix, et
        vous relisez chaque ligne avant d&apos;envoyer.
      </p>
    </div>
  );
}

export default function PageMetier({ params }: { params: { slug: string } }) {
  const fiche = FICHE_PAR_SLUG[params.slug];
  if (!fiche) notFound();

  const contenu = CONTENUS_METIERS[fiche.slug];
  const exemple = EXEMPLES_METIERS.find((m) => m.id === fiche.id);
  const minuscule = fiche.nom.toLowerCase();

  return (
    <div className="bg-paper text-ink">
      <Header />
      <main className="px-5 sm:px-8">
        <section className="mx-auto max-w-5xl pt-14 sm:pt-24">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">
              <Link href="/" className="hover:text-ink">
                Accueil
              </Link>
              <span aria-hidden> · </span>
              Métiers
            </p>
            <h1 className="mt-7 max-w-3xl font-display text-[2.4rem] font-semibold leading-[1.0] tracking-[-0.03em] text-ink sm:text-6xl">
              {contenu ? contenu.titre : `Compyo pour ${fiche.article} ${minuscule}.`}
            </h1>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink/75">
              {contenu
                ? contenu.scene
                : `La page dédiée aux ${minuscule}s est en cours d'écriture. En attendant, voici ce que Compyo demande avant de chiffrer un chantier de ${minuscule}, et à quoi ressemble le devis qui en sort.`}
            </p>
            <Link
              href="/demander-acces"
              className="mt-10 inline-flex rounded-full bg-signal px-8 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Rejoindre la bêta
            </Link>
          </Reveal>
        </section>

        {contenu && (
          <section className="mx-auto max-w-5xl py-24 sm:py-36">
            <div className="grid gap-14 sm:gap-20">
              {contenu.points.map((point, i) => (
                <Reveal key={point.titre} delay={i * 100}>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-12">
                    <h2 className="font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
                      {point.titre}
                    </h2>
                    <p className="text-[16px] leading-relaxed text-ink/70">{point.texte}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {exemple && (
          <section className={`mx-auto max-w-5xl ${contenu ? "pb-24 sm:pb-36" : "py-24 sm:py-36"}`}>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">
                  Ce que Compyo demande avant de chiffrer
                </p>
                <ul className="mt-6 space-y-3">
                  {exemple.checklist.map((question) => (
                    <li key={question} className="flex gap-3 text-[16px] leading-snug text-ink/80">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" />
                      {question}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-[13px] leading-relaxed text-steel">
                  Les mêmes questions que dans l&apos;application, mot pour mot.
                </p>
                <CadreDessin
                  id={fiche.id}
                  titre={`Dessin au trait : ${fiche.nom}`}
                  className="mt-12 aspect-[4/3] max-w-sm"
                />
              </Reveal>
              <Reveal delay={120}>
                <DevisExemple metier={exemple} />
              </Reveal>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-3xl border-t border-ink/10 py-24 text-center sm:py-36">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl">
              Vos soirées ne sont pas faites pour la paperasse.
            </h2>
            <Link
              href="/demander-acces"
              className="mt-10 inline-flex rounded-full bg-signal px-9 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Rejoindre la bêta privée
            </Link>
            <p className="mt-7 font-mono text-[11px] tracking-wide text-steel">
              Chaque candidature est lue · réponse sous 48 h
            </p>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
