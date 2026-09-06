import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal, SectionLabel } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  // SEO (05/09) — voir même correctif que /fonctionnalites : le layout
  // racine applique déjà "%s — Compyo", garder le suffixe ici le dupliquait.
  title: "À propos",
  description:
    "Compyo est développé par Axel Thfoin, 15 ans, développeur indépendant, en bêta privée avec de vrais retours d'artisans du bâtiment. Pas de storytelling inventé, juste un outil construit sérieusement.",
};

// Page "À propos", séparée de l'accueil — même logique que /fonctionnalites
// et /pourquoi-compyo : l'accueil reste court, et c'est ici que quelqu'un
// qui se demande "c'est qui, derrière Compyo ?" trouve une réponse honnête.
//
// Mise à jour : à la demande d'Axel, la page se présente maintenant
// nommément (prénom/nom, âge, développeur solo) plutôt que de rester
// volontairement vague — ce sont des informations qu'il a explicitement
// données et souhaite publier, donc plus une invention de ma part. Le
// reste de la contrainte d'origine tient toujours : aucune anecdote
// enjolivée au-delà de ce qu'il a décrit, aucune image (juste les mêmes
// halos CSS abstraits qu'ailleurs sur le site).
export default function AProposPage() {
  return (
    <div>
      <Header />

      <Devise />
      <Intro />
      <Constat />
      <Construction />
      <CTA />

      <Footer />
    </div>
  );
}

// ============================================================
// La devise du produit, remise en grand plan tout en haut de la page — à
// la demande d'Axel. Même traitement visuel que IntroPhilosophie() sur
// /pourquoi-compyo (bloc bg-anthracite, grande citation centrée), pour
// que ce soit immédiatement reconnaissable comme LA phrase qui résume
// Compyo, avant même de parler de qui l'a construit.
// ============================================================
function Devise() {
  return (
    <section className="bg-anthracite">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/50 mb-6">
            À propos
          </p>
          <p className="font-display text-3xl sm:text-5xl text-white font-semibold leading-[1.15] tracking-tight text-balance">
            Nous ne voulons pas remplacer les artisans.
            <br />
            Nous voulons supprimer les tâches répétitives.
          </p>
          <p className="mt-8 text-lg sm:text-xl text-white/70 leading-relaxed">
            Compyo travaille avec eux. Pas à leur place.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Présentation nommée : prénom, nom, âge, développeur solo — informations
// données explicitement par Axel pour cette page. Volontairement discrète
// maintenant (bloc simple, plus petit, pas de H1) : la devise ci-dessus
// est ce que la page doit mettre en avant en premier, pas l'histoire
// personnelle.
// ============================================================
function Intro() {
  return (
    <section className="bg-paper">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-14 pb-14 sm:pt-16 sm:pb-16 text-center">
        <Reveal>
          <p className="text-base text-ink/70 leading-relaxed">
            Compyo est développé par <span className="font-semibold text-ink">Axel Thfoin</span>,
            15 ans, seul, en indépendant. Pas de levée de fonds, pas d&apos;équipe commerciale,
            pas de storytelling enjolivé.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Le déclencheur personnel + le constat plus large qu'il a confirmé par
// des recherches — repris fidèlement à ce qu'Axel a décrit, sans en
// rajouter (pas d'anecdote enjolivée au-delà de ce qu'il a donné).
// ============================================================
function Constat() {
  return (
    <section className="bg-surface border-y border-ink/10">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Pourquoi ce projet</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-balance">
            Le constat, avant l&apos;outil.
          </h2>
          <p className="mt-6 text-base text-ink/70 leading-relaxed">
            J&apos;ai toujours voulu construire quelque chose d&apos;utile. L&apos;idée de Compyo
            est partie d&apos;une discussion avec un ami, qui m&apos;a parlé d&apos;un problème
            qu&apos;il rencontrait dans son métier d&apos;artisan. En creusant le sujet, j&apos;ai
            réalisé que ce n&apos;était pas un cas isolé : les artisans du bâtiment passent une
            part importante de leur temps sur des tâches qui n&apos;ont rien à voir avec leur
            métier — des appels qui coupent le chantier, des devis refaits le soir à froid, des
            photos et des informations éparpillées entre la galerie du téléphone et trois
            conversations différentes.
          </p>
          <p className="mt-4 text-base text-ink/70 leading-relaxed">
            Compyo part de ce constat, et d&apos;une décision simple : construire un outil qui
            règle vraiment ce problème, sans blabla ni fonctionnalités superflues.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// Comment le produit est construit — bêta privée, itératif, avec de vrais
// artisans. Renvoie vers /beta et /pourquoi-compyo pour approfondir.
// ============================================================
function Construction() {
  return (
    <section className="bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
        <Reveal>
          <SectionLabel>Comment il est construit</SectionLabel>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-balance">
            Développé en bêta privée, avec de vrais artisans.
          </h2>
          <p className="mt-6 text-base text-ink/70 leading-relaxed">
            Compyo n&apos;est pas construit dans son coin. Le produit avance de façon itérative,
            en bêta privée, avec les retours d&apos;artisans qui l&apos;utilisent réellement sur
            leurs chantiers. Chaque retour compte et fait évoluer l&apos;outil.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/beta"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 text-ink font-medium px-6 py-3 hover:border-ink/30 hover:bg-surface hover:scale-[1.03] active:scale-[0.97] transition-all"
            >
              En savoir plus sur la bêta privée
            </Link>
            <Link
              href="/pourquoi-compyo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 text-ink font-medium px-6 py-3 hover:border-ink/30 hover:bg-surface hover:scale-[1.03] active:scale-[0.97] transition-all"
            >
              La philosophie du produit
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// CTA final, discret.
// ============================================================
function CTA() {
  return (
    <section className="bg-surface border-t border-ink/10">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
        <Reveal>
          <p className="text-base text-ink/70">
            Une question sur le projet ?{" "}
            <Link href="/contact" className="text-signal font-medium hover:text-signal-fonce transition-colors">
              Écrivez-nous.
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
