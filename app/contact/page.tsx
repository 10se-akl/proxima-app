import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/Cadre";
import { SectionContact } from "@/components/marketing/SectionContact";

export const metadata: Metadata = {
  // SEO (05/09) — voir même correctif que /fonctionnalites : le layout
  // racine applique déjà "%s — Compyo", garder le suffixe ici le dupliquait.
  title: "Contact",
  description:
    "Une question sur Compyo ? Écrivez directement à l'équipe — chaque message est lu. Réponses aux questions les plus fréquentes sur la bêta privée.",
};

const FAQ = [
  {
    question: "Compyo est-il déjà disponible ?",
    reponse:
      "Compyo est en bêta privée, sur candidature. L'accès est volontairement limité pendant cette phase — voir la page Bêta pour comprendre pourquoi.",
  },
  {
    question: "Combien de temps pour recevoir une réponse à ma candidature ?",
    reponse:
      "Chaque candidature est lue et examinée individuellement, sous 48h en général — pas de réponse automatique.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    reponse:
      "Oui — chaque entreprise ne voit que ses propres données, hébergées en Europe et chiffrées. Le détail complet est sur la page Fonctionnalités, section Sécurité & confidentialité.",
  },
  {
    question: "Compyo remplace-t-il l'artisan dans la préparation des devis ?",
    reponse:
      "Non. L'IA propose les postes, mais un moteur de calcul déterministe fixe les prix — jamais l'inverse — et rien n'est envoyé au client sans validation de l'artisan.",
  },
];

export default function ContactPage() {
  return (
    <div>
      <Header />

      {/* SectionContact fait déjà office de hero de cette page (son propre
          SectionLabel + titre) — pas besoin d'un second bloc de titre
          au-dessus, ça créerait une répétition inutile. */}
      <div className="pt-8 sm:pt-12">
        <SectionContact />
      </div>

      <section className="bg-surface border-t border-ink/10">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <Reveal>
            <SectionLabel>Questions fréquentes</SectionLabel>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight max-w-md">
              Avant d&apos;écrire, la réponse est peut-être déjà ici.
            </h2>
          </Reveal>

          <div className="mt-12 flex flex-col divide-y divide-ink/10">
            {FAQ.map((item, i) => (
              <Reveal key={item.question} delay={i * 50}>
                <div className="py-6">
                  <h3 className="font-semibold text-sm">{item.question}</h3>
                  <p className="mt-2 text-sm text-ink/60 leading-relaxed">{item.reponse}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={220} className="mt-10 text-center">
            <p className="text-sm text-ink/50">
              Question légale ou juridique ?{" "}
              <Link href="/mentions-legales" className="text-signal hover:underline">
                Mentions légales
              </Link>
              ,{" "}
              <Link href="/politique-de-confidentialite" className="text-signal hover:underline">
                politique de confidentialité
              </Link>{" "}
              et{" "}
              <Link href="/cgu" className="text-signal hover:underline">
                CGU
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
