import Link from "next/link";
import { Header, Footer } from "@/components/marketing/Cadre";
import { SectionSecurite } from "@/components/marketing/SectionSecurite";
import "./carnet.css";

// ============================================================
// La page Fonctionnalités, refaite le 15/11/2026 selon la fiche de marque
// (docs/marque-site.md) : le même carnet que l'accueil, de vraies captures
// de l'application (public/guide/, version téléphone claire) à la place des
// écrans dessinés, des phrases courtes, « IA » hors des titres, et ce que
// Compyo ne fait pas dit franchement.
//
// Les ancres #import, #notes-vocales, #devis et #planning sont gardées :
// d'autres pages y renvoient. Chaque phrase décrit une fonction qui existe
// dans l'application ; en retirer une de l'application, c'est la retirer ici.
// ============================================================

const INSCRIPTION = "/demander-acces";

type Fonction = {
  id: string;
  etiquette: string;
  titre: string;
  texte: string;
  points: string[];
  image: { src: string; alt: string; largeur: number; hauteur: number; telephone: boolean };
};

const FONCTIONS: Fonction[] = [
  {
    id: "import",
    etiquette: "Le message du client",
    titre: "Un message devient un projet.",
    texte:
      "Vous partagez ou collez le SMS, le WhatsApp ou une capture d’écran. Compyo retrouve le client, le besoin et l’adresse, et prépare le projet. Vous relisez avant de créer.",
    points: [
      "Un client déjà connu est reconnu à son numéro.",
      "Un « bien reçu » est prêt : vous l’envoyez de votre téléphone.",
    ],
    image: {
      src: "/guide/nouveau-coller-telephone-clair.webp",
      alt: "Capture de Compyo : l’écran « Coller un message », avec le message d’un client et le bouton « Préparer le projet ».",
      largeur: 780,
      hauteur: 1688,
      telephone: true,
    },
  },
  {
    id: "notes-vocales",
    etiquette: "Sur le chantier",
    titre: "Photo, dictée, note : tout va dans le carnet.",
    texte:
      "En sortant du rendez-vous, vous dictez : Compyo écrit. Les photos et les notes se rangent dans le bon chantier, par date.",
    points: [
      "Un rappel en un appui : demain 8 h, lundi, ou la date de votre choix.",
      "Appeler, écrire au client, lancer l’itinéraire : un bouton chacun.",
    ],
    image: {
      src: "/guide/fiche-note-telephone-clair.webp",
      alt: "Capture de Compyo : une note sur la fiche d’un chantier, avec le bouton « Dicter » et les rappels « Demain 8 h » et « Lundi 8 h ».",
      largeur: 780,
      hauteur: 1688,
      telephone: true,
    },
  },
  {
    id: "devis",
    etiquette: "Le devis",
    titre: "Compyo propose les lignes. Les prix, c’est vous.",
    texte:
      "À partir de la demande et de vos notes, Compyo propose les postes et les quantités : vous les vérifiez. Les prix viennent de vos tarifs, ou d’un tarif de référence que vous ajustez. Les totaux suivent un calcul fixe.",
    points: [
      "TVA à 20, 10 ou 5,5 %, ou franchise de TVA.",
      "Les mentions obligatoires sont contrôlées avant l’envoi.",
      "Le client signe en ligne, au doigt, sur son téléphone.",
      "Devis express pour un dépannage déjà chiffré sur place.",
    ],
    image: {
      src: "/guide/devis-ia-telephone-clair.webp",
      alt: "Capture de Compyo : sur un projet pas encore chiffré, le bouton « Préparer le devis » et la mention « Vous relisez avant l’envoi ».",
      largeur: 780,
      hauteur: 392,
      telephone: false,
    },
  },
  {
    id: "factures",
    etiquette: "Relances et factures",
    titre: "Relancer sans y penser. Facturer sans rien retaper.",
    texte:
      "Un devis reste sans réponse : une relance est prête au bout de 5 jours, puis de 10. C’est vous qui êtes prévenu, jamais le client. Vous décidez de l’envoyer.",
    points: [
      "Facture d’acompte, de solde et avoir, avec une numérotation continue.",
      "Rappel de paiement déjà rédigé, que vous envoyez vous-même.",
      "Export pour votre comptable.",
    ],
    image: {
      src: "/guide/devis-relance-telephone-clair.webp",
      alt: "Capture de Compyo : « Devis sans réponse, envoyé il y a 6 jours », avec le bouton « Préparer une relance ».",
      largeur: 780,
      hauteur: 444,
      telephone: false,
    },
  },
  {
    id: "planning",
    etiquette: "Le planning",
    titre: "Une semaine sans double rendez-vous.",
    texte:
      "Rendez-vous et chantiers sont au même endroit. Compyo vous arrête avant d’enregistrer deux rendez-vous à la même heure.",
    points: [
      "La météo est signalée pour les chantiers dehors.",
      "« Prévenir le client » : le message est prêt, vous l’envoyez.",
    ],
    image: {
      src: "/guide/planning-semaine-telephone-clair.webp",
      alt: "Capture de Compyo : le planning de la semaine, avec une alerte « Météo à risque » et le bouton « Prévenir le client ».",
      largeur: 780,
      hauteur: 1688,
      telephone: true,
    },
  },
  {
    id: "aujourdhui",
    etiquette: "Chaque matin",
    titre: "Ce qui compte aujourd’hui, et rien d’autre.",
    texte: "Le rendez-vous en cours, ce qui reste à encaisser, les devis à relancer et vos rappels, sur un seul écran.",
    points: [
      "Le mois en trois chiffres : signé, encaissé, à encaisser.",
      "En équipe : apprenti, associé ou conjoint partagent les mêmes projets.",
    ],
    image: {
      src: "/guide/journee-maintenant-telephone-clair.webp",
      alt: "Capture de Compyo : l’écran « Aujourd’hui », avec le rendez-vous en cours, le montant à encaisser et la journée.",
      largeur: 780,
      hauteur: 1688,
      telephone: true,
    },
  },
];

const AUSSI: Array<[string, string]> = [
  ["17 métiers et la rénovation", "Les questions à poser avant de chiffrer changent d’un métier à l’autre."],
  ["Vos postes fréquents", "Compyo retient ce que vous chiffrez souvent, avec votre prix."],
  ["Les oublis signalés", "Dépose, protection, évacuation : proposés, jamais ajoutés tout seuls."],
  ["Le rappel d’entretien", "Dans 3, 6 ou 12 mois, pour les contrats et les visites qui reviennent."],
  ["Le compte rendu dicté", "Compyo en tire les tâches qui restent et un message pour le client, à relire."],
  ["Sur l’écran d’accueil", "Compyo s’installe depuis le navigateur, sur Android, iPhone et ordinateur."],
];

const PAS_ENCORE: string[] = [
  "Pas de comptabilité : un export pour votre comptable.",
  "Pas encore une plateforme agréée pour la facture électronique.",
  "Pas d’utilisation complète sans réseau.",
  "Pas de gestion de stock ni de pointage des heures.",
];

function Coche() {
  return (
    <svg className="coche" viewBox="0 0 34 34" aria-hidden="true">
      <path d="M5 18l8 8L29 8" />
    </svg>
  );
}

export function PageFonctionnalites() {
  return (
    <>
      <Header />
      <div className="carnet">
        <main id="contenu">
          <section className="page-tete">
            <div className="cadre">
              <p className="etiquette">Fonctionnalités</p>
              <h1>Du premier message à la facture payée.</h1>
              <p className="chapeau">
                Ce que fait Compyo, écran par écran. Les images sont de vraies captures de l’application, avec des
                données de démonstration.
              </p>
              <div className="actions">
                <Link className="btn btn-cordeau" href={INSCRIPTION}>
                  Essayer gratuitement
                </Link>
              </div>
              <p className="hero-mention">Gratuit pendant la bêta, sans carte bancaire.</p>
            </div>
          </section>

          <div className="fonctions">
            {FONCTIONS.map((f, i) => (
              <section key={f.id} id={f.id} className={`fonction${i % 2 ? " fonction-papier" : ""}`} aria-labelledby={`titre-${f.id}`}>
                <div className="cadre fonction-grille">
                  <div className="fonction-texte">
                    <p className="etiquette">{f.etiquette}</p>
                    <h2 id={`titre-${f.id}`}>{f.titre}</h2>
                    <p className="chapeau">{f.texte}</p>
                    <ul className="points">
                      {f.points.map((p) => (
                        <li key={p}>
                          <Coche />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <figure className={`fonction-visuel${f.image.telephone ? "" : " large"}`}>
                    <div className={f.image.telephone ? "capture-cadre" : "capture-large"}>
                      <img
                        src={f.image.src}
                        alt={f.image.alt}
                        width={f.image.largeur}
                        height={f.image.hauteur}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>
                  </figure>
                </div>
              </section>
            ))}
          </div>

          <section className="section" aria-labelledby="titre-aussi">
            <div className="cadre">
              <h2 id="titre-aussi" className="titre-section">
                Aussi dans Compyo.
              </h2>
              <dl className="aussi">
                {AUSSI.map(([titre, texte]) => (
                  <div key={titre}>
                    <dt>{titre}</dt>
                    <dd>{texte}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="section section-papier" aria-labelledby="titre-pas">
            <div className="cadre">
              <p className="etiquette">Pour être franc</p>
              <h2 id="titre-pas" className="titre-section">
                Ce que Compyo ne fait pas.
              </h2>
              <ul className="pas-encore">
                {PAS_ENCORE.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="chapeau" style={{ marginTop: 20 }}>
                Et une règle qui ne bouge pas : Compyo prépare, vous décidez. Rien ne part chez un client sans votre geste.
              </p>
            </div>
          </section>
        </main>
      </div>

      {/* La sécurité et les données : le composant commun avec la page
          Confiance, sous la couche « Lisibilité du site » de globals.css. */}
      <SectionSecurite />

      <div className="carnet" style={{ minHeight: 0 }}>
        <section className="section appel" aria-labelledby="titre-appel">
          <div className="cadre">
            <h2 id="titre-appel" className="titre-section">
              Le plus simple, c’est d’essayer.
            </h2>
            <div className="actions">
              <Link className="btn btn-cordeau" href={INSCRIPTION}>
                Essayer gratuitement
              </Link>
              <Link className="btn btn-ligne" href="/comment-ca-fonctionne">
                Voir un chantier de A à Z
              </Link>
            </div>
            <p className="hero-mention" style={{ marginTop: 16 }}>
              Gratuit pendant la bêta, sans carte bancaire. Votre espace s’ouvre tout de suite.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
