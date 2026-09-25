import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/Cadre";

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Compyo est-il sérieux et sécurisé ? — Transparence",
  description:
    "Qui fait Compyo, où sont hébergées les données, qui y a accès : des réponses factuelles avant de confier ses données clients à un nouvel outil.",
  chemin: "/confiance",
});

// Page créée le 02/09 suite à un retour direct d'Axel : des artisans (et les
// IA auxquelles ils posent la question) ne trouvaient nulle part de réponse
// claire à "qui a fait ce site, est-ce sérieux, est-ce sécurisé, pourquoi
// pas de société ?". /a-propos répond au "qui" en filigrane et
// SectionSecurite (dans /fonctionnalites) donne 4 points rapides, mais rien
// ne regroupait une réponse frontale et complète à ces questions précises,
// dans le format Q&A qu'un artisan (ou une IA) cherche. Ton volontairement
// factuel, sans réassurance vague — y compris sur les limites réelles
// (Axel a lui-même accès aux bases, une bêta n'est pas une entreprise
// avec assurance RC pro), conformément à la ligne déjà tenue sur
// SectionSecurite ("on ne prétend pas au risque zéro").
export default function ConfiancePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES_FAQ) }}
      />

      <Header />

      <Intro />
      <QuiEtOu />
      <Securite />
      <StatutJuridique />
      <CTA />

      <Footer />
    </div>
  );
}

function Intro() {
  return (
    <section className="bg-anthracite">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-6">
            Transparence
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-white font-semibold leading-[1.15] tracking-tight text-balance">
            Compyo est-il sérieux ? Est-il sécurisé ?
          </h1>
          <p className="mt-8 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            Des questions légitimes avant de confier ses données clients à un nouvel outil.
            Voici des réponses factuelles, sans réassurance vague.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function QuiEtOu() {
  return (
    <section className="bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Qui a fait Compyo, et où c&apos;est hébergé</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Un développeur, nommément, pas une entité floue.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-10 space-y-6 text-base text-ink/70 leading-relaxed">
            <p>
              Compyo est développé par <span className="font-semibold text-ink">Axel Thfoin</span>,
              15 ans, seul, en indépendant — voir <Link href="/a-propos" className="underline hover:text-ink">la page À propos</Link>{" "}
              pour l&apos;histoire complète du projet.
            </p>
            <p>
              Le site et l&apos;application sont hébergés chez <span className="font-medium text-ink">Vercel</span>{" "}
              (hébergement du code et des pages) et <span className="font-medium text-ink">Supabase</span>{" "}
              (base de données, authentification, stockage des fichiers) — deux
              prestataires cloud utilisés par un grand nombre d&apos;entreprises tech, avec
              chiffrement des données en transit (HTTPS) et au stockage. La base de données —
              où sont stockées les données des artisans et de leurs clients — est hébergée dans
              l&apos;Union européenne (région Stockholm, Suède).
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Securite() {
  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Qui a accès à mes données</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Le chiffrement protège le transport, pas tout seul contre tout.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-10 space-y-6 text-base text-ink/70 leading-relaxed">
            <p>
              Le chiffrement HTTPS protège vos données pendant qu&apos;elles circulent entre votre
              appareil et les serveurs. Les données stockées sont également chiffrées par
              Supabase. Mais soyons directs sur ce que ça ne veut pas dire : ça ne rend rien
              &laquo; impossible à pirater &raquo;, et la vraie question à se poser sur n&apos;importe quel
              logiciel est toujours &laquo; qui a accès aux clés et aux bases de données ? &raquo;
            </p>
            <p>
              Sur Compyo, la réponse est simple : <span className="font-medium text-ink">un seul compte administrateur, celui d&apos;Axel</span>,
              a un accès technique aux bases de données. Chaque entreprise sur Compyo ne voit
              que ses propres projets, clients et devis (isolation appliquée au niveau de la
              base de données, pas seulement dans l&apos;interface). Vos données ne sont ni
              vendues, ni partagées à des fins commerciales, et peuvent être supprimées
              intégralement sur simple demande — voir la{" "}
              <Link href="/politique-de-confidentialite" className="underline hover:text-ink">
                politique de confidentialité
              </Link>.
            </p>
            <p>
              Aucun outil en ligne ne peut promettre un risque zéro. En cas de faille de
              sécurité touchant vos données, l&apos;engagement pris est de vous en informer sans
              délai injustifié dès qu&apos;elle est connue, de notifier la CNIL sous 72 heures si
              elle présente un risque pour vos droits, et de prévenir directement les personnes
              concernées si le risque est élevé — conformément aux articles 33 et 34 du RGPD.
              Détail complet dans la{" "}
              <Link href="/politique-de-confidentialite" className="underline hover:text-ink">
                politique de confidentialité
              </Link>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatutJuridique() {
  return (
    <section className="bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Pourquoi pas encore de société</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Une vraie question, une réponse honnête.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-10 space-y-6 text-base text-ink/70 leading-relaxed">
            <p>
              Compyo n&apos;est pas encore constitué en société. Créer une entreprise a un coût et
              une complexité réels, et avant de s&apos;engager dans cette démarche, Axel veut
              d&apos;abord avoir de vrais retours d&apos;artisans : est-ce que l&apos;outil fait
              vraiment gagner du temps, est-ce qu&apos;il tient dans la durée, est-ce que les
              artisans qui l&apos;essaient reviennent. C&apos;est précisément pour ça que Compyo
              reste en bêta privée, sur candidature, avec un nombre volontairement limité
              d&apos;artisans testeurs.
            </p>
            <p>
              Concrètement, ça veut dire : sans structure juridique (SIRET, assurance
              responsabilité civile professionnelle), c&apos;est Axel personnellement qui reste
              responsable en cas de problème avec les données confiées. Un artisan qui
              rejoint la bêta le fait donc en connaissance de cause, sur la base du
              volontariat — et il est recommandé de ne pas faire de Compyo, à ce stade, le
              seul endroit où sont conservées des informations critiques pour votre activité.
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
            Une question qui n&apos;a pas de réponse ici ?
          </h2>
          <p className="mt-4 text-base text-ink/60 leading-relaxed max-w-lg mx-auto">
            Écrivez directement à Axel — chaque message est lu personnellement.
          </p>
          <Link
            href="/contact"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-signal text-white font-medium px-7 py-3.5 hover:bg-signal-fonce hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm shadow-signal/20"
          >
            Nous contacter
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// Schema FAQPage — questions formulées comme un artisan (ou une IA en son
// nom) les poserait réellement, même logique que sur /comparatif : ce
// format est celui que les moteurs génératifs reprennent le plus
// facilement tel quel.
const DONNEES_STRUCTUREES_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qui a créé Compyo ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Compyo est développé par Axel Thfoin, 15 ans, développeur indépendant, seul sur le projet. Ce n'est pas une entreprise avec une équipe commerciale ni une levée de fonds.",
      },
    },
    {
      "@type": "Question",
      name: "Compyo est-il sécurisé ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Les données transitent en HTTPS et sont chiffrées au stockage chez Supabase. Chaque entreprise ne voit que ses propres données. Un seul compte administrateur (celui d'Axel) a un accès technique aux bases. Comme pour tout logiciel, le chiffrement protège le transport et le stockage, mais ne constitue pas une garantie absolue contre tout risque.",
      },
    },
    {
      "@type": "Question",
      name: "Où sont hébergées les données de Compyo ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Compyo est hébergé chez Vercel (hébergement du site et de l'application) et Supabase (base de données, authentification, stockage des fichiers). La base de données, qui contient les données des artisans et de leurs clients, est hébergée dans l'Union européenne, région Stockholm (Suède).",
      },
    },
    {
      "@type": "Question",
      name: "Que se passe-t-il en cas de faille de sécurité chez Compyo ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Compyo s'engage à informer les utilisateurs concernés sans délai injustifié dès qu'une faille est connue, à notifier la CNIL sous 72 heures lorsque la faille présente un risque pour les droits des personnes concernées (article 33 du RGPD), et à informer directement les personnes concernées en cas de risque élevé (article 34 du RGPD).",
      },
    },
    {
      "@type": "Question",
      name: "Compyo est-il une entreprise officielle ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pas encore. Compyo est en bêta privée sur candidature, sans structure juridique constituée à ce stade. Le développeur veut d'abord obtenir de vrais retours d'usage avant de s'engager dans la création d'une société.",
      },
    },
  ],
};
