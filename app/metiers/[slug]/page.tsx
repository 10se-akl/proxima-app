import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer, Reveal } from "@/components/marketing/Cadre";
import { CadreDessin } from "@/components/marketing/accueil/Maquettes";
import { CONTENUS_METIERS } from "@/components/marketing/metiers/contenusMetiers";
import {
  EXEMPLES_METIERS,
  totalLigne,
  totaux,
  type ExempleMetier,
} from "@/components/marketing/metiers/exemplesMetiers";
import { METIERS_VITRINE } from "@/components/marketing/vitrine/metiers/donnees";
import { JsonLd } from "@/components/seo/JsonLd";
import { FICHES_METIERS, FICHE_PAR_SLUG } from "@/lib/metiersPages";
import { faqPage, filAriane, metaPage } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

// ============================================================
// /metiers/[slug] — une page par métier.
//
// 20/09 : dix-huit adresses, trois pages écrites (les autres en noindex).
// 25/09 : les dix-huit écrites, et une page plus complète, pensée pour
// répondre aux questions qu'un artisan pose à Google ou à un assistant IA
// (« quel logiciel de devis pour un électricien ? ») :
//   1. la scène — une heure, un lieu, un geste ;
//   2. trois choses qui changent pour ce métier ;
//   3. ce que l'artisan dicte sur place (le même exemple que l'accueil) ;
//   4. les questions posées avant de chiffrer (celles de l'application)
//      et le devis d'exemple ;
//   5. une FAQ propre au métier, visible ET balisée (FAQPage) ;
//   6. les métiers voisins et la page pilier /metiers.
// Fil d'Ariane visible et balisé (BreadcrumbList).
//
// Un métier ajouté plus tard sans texte reste en `noindex` et hors
// sitemap (voir lib/metiersPages.ts) : pas de page creuse dans l'index.
// ============================================================

export function generateStaticParams() {
  return FICHES_METIERS.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const fiche = FICHE_PAR_SLUG[params.slug];
  if (!fiche) return {};
  const contenu = CONTENUS_METIERS[fiche.slug];

  if (!contenu || !fiche.redigee) {
    return {
      title: `Compyo pour ${fiche.article} ${fiche.nom.toLowerCase()}`,
      // Pas encore de contenu propre : hors index, et hors sitemap (voir
      // app/sitemap.ts). `follow` reste actif, les liens de la page (vers
      // l'accueil, vers la bêta) gardent leur valeur.
      robots: { index: false, follow: true },
    };
  }

  return metaPage({ titre: contenu.titreMeta, description: contenu.descriptionMeta, chemin: `/metiers/${fiche.slug}` });
}

/** « Électricien » → « Électriciens » ; « Entreprise de rénovation » →
 *  « Entreprises de rénovation ». */
function pluriel(nom: string) {
  return nom.includes(" de ") ? nom.replace(" de ", "s de ") : `${nom}s`;
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
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">{euros(totalLigne(l))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink/80 pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
          Total TTC · TVA {String(metier.tvaPct).replace(".", ",")} %
        </span>
        <span className="font-display text-2xl font-semibold tabular-nums text-ink">{euros(somme.ttc)}</span>
      </div>
      <p className="mt-5 text-[12.5px] leading-relaxed text-steel">
        Exemple de structure, pas un tarif : dans Compyo, les montants viennent de vos prix, et vous relisez chaque
        ligne avant d&apos;envoyer.
      </p>
    </div>
  );
}

const CLASSE_CTA =
  "inline-flex rounded-full bg-signal px-8 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export default function PageMetier({ params }: { params: { slug: string } }) {
  const fiche = FICHE_PAR_SLUG[params.slug];
  if (!fiche) notFound();

  const contenu = fiche.redigee ? CONTENUS_METIERS[fiche.slug] : undefined;
  const exemple = EXEMPLES_METIERS.find((m) => m.id === fiche.id);
  const vitrine = METIERS_VITRINE.find((m) => m.id === fiche.id);
  const minuscule = fiche.nom.toLowerCase();
  const chemin = `/metiers/${fiche.slug}`;
  const proches = (contenu?.proches ?? []).map((s) => FICHE_PAR_SLUG[s]).filter(Boolean);

  return (
    <div className="bg-paper text-ink">
      <JsonLd
        donnees={filAriane([
          { nom: "Accueil", chemin: "/" },
          { nom: "Métiers", chemin: "/metiers" },
          { nom: fiche.nom, chemin },
        ])}
      />
      {contenu && (
        <>
          <JsonLd donnees={faqPage(contenu.faq)} />
          <JsonLd
            donnees={{
              "@context": "https://schema.org",
              "@type": "WebPage",
              "@id": `${SITE_URL}${chemin}#page`,
              url: `${SITE_URL}${chemin}`,
              name: contenu.titreMeta,
              description: contenu.descriptionMeta,
              inLanguage: "fr-FR",
              isPartOf: { "@id": `${SITE_URL}/#site` },
              about: { "@id": `${SITE_URL}/#logiciel` },
              audience: { "@type": "BusinessAudience", audienceType: pluriel(fiche.nom) },
            }}
          />
        </>
      )}
      <Header />
      <main className="px-5 sm:px-8">
        <section className="mx-auto max-w-5xl pt-14 sm:pt-24">
          <Reveal>
            <nav aria-label="Fil d'Ariane" className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel max-sm:[&_a]:inline-flex max-sm:[&_a]:min-h-11 max-sm:[&_a]:items-center">
              <Link href="/" className="hover:text-ink">
                Accueil
              </Link>
              <span aria-hidden> · </span>
              <Link href="/metiers" className="hover:text-ink">
                Métiers
              </Link>
              <span aria-hidden> · </span>
              <span aria-current="page">{fiche.nom}</span>
            </nav>
            <h1 className="mt-7 max-w-3xl font-display text-[2.4rem] font-semibold leading-[1.0] tracking-[-0.03em] text-ink sm:text-6xl">
              {contenu ? contenu.titre : `Compyo pour ${fiche.article} ${minuscule}.`}
            </h1>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-ink/75">
              {contenu
                ? contenu.scene
                : `La page dédiée aux ${minuscule}s est en cours d'écriture. En attendant, voici ce que Compyo demande avant de chiffrer un chantier de ${minuscule}, et à quoi ressemble le devis qui en sort.`}
            </p>
            <Link href="/demander-acces" className={`mt-10 ${CLASSE_CTA}`}>
              Rejoindre la bêta
            </Link>
          </Reveal>
        </section>

        {contenu && (
          <section aria-label={`Ce que Compyo change pour ${fiche.article} ${minuscule}`} className="mx-auto max-w-5xl py-24 sm:py-36">
            <div className="grid gap-14 sm:gap-20">
              {contenu.points.map((point, i) => (
                <Reveal key={point.titre} delay={i * 100}>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-12">
                    <h2 className="font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">{point.titre}</h2>
                    <p className="text-[16px] leading-relaxed text-ink/70">{point.texte}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {vitrine && (
          <section className="mx-auto max-w-5xl pb-20 sm:pb-28">
            <Reveal>
              <figure className="rounded-[1.6rem] bg-paper-warm/70 p-6 ring-1 ring-ink/[0.06] sm:p-10">
                <figcaption className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">
                  Sur le chantier, vous dictez
                </figcaption>
                <blockquote className="mt-4 font-display text-[1.35rem] leading-snug text-ink sm:text-[1.7rem]">
                  «&nbsp;{vitrine.dictee}&nbsp;»
                </blockquote>
                <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-ink/65">
                  La note est transcrite et rangée dans le projet du client. Le devis ci-dessous est préparé à partir
                  d&apos;elle, avec vos prix — vous le relisez avant qu&apos;il parte.
                </p>
              </figure>
            </Reveal>
          </section>
        )}

        {exemple && (
          <section className={`mx-auto max-w-5xl ${contenu ? "pb-24 sm:pb-36" : "py-24 sm:py-36"}`}>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">
                  Ce que Compyo demande avant de chiffrer
                </h2>
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
                <CadreDessin id={fiche.id} titre={`Dessin au trait : ${fiche.nom}`} className="mt-12 aspect-[4/3] max-w-sm" />
              </Reveal>
              <Reveal delay={120}>
                <DevisExemple metier={exemple} />
              </Reveal>
            </div>
          </section>
        )}

        {contenu && (
          <section aria-labelledby="titre-faq" className="mx-auto max-w-3xl border-t border-ink/10 py-24 sm:py-32">
            <Reveal>
              <h2 id="titre-faq" className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl">
                Questions fréquentes
              </h2>
            </Reveal>
            <div className="mt-10 divide-y divide-ink/10">
              {contenu.faq.map((q) => (
                <Reveal key={q.question}>
                  <div className="py-7">
                    <h3 className="text-[17px] font-semibold leading-snug text-ink">{q.question}</h3>
                    <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">{q.reponse}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {proches.length > 0 && (
          <section aria-labelledby="titre-proches" className="mx-auto max-w-5xl border-t border-ink/10 py-16 sm:py-20">
            <h2 id="titre-proches" className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">
              Métiers voisins
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {proches.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/metiers/${p.slug}`}
                    className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4 text-[15px] font-medium text-ink ring-1 ring-ink/10 transition hover:ring-ink/25"
                  >
                    Compyo pour {p.article} {p.nom.toLowerCase()}
                    <span aria-hidden className="text-ink/35">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[14px] text-ink/60">
              <Link href="/metiers" className="inline-flex min-h-11 items-center font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
                Les 17 métiers et les entreprises de rénovation
              </Link>
            </p>
          </section>
        )}

        <section className="mx-auto max-w-3xl border-t border-ink/10 py-24 text-center sm:py-36">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl">
              Vos soirées ne sont pas faites pour la paperasse.
            </h2>
            <Link href="/demander-acces" className={`mt-10 ${CLASSE_CTA} px-9`}>
              Rejoindre la bêta privée
            </Link>
            <p className="mt-7 font-mono text-[11px] tracking-wide text-steel">Chaque candidature est lue · réponse sous 48 h</p>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
