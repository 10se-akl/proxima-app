import type { Metadata } from "next";
import Link from "next/link";
import { Header, Footer, Reveal } from "@/components/marketing/Cadre";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPage, filAriane, metaPage } from "@/lib/seo";

// ============================================================
// /questions-frequentes (25/09) — ce qu'un artisan demande avant
// d'essayer Compyo, et ce qu'un assistant IA a besoin de savoir pour en
// parler juste.
//
// Des réponses courtes, qui se suffisent à elles-mêmes : c'est la forme
// que Google et les assistants (ChatGPT, Perplexity, Gemini, Claude,
// Copilot) reprennent pour répondre. Rien que du vérifiable dans
// l'application ; ce qui n'existe pas encore est dit.
//
// Les questions déjà traitées ailleurs ne sont pas recopiées : sécurité
// et hébergement → /confiance ; choix d'un outil → /comparatif ; métiers
// → /metiers ; bêta → /beta. Elles sont liées depuis ici.
// ============================================================

export const metadata: Metadata = metaPage({
  titre: "Questions fréquentes sur Compyo",
  description:
    "Qu'est-ce que Compyo, combien coûte-t-il, l'IA fixe-t-elle les prix, où sont les données : les réponses courtes aux questions des artisans.",
  chemin: "/questions-frequentes",
});

type Question = { question: string; reponse: string; lien?: { href: string; texte: string } };

const THEMES: { id: string; titre: string; questions: Question[] }[] = [
  {
    id: "en-bref",
    titre: "Compyo en bref",
    questions: [
      {
        question: "Qu'est-ce que Compyo ?",
        reponse:
          "Compyo est le compagnon administratif des artisans du bâtiment. C'est une application web, utilisable sur téléphone, tablette et ordinateur, qui suit un chantier du premier message du client à la facture réglée : elle crée le projet, range les notes vocales et les photos, prépare le devis avec les prix de l'artisan, fait signer le client en ligne, puis s'occupe des factures, des relances et du planning.",
      },
      {
        question: "À qui s'adresse Compyo ?",
        reponse:
          "Aux artisans du bâtiment en France, seuls ou avec une petite équipe : électriciens, plombiers, chauffagistes, climaticiens, maçons, terrassiers, façadiers, couvreurs, charpentiers, menuisiers, plaquistes, carreleurs, peintres, vitriers, serruriers, paysagistes, piscinistes, et entreprises de rénovation. Chaque métier a ses propres questions avant chiffrage.",
        lien: { href: "/metiers", texte: "Compyo, métier par métier" },
      },
      {
        question: "Combien coûte Compyo ?",
        reponse:
          "Il n'y a pas encore de tarif public. Compyo est en bêta privée : pendant cette période, il est gratuit pour les artisans dont la candidature est acceptée.",
      },
      {
        question: "Comment obtenir un accès ?",
        reponse:
          "En remplissant la demande d'accès : quelques informations sur votre métier et votre activité. Chaque candidature est lue, avec une réponse sous 48 heures.",
        lien: { href: "/demander-acces", texte: "Demander un accès" },
      },
    ],
  },
  {
    id: "au-quotidien",
    titre: "Au quotidien",
    questions: [
      {
        question: "Comment un nouveau projet est-il créé ?",
        reponse:
          "Le plus souvent, depuis le message du client : vous partagez un SMS, un message WhatsApp, un e-mail ou une capture d'écran vers Compyo, qui en tire le nom, l'adresse, le téléphone et la demande. Vous pouvez aussi créer un projet à la main.",
      },
      {
        question: "Peut-on dicter ses notes sur le chantier ?",
        reponse:
          "Oui. Une note vocale dictée sur place est transcrite et rangée dans le projet du client, avec les photos prises au même moment. Le soir, tout est au même endroit pour chiffrer.",
      },
      {
        question: "Faut-il installer une application depuis un store ?",
        reponse:
          "Non. Compyo s'installe depuis le site, sur l'écran d'accueil du téléphone ou de l'ordinateur, et s'ouvre ensuite comme une application. Il fonctionne sur Android, iPhone, tablette et ordinateur, avec les mêmes données partout.",
        lien: { href: "/installer", texte: "Installer l'application" },
      },
      {
        question: "Compyo gère-t-il le planning ?",
        reponse:
          "Oui : rendez-vous et chantiers dans un même planning, où un créneau pris ne peut pas l'être deux fois. Pour les métiers d'extérieur, un chantier prévu un jour de forte pluie ou de vent fort est signalé à l'avance.",
      },
    ],
  },
  {
    id: "devis-factures",
    titre: "Devis et factures",
    questions: [
      {
        question: "Comment Compyo prépare-t-il un devis ?",
        reponse:
          "À partir de ce qui est dans le projet — le message du client, vos notes, vos photos — l'IA propose les lignes du devis. Les montants, eux, viennent d'un calcul fixe fondé sur vos taux horaires, vos prix et votre marge. Vous relisez et corrigez chaque ligne avant l'envoi. Pour une intervention simple, le devis express se remplit à la main, sans IA.",
      },
      {
        question: "Les mentions obligatoires figurent-elles sur les devis et les factures ?",
        reponse:
          "Oui, depuis vos paramètres : taux de TVA ou mention de franchise (« TVA non applicable, art. 293 B du CGI »), délai de validité, assurance décennale et responsabilité civile professionnelle, médiateur de la consommation. Compyo signale ce qui manque avant l'envoi.",
      },
      {
        question: "Le client peut-il signer le devis en ligne ?",
        reponse:
          "Oui. Il reçoit un lien, consulte le devis sur son téléphone ou son ordinateur, puis l'accepte en le signant, ou le refuse. Vous voyez aussitôt sa réponse.",
      },
      {
        question: "Compyo fait-il aussi les factures ?",
        reponse:
          "Oui, depuis le devis accepté : facture d'acompte, facture de solde qui déduit les acomptes, avoir, avec une numérotation continue et un export pour la comptabilité. Les relances de paiement sont préparées en brouillon ; vous décidez de les envoyer.",
      },
    ],
  },
  {
    id: "ia-controle",
    titre: "L'IA, et qui décide",
    questions: [
      {
        question: "L'IA fixe-t-elle les prix des devis ?",
        reponse:
          "Non. L'IA aide à rédiger et à ranger ; aucun prix n'est inventé ou estimé par un modèle de langage. Les montants sont calculés à partir des coûts, de la marge et de la TVA que l'artisan a lui-même paramétrés.",
      },
      {
        question: "Compyo envoie-t-il des messages à mes clients sans moi ?",
        reponse:
          "Jamais. Devis, factures, relances, messages : rien ne part chez un client sans votre validation explicite.",
      },
      {
        question: "Compyo est-il un chatbot ?",
        reponse:
          "Non. Il n'y a pas de fenêtre où poser des questions à une IA. Compyo agit sur ce que vous lui donnez — un message de client, une note vocale, une photo — pour ranger, préparer et rappeler, et vous laisse décider.",
        lien: { href: "/pourquoi-compyo", texte: "Un copilote, pas un remplaçant" },
      },
      {
        question: "Où sont hébergées les données ?",
        reponse:
          "La base de données est hébergée dans l'Union européenne (Supabase, région de Stockholm), le site chez Vercel ; les données sont chiffrées pendant leur transport et à leur stockage. Chaque entreprise ne voit que ses propres données.",
        lien: { href: "/confiance", texte: "Sécurité et transparence" },
      },
    ],
  },
];

const TOUTES = THEMES.flatMap((t) => t.questions);

export default function PageQuestionsFrequentes() {
  return (
    <div className="bg-paper text-ink">
      <JsonLd
        donnees={filAriane([
          { nom: "Accueil", chemin: "/" },
          { nom: "Questions fréquentes", chemin: "/questions-frequentes" },
        ])}
      />
      <JsonLd donnees={faqPage(TOUTES)} />
      <Header />
      <main className="px-5 sm:px-8">
        <section className="mx-auto max-w-3xl pt-14 sm:pt-24">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-steel">Questions fréquentes</p>
            <h1 className="mt-6 text-balance font-display text-[2.4rem] font-semibold leading-[1.0] tracking-[-0.03em] text-ink sm:text-6xl">
              Tout ce qu&apos;on nous demande sur Compyo.
            </h1>
            <p className="mt-7 text-[17px] leading-relaxed text-ink/70">
              Des réponses courtes. Pour aller plus loin :{" "}
              <Link href="/fonctionnalites" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
                les fonctionnalités
              </Link>
              ,{" "}
              <Link href="/comparatif" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
                le comparatif
              </Link>{" "}
              ou{" "}
              <Link href="/beta" className="font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal">
                la bêta privée
              </Link>
              .
            </p>
            <nav aria-label="Thèmes" className="mt-8 flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 py-2 text-[13.5px] font-medium text-ink/75 ring-1 ring-ink/10 transition hover:text-ink hover:ring-ink/25"
                >
                  {t.titre}
                </a>
              ))}
            </nav>
          </Reveal>
        </section>

        {THEMES.map((theme) => (
          <section key={theme.id} id={theme.id} aria-labelledby={`titre-${theme.id}`} className="mx-auto max-w-3xl scroll-mt-24 pt-20 sm:pt-28">
            <h2 id={`titre-${theme.id}`} className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
              {theme.titre}
            </h2>
            <div className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
              {theme.questions.map((q) => (
                <Reveal key={q.question}>
                  <div className="py-7">
                    <h3 className="text-[17px] font-semibold leading-snug text-ink">{q.question}</h3>
                    <p className="mt-3 text-[15.5px] leading-relaxed text-ink/70">{q.reponse}</p>
                    {q.lien && (
                      <Link
                        href={q.lien.href}
                        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-signal"
                      >
                        {q.lien.texte} <span aria-hidden>→</span>
                      </Link>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        <section className="mx-auto max-w-3xl py-24 text-center sm:py-32">
          <h2 className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl">
            Une autre question ?
          </h2>
          <p className="mt-4 text-[16px] text-ink/65">Chaque message est lu personnellement.</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
            <Link
              href="/demander-acces"
              className="inline-flex rounded-full bg-signal px-8 py-4 text-[15px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Rejoindre la bêta
            </Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center text-[15px] font-medium text-ink underline decoration-ink/25 underline-offset-8 hover:decoration-ink">
              Nous écrire
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
