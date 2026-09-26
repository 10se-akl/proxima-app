import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal } from "@/components/marketing/Cadre";
import { DessinMetier } from "@/components/marketing/illustrations/Outils";
import { METIERS_VITRINE } from "@/components/marketing/vitrine/metiers/donnees";
import { JsonLd } from "@/components/seo/JsonLd";
import { FICHE_PAR_SLUG, type FicheMetier } from "@/lib/metiersPages";
import { faqPage, filAriane, metaPage } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

// ============================================================
// /metiers — la page pilier des métiers (25/09).
//
// Avant, « Métiers » dans le menu menait à une ancre de l'accueil, et les
// pages métier n'avaient aucun lien entrant : les moteurs ne les
// trouvaient que par le sitemap. Cette page les rassemble par famille,
// dit en clair ce qui change d'un métier à l'autre, et répond à la
// question qu'un artisan pose à Google ou à une IA : « existe-t-il un
// assistant pour les artisans du bâtiment ? ».
//
// Balisage : CollectionPage + ItemList (les pages métier), fil d'Ariane,
// FAQ visible et balisée.
// ============================================================

export const metadata: Metadata = metaPage({
  titre: "Logiciel pour artisans du bâtiment, métier par métier",
  description:
    "Électricien, plombier, maçon, couvreur, peintre… Compyo s'adapte à 17 métiers du bâtiment : questions avant chiffrage, TVA, météo, rappels.",
  chemin: "/metiers",
});

const FAMILLES: { nom: string; slugs: string[] }[] = [
  { nom: "Plomberie, chauffage, électricité", slugs: ["plombier", "chauffagiste", "climaticien", "electricien"] },
  { nom: "Gros œuvre et toiture", slugs: ["macon", "terrassier", "facadier", "couvreur", "charpentier"] },
  { nom: "Second œuvre et finitions", slugs: ["menuisier", "plaquiste", "carreleur", "peintre", "vitrier", "serrurier"] },
  { nom: "Extérieur", slugs: ["paysagiste", "pisciniste"] },
  { nom: "Tous corps d'état", slugs: ["entreprise-de-renovation"] },
];

const ACCROCHE_RENOVATION = "Un appartement à reprendre du sol au plafond, et un client qui attend un seul devis, lisible.";

function accroche(fiche: FicheMetier) {
  return METIERS_VITRINE.find((m) => m.id === fiche.id)?.accroche ?? ACCROCHE_RENOVATION;
}

const CE_QUI_CHANGE = [
  {
    titre: "Les questions avant de chiffrer",
    texte:
      "Un plombier ne vérifie pas la même chose qu'un couvreur. Compyo pose à chaque métier ses propres questions — accès, état de l'existant, contraintes — pour éviter le retour sur chantier pour une information oubliée.",
  },
  {
    titre: "La TVA et les mentions du devis",
    texte:
      "20 %, 10 % ou 5,5 % selon les travaux et le logement, franchise de TVA pour les micro-entrepreneurs, assurance décennale pour les métiers qui y sont soumis : le devis porte le taux choisi et les mentions obligatoires.",
  },
  {
    titre: "La météo, pour les métiers d'extérieur",
    texte:
      "Maçon, terrassier, façadier, couvreur, charpentier, paysagiste : un chantier planifié un jour de forte pluie ou de vent fort est signalé à l'avance sur le planning.",
  },
  {
    titre: "Les rappels d'entretien",
    texte:
      "Chauffagiste, climaticien, pisciniste, paysagiste : un rappel récurrent par client revient à la bonne saison, avec l'historique des interventions.",
  },
];

const FAQ = [
  {
    question: "Existe-t-il un assistant IA pour les artisans du bâtiment ?",
    reponse:
      "Oui. Compyo est un assistant administratif conçu pour les artisans du bâtiment en France. À partir du message d'un client, d'une note dictée sur le chantier ou d'une photo, il crée le projet, range les informations, prépare le devis avec les prix de l'artisan, suit la signature en ligne, puis la facture et les relances. L'IA propose ; l'artisan valide tout ce qui part chez le client, et les prix viennent d'un calcul fixe, jamais d'une estimation de l'IA. Compyo est en bêta privée gratuite, sur candidature.",
  },
  {
    question: "Compyo convient-il à tous les métiers du bâtiment ?",
    reponse:
      "Compyo est adapté à 17 métiers — électricien, plombier, chauffagiste, climaticien, maçon, terrassier, façadier, couvreur, charpentier, menuisier, plaquiste, carreleur, peintre, vitrier, serrurier, paysagiste, pisciniste — ainsi qu'aux entreprises de rénovation tous corps d'état. Pour un autre métier, un profil générique existe.",
  },
  {
    question: "Mon métier n'est pas dans la liste : puis-je utiliser Compyo ?",
    reponse:
      "Oui, avec le profil générique : les devis, les factures, le planning, les notes vocales et les photos fonctionnent de la même façon. Seules les questions propres au métier sont plus générales. Dites-nous quel est votre métier : c'est ainsi que la liste s'allonge.",
  },
  {
    question: "Faut-il un ordinateur pour utiliser Compyo ?",
    reponse:
      "Non. Compyo s'installe comme une application sur le téléphone (Android ou iPhone), et fonctionne aussi sur tablette et ordinateur. Tout est synchronisé : ce qui est dicté sur le chantier se retrouve le soir sur l'ordinateur.",
  },
];

export default function PageMetiers() {
  const fichesOrdonnees = FAMILLES.flatMap((f) => f.slugs).map((s) => FICHE_PAR_SLUG[s]);

  return (
    <div className="bg-paper text-ink">
      <JsonLd
        donnees={filAriane([
          { nom: "Accueil", chemin: "/" },
          { nom: "Métiers", chemin: "/metiers" },
        ])}
      />
      <JsonLd
        donnees={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${SITE_URL}/metiers#page`,
          url: `${SITE_URL}/metiers`,
          name: "Compyo pour les artisans du bâtiment, métier par métier",
          inLanguage: "fr-FR",
          isPartOf: { "@id": `${SITE_URL}/#site` },
          about: { "@id": `${SITE_URL}/#logiciel` },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: fichesOrdonnees.length,
            itemListElement: fichesOrdonnees.map((f, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Compyo pour ${f.article} ${f.nom.toLowerCase()}`,
              url: `${SITE_URL}/metiers/${f.slug}`,
            })),
          },
        }}
      />
      <JsonLd donnees={faqPage(FAQ)} />

      <Header />
      <main className="px-5 sm:px-8">
        <section className="mx-auto max-w-5xl pt-14 sm:pt-24">
          <Reveal>
            <nav aria-label="Fil d'Ariane" className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel max-sm:[&_a]:inline-flex max-sm:[&_a]:min-h-11 max-sm:[&_a]:items-center">
              <Link href="/" className="hover:text-ink">
                Accueil
              </Link>
              <span aria-hidden> · </span>
              <span aria-current="page">Métiers</span>
            </nav>
            <h1 className="mt-7 max-w-4xl text-balance font-display text-[2.4rem] font-semibold leading-[1.0] tracking-[-0.03em] text-ink sm:text-6xl">
              Un assistant administratif pour chaque métier du bâtiment.
            </h1>
            <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-ink/75">
              Compyo est le compagnon administratif des artisans du bâtiment : du premier message du client à la
              facture réglée, il crée le projet, range les notes et les photos, prépare le devis avec vos prix et suit la
              signature. Le fond est le même pour tous ; ce qui change d&apos;un métier à l&apos;autre, c&apos;est ce
              qu&apos;il faut vérifier avant de chiffrer, la TVA, la météo et le rythme des entretiens.
            </p>
          </Reveal>
        </section>

        <section aria-labelledby="titre-change" className="mx-auto max-w-5xl py-20 sm:py-28">
          <h2 id="titre-change" className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">
            Ce qui change d&apos;un métier à l&apos;autre
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CE_QUI_CHANGE.map((c, i) => (
              <Reveal key={c.titre} delay={i * 80}>
                <div className="h-full rounded-[1.6rem] bg-surface p-6 ring-1 ring-ink/[0.07] sm:p-8">
                  <h3 className="font-display text-xl font-semibold leading-tight text-ink">{c.titre}</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">{c.texte}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="titre-familles" className="mx-auto max-w-5xl pb-24 sm:pb-32">
          <h2 id="titre-familles" className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl">
            Choisissez votre métier.
          </h2>
          <div className="mt-12 space-y-14">
            {FAMILLES.map((famille) => (
              <div key={famille.nom}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">{famille.nom}</h3>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {famille.slugs.map((slug) => {
                    const fiche = FICHE_PAR_SLUG[slug];
                    return (
                      <li key={slug}>
                        <Link
                          href={`/metiers/${slug}`}
                          className="group flex h-full gap-4 rounded-[1.4rem] bg-surface p-5 ring-1 ring-ink/[0.07] transition hover:-translate-y-0.5 hover:ring-ink/20"
                        >
                          <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-paper-warm">
                            <DessinMetier id={fiche.id} className="h-10 w-10 text-ink/70" />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-display text-[1.15rem] font-semibold text-ink">
                              {fiche.nom}
                              <span aria-hidden className="text-ink/30 transition-transform group-hover:translate-x-0.5">
                                →
                              </span>
                            </span>
                            <span className="mt-1 block text-[14px] leading-snug text-ink/60">{accroche(fiche)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-12 text-[14.5px] text-ink/60">
            Votre métier n&apos;y est pas ?{" "}
            <Link href="/contact" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
              Dites-le-nous
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="titre-faq" className="mx-auto max-w-3xl border-t border-ink/10 py-24 sm:py-32">
          <h2 id="titre-faq" className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl">
            Questions fréquentes
          </h2>
          <div className="mt-10 divide-y divide-ink/10">
            {FAQ.map((q) => (
              <div key={q.question} className="py-7">
                <h3 className="text-[17px] font-semibold leading-snug text-ink">{q.question}</h3>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">{q.reponse}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl border-t border-ink/10 py-24 text-center sm:py-32">
          <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl">
            Vos soirées ne sont pas faites pour la paperasse.
          </h2>
          <Link
            href="/demander-acces"
            className="mt-10 inline-flex rounded-full bg-signal px-9 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Rejoindre la bêta privée
          </Link>
          <p className="mt-7 font-mono text-[11px] tracking-wide text-steel">Chaque candidature est lue · réponse sous 48 h</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
