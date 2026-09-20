// ============================================================
// Le contenu propre des pages métier (20/09).
//
// Trois métiers seulement — plaquiste, menuisier, plombier — les plus
// représentés dans la liste de prospects, donc les seuls qui recevront du
// trafic réel dans les prochaines semaines. Les quinze autres adresses
// existent (voir lib/metiersPages.ts) mais restent en noindex et hors
// sitemap tant qu'elles n'ont pas, elles aussi, un texte écrit pour elles.
//
// Écrire un de ces textes, c'est décrire une SCÈNE : une heure, un lieu,
// un geste. Jamais une promesse chiffrée — "gagnez deux heures par jour"
// est invérifiable, et un artisan qui teste et ne retrouve pas le chiffre
// ne revient jamais. Le vécu, oui ; le rendement, non.
//
// Les "questions posées avant chiffrage" ne sont pas écrites ici : elles
// viennent de lib/checklistsMetier.ts, c'est-à-dire de l'application
// elle-même. Un artisan qui reconnaît ses propres questions comprend tout
// de suite que le produit a été pensé pour son métier.
// ============================================================

export type ContenuMetier = {
  /** Titre de l'onglet et des résultats de recherche. */
  titreMeta: string;
  descriptionMeta: string;
  /** Le titre de la page, court. */
  titre: string;
  /** La scène : une heure, un lieu, un geste. Deux phrases maximum. */
  scene: string;
  /** Trois choses qui changent pour ce métier-là, dans ses mots. */
  points: { titre: string; texte: string }[];
};

export const CONTENUS_METIERS: Record<string, ContenuMetier> = {
  plombier: {
    titreMeta: "Logiciel de devis pour plombier",
    descriptionMeta:
      "Compyo prépare les devis d'un plombier à partir du message du client et d'une note dictée sur place : dépannage, chauffe-eau, salle de bains. Les montants viennent de vos tarifs, vous validez chaque ligne.",
    titre: "Compyo pour un plombier.",
    scene:
      "Il est 20h05. Vous sortez d'une fuite chez un particulier, les mains encore mouillées. Le client de ce matin attend son devis pour le chauffe-eau, et vous savez déjà que vous allez le taper à table, après le repas.",
    points: [
      {
        titre: "Le dépannage d'urgence ne passe plus à la trappe.",
        texte:
          "Un message à 22 h, une photo d'un compteur qui goutte : partagez-les vers Compyo depuis votre messagerie, le projet existe avec le client et l'adresse. Vous le chiffrez quand vous avez le temps, pas dans l'urgence.",
      },
      {
        titre: "Les questions que vous posez déjà.",
        texte:
          "Âge de la chaudière, accès aux arrivées d'eau, possibilité de couper l'eau pendant l'intervention : Compyo les demande avant de chiffrer. Pas pour faire joli — pour que vous ne retourniez pas sur place à cause d'une information manquante.",
      },
      {
        titre: "Le bon taux de TVA, écrit au bon endroit.",
        texte:
          "10 % dans un logement de plus de deux ans, 20 % sur du neuf. Le taux figure sur le devis, avec les mentions obligatoires, le délai de validité et votre assurance. Compyo vous signale ce qui manque avant l'envoi.",
      },
    ],
  },

  menuisier: {
    titreMeta: "Logiciel de devis pour menuisier",
    descriptionMeta:
      "Compyo transforme un relevé de cotes dicté sur place en devis de menuiserie : fenêtres, portes, placards. Vos prix, vos questions métier, et le taux de TVA réduit là où il s'applique.",
    titre: "Compyo pour un menuisier.",
    scene:
      "Il est 19h40. Le relevé de cotes est dans le carnet, à moitié effacé par la sciure. Le client veut « un chiffre rapidement », et il y a trois fenêtres et une porte à reprendre.",
    points: [
      {
        titre: "Vos cotes, dictées devant l'ouverture.",
        texte:
          "Largeur, hauteur, matériau, dépose comprise ou non : dites-le à voix haute sur place. C'est transcrit et rangé dans le projet du client, avec les photos que vous avez prises.",
      },
      {
        titre: "Les questions du métier, avant le chiffrage.",
        texte:
          "Type de menuiserie, matériau souhaité, mesures précises disponibles, dépose de l'ancienne incluse : les mêmes que vous posez déjà au client, posées au bon moment.",
      },
      {
        titre: "Le taux réduit quand il s'applique.",
        texte:
          "5,5 % sur les menuiseries isolantes en rénovation, 10 % ailleurs : le devis porte le taux retenu et les mentions obligatoires. Le client signe en ligne, vous voyez qu'il a signé.",
      },
    ],
  },

  plaquiste: {
    titreMeta: "Logiciel de devis pour plaquiste",
    descriptionMeta:
      "Compyo transforme un métré de plaquiste en devis clair : cloisons, doublages, plafonds, bandes. Surfaces dictées sur place, prix au mètre carré à vous, devis en lots quand le chantier l'impose.",
    titre: "Compyo pour un plaquiste.",
    scene:
      "Il est 19h25. Vous avez posé des rails toute la journée, il y a de la poussière jusque dans le téléphone. Reste un métré à transformer en devis : cloisons, doublage, plafond, bandes.",
    points: [
      {
        titre: "Le métré devient un devis.",
        texte:
          "Surfaces, hauteur sous plafond, isolation à intégrer : dictez-les au fur et à mesure du relevé. Les postes se préparent avec vos prix au mètre carré, et vous corrigez ce qui doit l'être.",
      },
      {
        titre: "Les questions du métier, avant le chiffrage.",
        texte:
          "État du support existant, emplacements de prises et d'interrupteurs à prévoir, hauteur sous plafond : posées avant, pas découvertes le jour de la pose.",
      },
      {
        titre: "Des lots quand le chantier l'impose.",
        texte:
          "Cloisons, plafonds, finitions : un devis en lots reste lisible pour le client, qui comprend ce qu'il paie. Il le signe en ligne, et vous savez quand il l'a ouvert.",
      },
    ],
  },
};
