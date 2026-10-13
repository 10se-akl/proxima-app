import captures from "./captures.json";

// ============================================================
// Le guide (27/09, demande d'Axel) : « comment l'utiliser, avec des
// flèches, des images ». Huit moments de la journée d'un artisan, chacun
// en quelques étapes : une vraie capture de l'application, les boutons à
// toucher entourés (flèche s'il n'y en a qu'un, numéros ①②③ sinon), une
// ou deux phrases.
//
// 13/10 — refait pour l'application d'aujourd'hui (les captures dataient
// d'avant la refonte du 04/10), en deux versions : téléphone et
// ordinateur, chacune avec sa capture et, quand le geste diffère, son
// texte (« Touchez + en bas » / « Cliquez sur Nouveau projet »). Une
// étape sans capture (l'éditeur de devis, la facturation) n'a que son
// texte : mieux vaut pas d'image qu'une image fausse.
//
// Les captures (public/guide/*.webp) et la position des boutons
// (captures.json) se refont ensemble, depuis les bancs d'essai locaux :
//   node refonte-maquettes/outils/captures-guide.mjs   (guide.json)
//   python refonte-maquettes/outils/guide-webp.py
// ============================================================

export type Cible = { x: number; y: number; w: number; h: number };
export type Capture = { largeur: number; hauteur: number; cibles: Cible[] };
export type IdCapture = keyof typeof captures;
export type Appareil = "telephone" | "ordinateur";

export type EtapeGuide = {
  /** Sans capture : l'étape n'a que son texte. */
  capture?: IdCapture;
  /** Ce que l'on voit, pour un lecteur d'écran. */
  alt?: string;
  texte: string;
  /** Sur ordinateur, quand le geste diffère. */
  texteOrdinateur?: string;
};

export type SectionGuide = {
  id: string;
  titre: string;
  resume: string;
  etapes: EtapeGuide[];
  astuce?: string;
  lien?: { href: string; libelle: string };
};

/** La capture d'une étape pour un appareil, ou null s'il n'y en a pas. */
export function lireCapture(id: IdCapture, appareil: Appareil): Capture | null {
  const pour = (captures as Record<string, Partial<Record<Appareil, Capture>>>)[id];
  return pour?.[appareil] ?? null;
}

export const SECTIONS: SectionGuide[] = [
  {
    id: "nouveau-client",
    titre: "Un client vous contacte",
    resume: "Son message devient un projet en quelques secondes.",
    etapes: [
      {
        capture: "nouveau-plus",
        alt: "L'accueil de Compyo et le bouton pour créer un projet.",
        texte: "Touchez + en bas de l'écran.",
        texteOrdinateur: "Cliquez sur « Nouveau projet », en haut à gauche.",
      },
      {
        capture: "nouveau-choix",
        alt: "La fenêtre « Nouveau projet » et ses choix.",
        texte:
          "Choisissez ce que vous avez : ① le SMS ou le WhatsApp du client à coller, ② une capture d'écran de la conversation, ③ ou écrivez vous-même.",
      },
      {
        capture: "nouveau-coller",
        alt: "L'écran « Coller un message », avec le champ du message.",
        texte:
          "① « Coller le message copié », puis ② « Préparer le projet ». Compyo remplit le nom, le téléphone et la demande : vous relisez avant de créer le projet.",
      },
    ],
    astuce:
      "Encore plus rapide sur Android, depuis WhatsApp : restez appuyé sur le message du client, « Partager », puis choisissez Compyo.",
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
        alt: "La carte « Maintenant » d'un chantier, puis les boutons Photo, Dicter et Note.",
        texte:
          "Dans chaque projet : ① une photo, ② une note dictée, ③ une note écrite. Tout se range dans le Carnet du projet, plus bas sur la page.",
      },
      {
        capture: "fiche-note",
        alt: "La fenêtre « Note » : le texte, le rappel et le bouton Enregistrer.",
        texte: "Écrivez ce qu'il ne faut pas oublier, choisissez en un appui ① quand Compyo vous le rappelle, puis ② « Enregistrer ».",
        texteOrdinateur: "Écrivez ce qu'il ne faut pas oublier, choisissez en un clic ① quand Compyo vous le rappelle, puis ② « Enregistrer ».",
      },
    ],
  },
  {
    id: "devis",
    titre: "Faire le devis",
    resume: "Compyo écrit les lignes, les prix viennent de vos tarifs.",
    etapes: [
      {
        capture: "devis-ia",
        alt: "La carte « Maintenant » d'un nouveau projet et le bouton pour préparer le devis.",
        texte:
          "Dans le projet, « Préparer le devis » : Compyo écrit les lignes à partir de la demande, de vos notes et de vos photos. Les prix viennent de vos tarifs, jamais d'une estimation.",
      },
      {
        texte:
          "Relisez chaque ligne : touchez-la pour changer ce qui est fait, la quantité ou le prix. Quand tout est bon : « Valider le devis ».",
        texteOrdinateur:
          "Relisez chaque ligne et changez directement ce qui est fait, la quantité ou le prix. Quand tout est bon : « Valider sans l'envoyer ».",
      },
      {
        texte:
          "Avant l'envoi, Compyo signale ce qui manque sur le document (assurance, mentions obligatoires) et vous laisse le compléter sur place.",
      },
    ],
    astuce: "Pour une petite intervention chiffrée sur place : « … » dans le projet, puis « Faire le devis moi-même ».",
  },
  {
    id: "envoyer",
    titre: "Envoyer le devis et suivre la réponse",
    resume: "Votre client le lit et le signe sur son téléphone.",
    etapes: [
      {
        texte:
          "« Envoyer par WhatsApp » (ou par SMS) : le devis est figé, et le message avec le lien de signature s'ouvre dans votre messagerie. C'est vous qui appuyez sur envoyer.",
      },
      {
        texte:
          "Votre client signe en ligne : Compyo le voit tout seul. Il vous a répondu de vive voix ? Notez-le dans le devis : « Accepté » ou « Refusé ».",
      },
      {
        capture: "devis-relance",
        alt: "La carte « Maintenant » d'un devis sans réponse, avec le bouton de relance.",
        texte:
          "Pas de réponse après quelques jours ? « Préparer une relance » : le message est prêt, vous le relisez avant de l'envoyer.",
      },
    ],
  },
  {
    id: "facturer",
    titre: "Facturer",
    resume: "Acompte, solde, paiement : tout part du devis signé.",
    etapes: [
      {
        texte:
          "Devis signé : dans le projet, partie Argent, « Facture d'acompte » (le montant signé est déjà rempli) ou « Facture de solde », qui déduit les acomptes. Une facture numérotée est définitive : Compyo vous le redemande avant de la créer.",
      },
      {
        texte: "Le client a payé ? « Marquer payée ». Ce qui reste à encaisser s'affiche dans Argent.",
      },
    ],
    astuce: "Pour créer une facture, votre SIRET doit être rempli : Paramètres, puis « Mentions légales ».",
  },
  {
    id: "planning",
    titre: "Votre planning",
    resume: "Vos rendez-vous, et la météo de vos chantiers.",
    etapes: [
      {
        capture: "planning-semaine",
        alt: "Le planning des sept prochains jours, jour par jour.",
        texte:
          "Vos sept prochains jours : ① touchez un rendez-vous pour l'ouvrir (appeler, prévenir le client, noter « Fait »), ② un jour libre pour y planifier quelque chose.",
        texteOrdinateur: "Votre semaine en grille : cliquez sur un rendez-vous pour l'ouvrir.",
      },
      {
        capture: "planning-planifier",
        alt: "La fenêtre « Quand ? » : les jours, le moment, et le bouton Planifier.",
        texte:
          "Depuis un projet : « … » puis « Planifier un rendez-vous ». Choisissez le jour, ① le moment (matin, après-midi, journée ou une heure précise), puis ② « Planifier ». Compyo propose ensuite de prévenir le client.",
      },
      {
        capture: "planning-meteo",
        alt: "Un rendez-vous avec une alerte météo et le bouton « Prévenir ».",
        texte: "Pluie ou vent annoncés sur un chantier extérieur ? « Prévenir » prépare le message pour votre client.",
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
        alt: "L'accueil : la carte « Maintenant », puis les chiffres du jour.",
        texte:
          "Chaque jour, l'accueil vous dit quoi faire maintenant, avec l'itinéraire en un appui. Dessous : vos chiffres du jour, ce qui vous attend aujourd'hui et ce qui reste à régler.",
      },
      {
        capture: "journee-rappel",
        alt: "Un rappel qui s'affiche, avec « C'est fait » et « Plus tard ».",
        texte: "À l'heure d'un rappel : ① « C'est fait », ou ② « Plus tard » : il reste dans votre journée.",
      },
      {
        capture: "journee-aregler",
        alt: "Le bloc « À régler » : un chantier terminé ? Oui ou Pas encore.",
        texte:
          "Ce qui est passé sans réponse attend dans « À régler » : vous répondez d'un geste, par exemple ① oui, le chantier est terminé, ou ② pas encore. Le soir, quand tout est réglé, l'écran vous le dit.",
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
          "Complétez une fois vos paramètres (entreprise, mentions légales, assurances, tarifs) : vos devis et vos factures en ont besoin, et ce qui manque est signalé. Ils sont derrière vos initiales, en haut à droite.",
        texteOrdinateur:
          "Complétez une fois vos paramètres (entreprise, mentions légales, assurances, tarifs) : vos devis et vos factures en ont besoin, et ce qui manque est signalé. Ils sont en bas de la barre de gauche.",
      },
    ],
    lien: { href: "/installer", libelle: "Installer Compyo" },
  },
];
