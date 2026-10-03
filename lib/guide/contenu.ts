import captures from "./captures.json";

// ============================================================
// Le guide (27/09, demande d'Axel) : « comment l'utiliser, avec des
// flèches, des images ». Huit moments de la journée d'un artisan, chacun
// en quelques étapes : une vraie capture de l'application, les boutons à
// toucher entourés (flèche s'il n'y en a qu'un, numéros ①②③ sinon), une
// ou deux phrases.
//
// Les captures (public/guide/*.webp) et la position des boutons
// (captures.json) sont produites ensemble, depuis l'application elle-même
// au format téléphone : si un écran change, on les refait ensemble.
// ============================================================

export type Cible = { x: number; y: number; w: number; h: number };
export type Capture = { largeur: number; hauteur: number; cibles: Cible[] };
export type IdCapture = keyof typeof captures;

export type EtapeGuide = {
  capture: IdCapture;
  /** Ce que l'on voit, pour un lecteur d'écran. */
  alt: string;
  texte: string;
};

export type SectionGuide = {
  id: string;
  titre: string;
  resume: string;
  etapes: EtapeGuide[];
  astuce?: string;
  lien?: { href: string; libelle: string };
};

export function lireCapture(id: IdCapture): Capture {
  return captures[id] as Capture;
}

export const SECTIONS: SectionGuide[] = [
  {
    id: "nouveau-client",
    titre: "Un client vous contacte",
    resume: "Son message devient un projet en quelques secondes.",
    etapes: [
      {
        capture: "nouveau-plus",
        alt: "L'accueil de Compyo, avec le bouton + au centre de la barre du bas.",
        texte: "Touchez + en bas de l'écran.",
      },
      {
        capture: "nouveau-choix",
        alt: "La fenêtre « Nouveau projet » et ses trois choix.",
        texte:
          "Choisissez ce que vous avez : ① le SMS ou le WhatsApp du client à coller, ② une capture d'écran de la conversation, ③ ou écrivez vous-même.",
      },
      {
        capture: "nouveau-coller",
        alt: "L'écran « Coller un message », avec le champ du message.",
        texte:
          "① « Coller le message copié », puis ② « Préparer le brouillon ». L'IA remplit le nom, le téléphone et la demande : vous relisez avant de créer le projet.",
      },
    ],
    astuce:
      "Encore plus rapide depuis WhatsApp : restez appuyé sur le message du client, « Partager », puis choisissez Compyo.",
  },
  {
    id: "chantier",
    titre: "Sur le chantier",
    resume: "Le client, vos notes, vos photos : tout sur une page.",
    etapes: [
      {
        capture: "fiche-haut",
        alt: "Le haut d'un projet : le nom du client et trois boutons.",
        texte:
          "En haut de chaque projet : ① appeler le client, ② lui envoyer un message tout prêt, ③ l'itinéraire jusqu'au chantier.",
      },
      {
        capture: "fiche-ajouter",
        alt: "La fenêtre « Ajouter au projet » : dicter, photos, note, rendez-vous.",
        texte:
          "« Ajouter » (dans le projet, ou le + du bas) : ① dicter une note, ② prendre ou choisir des photos, ③ écrire une note avec un rappel.",
      },
      {
        capture: "fiche-dicter",
        alt: "La fenêtre « Dicter une note », avec le texte dicté.",
        texte:
          "Pour dicter : parlez, relisez, corrigez si besoin, puis « Ajouter cette note au projet ». Tout se range dans le Carnet du projet.",
      },
    ],
  },
  {
    id: "devis",
    titre: "Faire le devis",
    resume: "L'IA écrit les lignes, les prix viennent de vos tarifs.",
    etapes: [
      {
        capture: "devis-ia",
        alt: "La carte « Maintenant » d'un nouveau projet et le bouton pour préparer le devis.",
        texte:
          "Dans le projet, « Préparer le devis avec l'IA » : elle écrit les lignes à partir de vos notes et de vos photos. Les prix viennent de vos tarifs, jamais de l'IA.",
      },
      {
        capture: "devis-lignes",
        alt: "Les lignes du devis, modifiables, et le bouton pour valider.",
        texte:
          "Relisez : ① chaque ligne se modifie d'un appui (texte, quantité, prix). ② Quand tout est bon : « Valider ce devis ».",
      },
      {
        capture: "devis-score",
        alt: "Le haut du devis et le résumé « points à vérifier ».",
        texte:
          "Avant d'envoyer, Compyo vous signale ce qui manque sur le document (assurance, mentions obligatoires). Vous restez libre de l'envoyer tel quel.",
      },
    ],
  },
  {
    id: "envoyer",
    titre: "Envoyer le devis et suivre la réponse",
    resume: "Votre client le lit et le signe sur son téléphone.",
    etapes: [
      {
        capture: "devis-envoyer",
        alt: "La carte « Prêt à partir » et le bouton « Envoyer par WhatsApp ».",
        texte: "« Envoyer par WhatsApp » : le devis est figé, et le message avec le lien de signature s'ouvre dans WhatsApp. C'est vous qui appuyez sur envoyer.",
      },
      {
        capture: "devis-partager",
        alt: "La carte « En attente de la réponse du client » et le bouton de partage.",
        texte:
          "« Partager » : envoyez le lien par SMS, WhatsApp ou mail. Quand votre client signe en ligne, Compyo le voit tout seul.",
      },
      {
        capture: "devis-reponse",
        alt: "La carte « Le client a répondu ? » avec les boutons Accepté et Refusé.",
        texte: "Il vous a répondu de vive voix ? Notez-le : ① accepté, ② refusé.",
      },
      {
        capture: "devis-relance",
        alt: "La carte « Maintenant » d'un devis sans réponse, avec le bouton de relance.",
        texte:
          "Pas de réponse après quelques jours ? Le projet vous propose de relancer : l'IA prépare le message, vous le relisez avant de l'envoyer.",
      },
    ],
  },
  {
    id: "facturer",
    titre: "Facturer",
    resume: "Acompte, solde, paiement : tout part du devis signé.",
    etapes: [
      {
        capture: "facture-creer",
        alt: "La partie « Facturation » d'un projet et ses deux boutons.",
        texte:
          "Devis accepté : dans le projet, ① une facture d'acompte (le montant signé est déjà rempli), ou ② la facture de solde, qui déduit les acomptes.",
      },
      {
        capture: "facture-payee",
        alt: "Une facture d'acompte émise, avec le lien « Marquer payée ».",
        texte:
          "Le client a payé ? « Marquer payée ». Ce qui reste à encaisser s'affiche sur l'accueil et dans le Bilan.",
      },
    ],
  },
  {
    id: "planning",
    titre: "Votre planning",
    resume: "Vos rendez-vous, et la météo de vos chantiers.",
    etapes: [
      {
        capture: "planning-semaine",
        alt: "Le planning de la semaine, jour par jour, et les rendez-vous du jour.",
        texte:
          "① Touchez un jour pour voir ses rendez-vous, ② puis un rendez-vous pour appeler, prévenir le client ou noter « C'est fait ».",
      },
      {
        capture: "planning-duree",
        alt: "Le formulaire d'un nouveau rendez-vous : chantier, date, heure, durée.",
        texte:
          "Pour ajouter un rendez-vous : « + Ajouter » dans le Planning. ① Choisissez le chantier, ② réglez la durée au quart d'heure près.",
      },
      {
        capture: "planning-meteo",
        alt: "Un rendez-vous avec une alerte météo et le bouton « Prévenir ».",
        texte:
          "Pluie ou vent annoncés sur un chantier extérieur ? « Prévenir » prépare le message pour votre client.",
      },
    ],
  },
  {
    id: "oublier",
    titre: "Ne rien oublier",
    resume: "L'accueil vous dit quoi faire maintenant.",
    etapes: [
      {
        capture: "journee-maintenant",
        alt: "L'accueil : la carte « Maintenant » et une question à confirmer.",
        texte:
          "Chaque jour, l'accueil vous dit quoi faire maintenant, et vous pose les questions en attente : un oui ou un non suffit.",
      },
      {
        capture: "journee-rappel",
        alt: "Un rappel qui s'affiche, avec « C'est fait » et « Plus tard ».",
        texte: "À l'heure d'un rappel : ① « C'est fait », ou ② « Plus tard » : il reste dans votre journée.",
      },
      {
        capture: "journee-soir",
        alt: "Le soir, la carte « Fermer la journée ».",
        texte:
          "Le soir, « Fermer la journée » : ce qui reste est ① fait, ou ② repoussé à demain, en un geste.",
      },
    ],
  },
  {
    id: "demarrer",
    titre: "Bien démarrer",
    resume: "Deux minutes, une seule fois.",
    etapes: [
      {
        capture: "demarrer-parametres",
        alt: "La page Paramètres et ce qui reste à compléter.",
        texte:
          "Complétez vos paramètres une fois (entreprise, assurances, tarifs) : vos devis et vos factures en ont besoin. Ce qui manque est signalé.",
      },
    ],
    lien: { href: "/installer", libelle: "Installer Compyo sur votre téléphone" },
  },
];
