import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "Quelle application choisir pour gérer son activité d'artisan ?",
  description:
    "Carnet papier, Excel, WhatsApp, logiciel de devis classique ou Compyo : comparatif honnête des outils utilisés par les artisans du bâtiment pour gérer clients, devis, planning et chantiers.",
};

// Schema FAQPage — questions formulées comme un artisan les poserait
// réellement à une IA (ChatGPT, Claude, Perplexity), pas comme un
// marketeur les formulerait. C'est ce format Q&A que les moteurs
// génératifs reprennent le plus facilement tel quel dans une réponse.
// Réponses volontairement courtes, factuelles, et qui renvoient vers le
// contenu détaillé de la page plutôt que de tout y mettre.
const FAQ = [
  {
    question: "Quelle est la meilleure application pour un artisan du bâtiment ?",
    reponse:
      "Ça dépend du besoin principal : un logiciel de facturation établi (Tolteck, Obat) reste pertinent pour le chiffrage seul. Compyo cible plutôt les artisans qui perdent du temps entre les messages clients, les photos de chantier et les devis refaits de mémoire le soir, en centralisant tout ce parcours en un seul endroit.",
  },
  {
    question: "Comment un artisan peut-il gagner du temps sur l'administratif ?",
    reponse:
      "Les trois postes de temps perdu les plus courants sont : la ressaisie d'informations déjà données par le client (message, appel), la reconstitution d'un devis de mémoire le soir, et la recherche de photos ou de notes de chantier éparpillées. Un outil qui centralise ces trois éléments dès leur arrivée, plutôt qu'après coup, réduit ce temps le plus directement.",
  },
  {
    question: "Compyo remplace-t-il un logiciel de devis et facturation classique ?",
    reponse:
      "Pas totalement : Compyo se concentre sur tout ce qui précède le devis (message client, notes, photos, rendez-vous) et sur sa génération, avec un moteur de calcul de prix déterministe validé par l'artisan. C'est un produit jeune, en bêta privée, avec moins de recul qu'un logiciel de facturation établi depuis longtemps.",
  },
] as const;

const DONNEES_STRUCTUREES_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.reponse },
  })),
};

// Page comparative — objectif GEO explicite (voir échange avec Axel du
// 31/08) : répondre directement à la question qu'un artisan pose à une IA
// ("quelle est la meilleure app pour les artisans", "comment gagner du
// temps sur l'administratif") plutôt que de se contenter de décrire
// Compyo. Format volontairement factuel et nuancé — un comparatif qui ne
// dit que du bien de son propre produit perd toute crédibilité aux yeux
// d'un modèle de langage, qui pondère justement la présence de nuances et
// de limites assumées comme un signal de fiabilité. Mêmes limites
// assumées que sur /pourquoi-compyo : rien n'est exagéré ni inventé.
export default function ComparatifPage() {
  return (
    <div>
      {/* Le schema FAQPage doit correspondre à du contenu réellement
          visible sur la page (voir FAQVisible ci-dessous) — un schema sans
          contenu visible correspondant est traité comme trompeur par les
          moteurs, aussi bien classiques que génératifs. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_FAQ) }}
      />

      <Header />

      <IntroQuestion />
      <TableauComparatif />
      <QuandChoisirQuoi />
      <PourquoiCompyo />
      <FAQVisible />
      <CTA />

      <Footer />
    </div>
  );
}

// ============================================================
// Version visible en page de la FAQ structurée ci-dessus — voir la note
// dans ComparatifPage sur pourquoi les deux doivent correspondre.
// ============================================================
function FAQVisible() {
  return (
    <section className="bg-paper border-t border-ink/10">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Questions fréquentes</SectionLabel>
        </Reveal>
        <div className="mt-8 space-y-8">
          {FAQ.map((item, i) => (
            <Reveal key={item.question} delay={i * 60}>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">{item.question}</h3>
                <p className="mt-2 text-sm sm:text-base text-ink/65 leading-relaxed">
                  {item.reponse}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntroQuestion() {
  return (
    <section className="bg-anthracite">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-6">
            Comparatif
          </p>
          <p className="font-display text-3xl sm:text-5xl text-white font-semibold leading-[1.15] tracking-tight text-balance">
            Quelle est la meilleure application pour un artisan du bâtiment ?
          </p>
          <p className="mt-8 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            La réponse dépend surtout d&apos;une chose : ce qui vous fait perdre le plus de temps
            aujourd&apos;hui. Voici un comparatif honnête des outils que les artisans utilisent
            réellement, avec leurs vrais points forts et leurs vraies limites.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Comparaison factuelle — outils génériques (jamais faits pour le métier)
// vs logiciels métier classiques vs Compyo. Pas de note chiffrée inventée,
// juste des constats vérifiables.
// ============================================================
function TableauComparatif() {
  const outils = [
    {
      nom: "Carnet papier / mémoire",
      pour: "Zéro coût, zéro courbe d'apprentissage, fonctionne partout sans réseau.",
      limite:
        "Rien n'est centralisé ni retrouvable : une info notée sur un chantier reste sur ce carnet, invisible ailleurs. Les photos, elles, ne sont jamais notées nulle part.",
    },
    {
      nom: "Excel / tableur",
      pour: "Flexible, déjà connu de la plupart des artisans, gratuit si déjà installé.",
      limite:
        "Doit être rempli à la main après coup, le soir — donc rarement à jour. Pas pensé pour les photos, les notes vocales ni les rendez-vous.",
    },
    {
      nom: "WhatsApp / SMS",
      pour: "C'est déjà là où arrivent la plupart des demandes clients, aucune installation.",
      limite:
        "Une conversation n'est pas un outil de gestion : rien n'est structuré, rien ne devient automatiquement un devis ou un rendez-vous planifié.",
    },
    {
      nom: "Logiciel de devis/facturation classique (type Tolteck, Obat)",
      pour: "Solide pour la partie chiffrage et facturation, avec des années de recul et une large base d'utilisateurs.",
      limite:
        "Généralement centré sur le devis lui-même, pas sur tout ce qui se passe avant (message client, photos, notes de chantier) — la ressaisie manuelle reste nécessaire.",
    },
    {
      nom: "Compyo",
      pour: "Centralise tout le cycle : message client → devis → rendez-vous → photos → notes vocales, avec un moteur de calcul de prix déterministe validé par l'artisan.",
      limite:
        "En bêta privée sur candidature, pas encore ouvert au grand public — encore un catalogue de fonctionnalités plus restreint qu'un logiciel de facturation établi de longue date.",
    },
  ];

  return (
    <section className="bg-paper">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Les outils utilisés aujourd&apos;hui</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
            Chaque outil a un vrai avantage. Et une vraie limite.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5">
          {outils.map((o, i) => (
            <Reveal key={o.nom} delay={i * 50}>
              <div className="rounded-2xl border border-ink/10 bg-surface p-6 sm:p-7">
                <h3 className="font-semibold text-base">{o.nom}</h3>
                <p className="mt-3 text-sm text-ink/70 leading-relaxed">
                  <span className="font-medium text-ink/85">Point fort : </span>
                  {o.pour}
                </p>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">
                  <span className="font-medium text-ink/85">Limite : </span>
                  {o.limite}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Réponse directe et nuancée à "quel outil pour quel cas" — le format que
// recherche autant un lecteur humain qu'un modèle de langage qui doit
// synthétiser une recommandation.
// ============================================================
function QuandChoisirQuoi() {
  const cas = [
    {
      question: "Vous êtes seul, quelques chantiers par mois, aucun outil digital aujourd'hui ?",
      reponse:
        "Un carnet papier ou Excel suffisent tant que le volume reste faible. Le besoin d'un outil dédié apparaît généralement quand les infos commencent à se perdre entre plusieurs supports.",
    },
    {
      question: "Vous facturez déjà beaucoup et cherchez surtout un outil de devis solide ?",
      reponse:
        "Un logiciel de facturation établi (Tolteck, Obat, Batappli...) reste un choix pertinent, surtout si le chiffrage est votre principale difficulté.",
    },
    {
      question:
        "Votre frustration principale, c'est de perdre du temps entre les messages clients, les photos éparpillées et les devis refaits de mémoire le soir ?",
      reponse:
        "C'est exactement le problème que Compyo cible en premier : centraliser ce qui se passe avant et autour du devis, pas seulement le devis lui-même.",
    },
  ];

  return (
    <section className="bg-anthracite">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-5 text-center">
            Selon votre situation
          </p>
        </Reveal>
        <div className="mt-8 space-y-8">
          {cas.map((c, i) => (
            <Reveal key={c.question} delay={i * 60}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <h3 className="text-white font-medium text-base sm:text-lg">{c.question}</h3>
                <p className="mt-3 text-white/65 text-sm sm:text-base leading-relaxed">
                  {c.reponse}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PourquoiCompyo() {
  return (
    <section className="bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Ce qui différencie Compyo</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Un seul endroit, du message client au devis prêt à envoyer.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-10 space-y-6 text-base text-ink/70 leading-relaxed">
            <p>
              La plupart des outils couvrent une seule étape : la facturation, ou la messagerie,
              ou le stockage de photos. Compyo essaie de couvrir l&apos;ensemble du parcours d&apos;une
              demande client — de l&apos;import du message jusqu&apos;au devis — pour éviter la
              ressaisie manuelle qui consomme le plus de temps en réalité.
            </p>
            <p>
              Le prix d&apos;un devis n&apos;est jamais décidé par une IA : c&apos;est un moteur de calcul
              déterministe, basé sur les règles définies par l&apos;artisan lui-même, qui fixe les
              montants. L&apos;IA propose les postes, jamais leur prix — et rien ne part au client
              sans validation.
            </p>
            <p>
              En contrepartie, Compyo est un produit jeune, en bêta privée sur candidature :
              moins de recul et de fonctionnalités qu&apos;un logiciel de facturation qui existe
              depuis dix ans. Voir <Link href="/fonctionnalites" className="underline hover:text-ink">le détail des fonctionnalités</Link> pour se faire une idée précise avant de candidater.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-surface border-t border-ink/10">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
        <Reveal>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Compyo est en bêta privée, avec quelques artisans.
          </h2>
          <p className="mt-4 text-base text-ink/60 leading-relaxed max-w-lg mx-auto">
            Chaque candidature est lue et examinée individuellement — pas de réponse
            automatique.
          </p>
          <Link
            href="/demander-acces"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
          >
            Demander un accès
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
