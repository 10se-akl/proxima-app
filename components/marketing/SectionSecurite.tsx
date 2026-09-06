import Link from "next/link";
import { Reveal, SectionLabel } from "./LandingPage";

// ============================================================
// Sécurité & confidentialité — les artisans nous confient leurs
// coordonnées clients, leurs devis, parfois des photos de chantier.
// Cette section reste factuelle : pas de promesse de "sécurité totale",
// juste ce qu'on fait concrètement, en langage simple.
// ============================================================

const points = [
  {
    titre: "Vos données restent à vous",
    description:
      "Chaque entreprise ne voit que ses propres projets, clients et devis. Aucune autre équipe sur Compyo n'y a accès.",
  },
  {
    titre: "Base de données hébergée en Europe",
    description:
      "Vos données et celles de vos clients sont stockées chez Supabase, région Stockholm (Suède), avec chiffrement pendant le transfert et au stockage.",
  },
  {
    titre: "Aucune revente à qui que ce soit",
    description:
      "Vos données ne sont ni vendues, ni partagées avec des tiers à des fins commerciales.",
  },
  {
    titre: "Suppression sur simple demande",
    description:
      "Vous pouvez demander la suppression complète de vos données à tout moment, sans justification à fournir.",
  },
];

export function SectionSecurite() {
  return (
    <section className="bg-paper">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <SectionLabel>Sécurité & confidentialité</SectionLabel>
            <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight">
              Vos données de chantier ne regardent que vous
            </h2>
            <p className="mt-5 text-base text-ink/60 leading-relaxed">
              On ne prétend pas au risque zéro — personne ne le peut. Voici concrètement
              ce qu'on met en place pour protéger vos données clients.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {points.map((point, i) => (
            <Reveal key={point.titre} delay={i * 60}>
              <div className="h-full rounded-2xl border border-ink/10 bg-surface p-6">
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {point.titre}
                </h3>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">
                  {point.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/politique-de-confidentialite"
            className="text-sm text-ink/50 hover:text-ink underline"
          >
            Lire la politique de confidentialité complète →
          </Link>
        </div>
      </div>
    </section>
  );
}
