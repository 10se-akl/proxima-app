import type { Metadata } from "next";
import { metaPage } from "@/lib/seo";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/Cadre";
import { AssistantInstallation } from "@/components/pwa/AssistantInstallation";

// ============================================================
// /installer (20/09) — une adresse fixe pour installer Compyo, qu'on peut
// envoyer telle quelle à un artisan par SMS ou WhatsApp. Voir le pourquoi
// dans components/pwa/AssistantInstallation.tsx : jusqu'ici, le seul
// point d'entrée était une carte qui ne s'affiche qu'une fois par
// navigateur, donc plus rien du tout pour qui l'avait déjà fermée.
// ============================================================

// 25/09 — metaPage : adresse canonique et aperçu de partage propres à
// la page (avant, ils étaient hérités de l'accueil). Voir lib/seo.ts.
export const metadata: Metadata = metaPage({
  titre: "Installer l'application",
  description:
    "Installez Compyo sur votre téléphone ou votre ordinateur : un appui depuis votre écran d'accueil, sans passer par le navigateur.",
  chemin: "/installer",
  indexer: false,
});

export default function InstallerPage() {
  return (
    <div>
      <Header />

      <section className="pt-16 sm:pt-24 pb-20 sm:pb-28">
        <div className="mx-auto max-w-xl px-5 sm:px-8">
          <Reveal>
            <SectionLabel>Installation</SectionLabel>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Compyo sur votre écran d&apos;accueil.
            </h1>
            <p className="mt-4 text-ink/60 leading-relaxed">
              Compyo s&apos;installe comme une application, sans passer par un magasin
              d&apos;applications et sans rien télécharger de lourd. Vous l&apos;ouvrez d&apos;un
              appui, et il fonctionne même quand le réseau du chantier ne suit pas.
            </p>
          </Reveal>
        </div>

        <div className="mt-10">
          <AssistantInstallation />
        </div>
      </section>

      <Footer />
    </div>
  );
}
