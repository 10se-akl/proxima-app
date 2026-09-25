// ============================================================
// Le contenu propre des pages métier.
//
// 20/09 : trois métiers écrits (plaquiste, menuisier, plombier).
// 25/09 : les quinze autres, et pour chacun une FAQ et ses métiers
// voisins. Chaque page a désormais un texte qui lui appartient — une
// scène, trois points, des questions-réponses — et peut entrer dans
// l'index sans être une copie des autres.
//
// Écrire un de ces textes, c'est décrire une SCÈNE : une heure, un lieu,
// un geste. Jamais une promesse chiffrée — "gagnez deux heures par jour"
// est invérifiable, et un artisan qui teste et ne retrouve pas le chiffre
// ne revient jamais. Le vécu, oui ; le rendement, non.
//
// Les FAQ répondent aux questions qu'un artisan pose à Google ou à un
// assistant IA (« quel logiciel de devis pour un électricien ? », « quel
// taux de TVA ? »). Deux règles :
//   - rien que des fonctions réelles de l'application : projet créé
//     depuis un message, note vocale, photos, questions avant chiffrage,
//     devis avec les prix de l'artisan, lots, TVA, mentions obligatoires
//     (décennale, validité, médiateur, franchise de TVA), signature en
//     ligne, acompte, facture, avoir, relance en brouillon, planning sans
//     double réservation, alerte météo (métiers d'extérieur), rappel
//     d'entretien récurrent, devis express ;
//   - pour la TVA, la règle générale et ses conditions, jamais un conseil
//     fiscal : le taux dépend du chantier, c'est l'artisan qui le choisit.
//
// Les "questions posées avant chiffrage" ne sont pas écrites ici : elles
// viennent de lib/checklistsMetier.ts, c'est-à-dire de l'application
// elle-même.
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
  /** Les questions qu'un artisan de ce métier pose vraiment. */
  faq: { question: string; reponse: string }[];
  /** Métiers voisins (slugs), proposés en bas de page. */
  proches: string[];
};

export const CONTENUS_METIERS: Record<string, ContenuMetier> = {
  plombier: {
    titreMeta: "Logiciel de devis et factures pour plombier",
    descriptionMeta:
      "Devis de plombier préparés depuis le message du client et votre note dictée : dépannage, chauffe-eau, salle de bains. Vos tarifs, votre validation.",
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
    faq: [
      {
        question: "Quel logiciel de devis choisir quand on est plombier ?",
        reponse:
          "Un logiciel qui suit le vrai rythme d'un plombier : des demandes qui arrivent par SMS ou WhatsApp à toute heure, des dépannages chiffrés sur place et des chantiers plus longs (salle de bains, chauffe-eau). Compyo crée le projet depuis le message du client, range vos photos et vos notes dictées, prépare le devis avec vos propres prix et le fait signer en ligne. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Peut-on faire le devis d'un dépannage directement chez le client ?",
        reponse:
          "Oui. Le devis express se remplit à la main en quelques lignes, sans passer par l'IA, pour une intervention chiffrée sur place. Le client le signe sur son téléphone, et la facture se fait ensuite depuis ce devis.",
      },
      {
        question: "Quel taux de TVA sur un devis de plomberie ?",
        reponse:
          "En général 10 % pour des travaux dans un logement achevé depuis plus de deux ans, 20 % dans le neuf ou pour un local professionnel, et 5,5 % pour certains équipements d'économie d'énergie qui répondent aux critères de performance. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis avec les mentions obligatoires.",
      },
      {
        question: "Compyo repère-t-il une urgence dans un message de client ?",
        reponse:
          "Quand vous partagez un message ou dictez une note, Compyo en tire un brouillon de projet et signale s'il s'agit d'une urgence (fuite active, dégât des eaux). Vous gardez la main : rien n'est envoyé au client sans votre validation.",
      },
    ],
    proches: ["chauffagiste", "climaticien", "carreleur"],
  },

  menuisier: {
    titreMeta: "Logiciel de devis et factures pour menuisier",
    descriptionMeta:
      "Vos cotes dictées devant l'ouverture deviennent un devis de menuiserie : fenêtres, portes, placards. Vos prix, et la TVA réduite quand elle s'applique.",
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
    faq: [
      {
        question: "Quel logiciel de devis pour un menuisier ?",
        reponse:
          "Pour un menuisier, le devis part d'un relevé : des cotes, un matériau, une dépose. Compyo vous laisse dicter ce relevé devant l'ouverture, le range dans le projet du client avec les photos, puis prépare le devis avec vos prix. Vous relisez chaque ligne avant l'envoi et le client signe en ligne.",
      },
      {
        question: "Quel taux de TVA pour des fenêtres en rénovation ?",
        reponse:
          "5,5 % pour des menuiseries isolantes qui répondent aux critères de performance thermique, dans un logement de plus de deux ans ; 10 % pour les autres travaux de rénovation dans un logement de plus de deux ans ; 20 % dans le neuf. Vous choisissez le taux selon le chantier, Compyo l'écrit sur le devis.",
      },
      {
        question: "Peut-on demander un acompte à la commande des menuiseries ?",
        reponse:
          "Oui. Une fois le devis signé, vous émettez la facture d'acompte depuis ce devis, du montant que vous fixez ; la facture de solde la déduit.",
      },
      {
        question: "Mes cotes sont-elles gardées si je change de chantier ?",
        reponse:
          "Tout ce que vous dictez ou photographiez est rangé dans le projet du client : vous retrouvez les cotes de la cuisine de Mme Martin dans son projet, pas au milieu d'un carnet.",
      },
    ],
    proches: ["vitrier", "plaquiste", "charpentier"],
  },

  plaquiste: {
    titreMeta: "Logiciel de devis et factures pour plaquiste",
    descriptionMeta:
      "Votre métré devient un devis de plâtrerie clair : cloisons, doublages, plafonds, bandes. Prix au m² à vous, devis en lots, signature en ligne.",
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
    faq: [
      {
        question: "Quel logiciel de devis pour un plaquiste ?",
        reponse:
          "Un plaquiste chiffre au mètre carré, à partir d'un métré. Compyo vous laisse dicter les surfaces pendant le relevé, prépare les postes avec vos prix au mètre carré et organise le devis en lots (cloisons, doublages, plafonds, finitions). Vous validez chaque ligne avant l'envoi.",
      },
      {
        question: "Quel taux de TVA pour un doublage isolé ?",
        reponse:
          "Une isolation thermique qui répond aux critères de performance, dans un logement de plus de deux ans, peut relever du taux de 5,5 % ; les autres travaux de plâtrerie en rénovation sont en général à 10 %, et à 20 % dans le neuf. Le taux dépend du chantier et des matériaux : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Compyo convient-il à un plaquiste auto-entrepreneur ?",
        reponse:
          "Oui. Si vous êtes en franchise de TVA, vos devis et factures portent la mention « TVA non applicable, art. 293 B du CGI » au lieu d'un taux, avec les autres mentions obligatoires.",
      },
    ],
    proches: ["peintre", "menuisier", "carreleur"],
  },

  electricien: {
    titreMeta: "Logiciel de devis et factures pour électricien",
    descriptionMeta:
      "Devis d'électricien préparés depuis vos notes et photos de chantier : mise aux normes, tableau, rénovation. Vos prix, des lots clairs, signature en ligne.",
    titre: "Compyo pour un électricien.",
    scene:
      "Il est 18h50. Le tableau est ouvert depuis ce matin, la moitié des circuits sont étiquetés au feutre. Le client veut un prix pour la mise aux normes avant ce soir.",
    points: [
      {
        titre: "Le tableau photographié, pas recopié.",
        texte:
          "Les photos du tableau et des gaines se rangent dans le projet du client pendant que vous travaillez. Le soir, vous chiffrez en les ayant sous les yeux, sans rouvrir la galerie du téléphone.",
      },
      {
        titre: "Les questions de l'électricien, avant le chiffrage.",
        texte:
          "Tableau à refaire ou non, nombre de points lumineux et de prises, présence d'un différentiel, accès aux gaines, possibilité de couper le courant : Compyo les pose avant, pour ne rien découvrir le jour des travaux.",
      },
      {
        titre: "Un devis en lots, lisible par le client.",
        texte:
          "Tableau, circuits, appareillage, main-d'œuvre : chaque lot a son sous-total. Le client comprend ce qu'il paie, signe en ligne, et vous voyez qu'il a signé.",
      },
    ],
    faq: [
      {
        question: "Quel est le meilleur logiciel de devis pour un électricien ?",
        reponse:
          "Celui qui colle à votre façon de travailler. Compyo part de ce que vous faites déjà sur le chantier — des photos du tableau, quelques phrases dictées — et prépare le devis avec vos prix, en lots, avec le bon taux de TVA et les mentions obligatoires. Il est pensé pour être utilisé sur téléphone, entre deux interventions. Il est en bêta privée gratuite, sur candidature ; un logiciel de facturation établi depuis longtemps aura plus de recul et de fonctions annexes.",
      },
      {
        question: "Quel taux de TVA pour une mise aux normes électrique ?",
        reponse:
          "En général 10 % pour des travaux dans un logement achevé depuis plus de deux ans, et 20 % dans le neuf ou pour un local professionnel. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Peut-on faire un devis d'électricité depuis son téléphone ?",
        reponse:
          "Oui. Compyo s'installe comme une application sur le téléphone. Vous dictez le relevé, prenez les photos, et le devis se prépare dans le projet du client ; vous le relisez et l'envoyez depuis le téléphone ou, le soir, depuis l'ordinateur.",
      },
      {
        question: "L'IA fixe-t-elle mes prix ?",
        reponse:
          "Non. L'IA aide à rédiger les lignes à partir de vos notes ; les montants viennent d'un calcul fixe, basé sur vos taux horaires, vos prix et votre marge. Rien n'est envoyé au client sans que vous l'ayez relu.",
      },
    ],
    proches: ["climaticien", "chauffagiste", "plombier"],
  },

  chauffagiste: {
    titreMeta: "Logiciel de devis et factures pour chauffagiste",
    descriptionMeta:
      "Chiffrez vite un remplacement de chaudière, repérez les urgences et rappelez vos clients pour l'entretien annuel. Vos prix, votre validation.",
    titre: "Compyo pour un chauffagiste.",
    scene:
      "Il est 17h30, fin octobre. Chaudière en panne, quatorze degrés dans la maison : le devis de remplacement doit partir ce soir, et trois clients attendent déjà leur entretien annuel.",
    points: [
      {
        titre: "L'urgence repérée dès le message.",
        texte:
          "« Plus de chauffage, bébé à la maison » : partagé vers Compyo, le message devient un projet marqué urgent. Il ne se perd pas entre deux entretiens.",
      },
      {
        titre: "Les questions du chauffage, avant de chiffrer.",
        texte:
          "Type d'énergie, âge et état de l'appareil, nombre de pièces ou de radiateurs, évacuation des fumées, contrat d'entretien en cours : les réponses sont là avant le devis, pas après.",
      },
      {
        titre: "L'entretien annuel, sans carnet de rappels.",
        texte:
          "Un clic sur la fiche du client programme son rappel d'entretien. L'an prochain, Compyo vous le rappelle au bon moment, avec l'historique de ses interventions.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel pour un chauffagiste ?",
        reponse:
          "Un chauffagiste alterne dépannages urgents, remplacements d'appareils et entretiens annuels. Compyo crée le projet depuis le message du client et repère l'urgence, prépare le devis avec vos prix, fait signer le client en ligne, puis vous rappelle ses entretiens chaque année. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour le remplacement d'une chaudière ?",
        reponse:
          "Dans un logement de plus de deux ans, le taux réduit de 10 % s'applique en général aux travaux et à l'entretien, et 5,5 % à certains équipements d'économie d'énergie qui répondent aux critères de performance ; 20 % dans le neuf. Le taux dépend de l'équipement et du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Comment ne plus oublier les entretiens annuels ?",
        reponse:
          "Compyo garde un rappel d'entretien récurrent par client. Vous l'activez une fois ; il revient à l'échéance, avec l'adresse, l'appareil et l'historique des interventions.",
      },
      {
        question: "Peut-on demander un acompte avant de commander l'appareil ?",
        reponse:
          "Oui. Le devis signé, la facture d'acompte se fait depuis ce devis, du montant que vous fixez ; la facture de solde la déduit.",
      },
    ],
    proches: ["plombier", "climaticien", "electricien"],
  },

  climaticien: {
    titreMeta: "Logiciel de devis et factures pour climaticien",
    descriptionMeta:
      "Chiffrez une climatisation depuis la visite technique, faites signer en ligne en pleine saison et rappelez l'entretien de chaque client.",
    titre: "Compyo pour un climaticien.",
    scene:
      "Il est 19h15, mi-juin. Deux chambres à vingt-neuf degrés, un client qui veut être installé avant l'été, et vous avez fait quatre visites techniques aujourd'hui.",
    points: [
      {
        titre: "La visite technique, dictée sur place.",
        texte:
          "Emplacement du groupe extérieur, longueur des liaisons, passage des goulottes : dites-le pendant la visite, avec les photos de la façade et des pièces. Tout est dans le projet du client.",
      },
      {
        titre: "Le devis part pendant que le client est décidé.",
        texte:
          "En pleine saison, le premier devis reçu est souvent le devis signé. Compyo le prépare avec vos prix, vous le relisez, le client le signe sur son téléphone.",
      },
      {
        titre: "L'entretien suivi d'une année sur l'autre.",
        texte:
          "Activez le rappel d'entretien sur la fiche du client : il revient à l'échéance, avec le matériel posé et l'historique.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un climaticien ?",
        reponse:
          "En saison, les visites s'enchaînent et le devis doit partir vite. Compyo range ce que vous dictez et photographiez pendant la visite technique, prépare le devis avec vos prix et le fait signer en ligne ; il garde ensuite le rappel d'entretien de chaque client. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour une installation de climatisation ?",
        reponse:
          "Dans un logement de plus de deux ans, les travaux d'amélioration relèvent en général du taux de 10 % ; dans le neuf ou un local professionnel, 20 %. Certains équipements de chauffage qui répondent aux critères de performance peuvent relever de 5,5 %. Le taux dépend de l'équipement et du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Compyo gère-t-il les contrats d'entretien ?",
        reponse:
          "Compyo garde un rappel d'entretien récurrent par client et l'historique de ses interventions ; l'entretien se chiffre et se facture comme une intervention. Il ne gère pas encore de contrat d'entretien avec prélèvement.",
      },
    ],
    proches: ["chauffagiste", "electricien", "plombier"],
  },

  macon: {
    titreMeta: "Logiciel de devis et factures pour maçon",
    descriptionMeta:
      "Devis de maçonnerie en lots depuis vos notes et photos, assurance décennale sur chaque document, acompte, et alerte météo sur le planning.",
    titre: "Compyo pour un maçon.",
    scene:
      "Il est 18h40. Un mur porteur à ouvrir, un client pressé, et rien à laisser au hasard : l'étaiement, la poutre, les enduits des deux côtés. Le devis doit être juste du premier coup.",
    points: [
      {
        titre: "Un chantier découpé en lots.",
        texte:
          "Étaiement, démolition, poutre, reprise des enduits, évacuation des gravats : chaque lot a son sous-total. Le client voit où va son argent, et vous ne perdez rien en route.",
      },
      {
        titre: "L'assurance décennale sur chaque devis.",
        texte:
          "Assureur, numéro de police, couverture géographique : Compyo les écrit sur vos devis et factures, et vous signale ce qui manque avant l'envoi.",
      },
      {
        titre: "La météo sur le planning.",
        texte:
          "Un coulage ou une maçonnerie extérieure prévus un jour de forte pluie ou de vent fort : Compyo vous prévient à l'avance, pour décaler le chantier avant qu'il ne soit trop tard.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un maçon ?",
        reponse:
          "Pour un maçon, le devis doit être découpé, justifié et porter les bonnes mentions. Compyo prépare le devis en lots à partir de vos notes et photos de chantier, avec vos prix, écrit votre assurance décennale et le délai de validité, puis le fait signer en ligne. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "L'assurance décennale doit-elle figurer sur le devis ?",
        reponse:
          "Pour les travaux soumis à l'assurance décennale, le devis et la facture doivent mentionner l'assureur, les coordonnées du contrat et la couverture géographique. Compyo les reprend depuis vos paramètres sur chaque document.",
      },
      {
        question: "Quel taux de TVA pour des travaux de maçonnerie ?",
        reponse:
          "En général 10 % pour des travaux sur un logement achevé depuis plus de deux ans, et 20 % pour du neuf ou des travaux qui reviennent à construire, comme certaines extensions. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Compyo prévient-il en cas de mauvais temps ?",
        reponse:
          "Oui, pour les métiers d'extérieur : un chantier de maçonnerie planifié un jour de forte pluie ou de vent fort est signalé à l'avance sur votre planning.",
      },
    ],
    proches: ["terrassier", "facadier", "entreprise-de-renovation"],
  },

  couvreur: {
    titreMeta: "Logiciel de devis et factures pour couvreur",
    descriptionMeta:
      "Chiffrez une réfection de toiture depuis votre relevé et vos photos, demandez l'acompte avant la commande, et soyez prévenu quand la météo menace.",
    titre: "Compyo pour un couvreur.",
    scene:
      "Il est 18h20. Le relevé est fait sur le toit, les photos aussi, mais le métré attendra ce soir. Pas le client : il a trois devis à comparer et une tache au plafond qui grandit.",
    points: [
      {
        titre: "Le relevé dicté d'en haut.",
        texte:
          "Surface, pente, état des tuiles, écran sous-toiture, échafaudage : dictez-le sur le toit, les photos se rangent avec. Le soir, tout est dans le projet du client.",
      },
      {
        titre: "L'acompte avant de commander.",
        texte:
          "Le devis signé en ligne, la facture d'acompte part depuis ce devis : vous commandez les matériaux sans avancer la trésorerie.",
      },
      {
        titre: "Le planning qui regarde le ciel.",
        texte:
          "Un chantier de toiture planifié un jour de vent fort ou de pluie : Compyo vous prévient à l'avance, pour déplacer le rendez-vous et prévenir le client.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un couvreur ?",
        reponse:
          "Un couvreur chiffre à partir d'un relevé fait en hauteur, souvent à la hâte. Compyo range ce que vous dictez et photographiez sur le toit, prépare le devis avec vos prix, le fait signer en ligne et émet l'acompte depuis ce devis. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour une réfection de toiture ?",
        reponse:
          "En général 10 % pour des travaux sur un logement achevé depuis plus de deux ans, 20 % dans le neuf, et 5,5 % pour une isolation de toiture qui répond aux critères de performance. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Compyo tient-il compte de la météo ?",
        reponse:
          "Oui. Pour les métiers d'extérieur comme la couverture, un chantier planifié un jour de forte pluie ou de vent fort est signalé à l'avance sur votre planning.",
      },
    ],
    proches: ["charpentier", "facadier", "macon"],
  },

  charpentier: {
    titreMeta: "Logiciel de devis et factures pour charpentier",
    descriptionMeta:
      "Devis de charpente en lots depuis vos photos du grenier : traitement, renfort, remplacement. Décennale sur le devis, acompte, alerte météo.",
    titre: "Compyo pour un charpentier.",
    scene:
      "Il est 18h05. Des chevrons attaqués, une panne à renforcer, de la sciure d'insectes sur le plancher du grenier. Vous avez tout vu à la lampe frontale ; reste à le mettre en devis.",
    points: [
      {
        titre: "Le grenier photographié, et rangé.",
        texte:
          "Traces d'insectes, sections des bois, état des assemblages : les photos et vos notes dictées vont dans le projet du client, prêtes pour le chiffrage.",
      },
      {
        titre: "Un devis découpé comme le chantier.",
        texte:
          "Traitement, remplacement de chevrons, renfort de panne, évacuation : chaque lot a son sous-total, avec vos prix et votre assurance décennale.",
      },
      {
        titre: "Le levage, pas sous la pluie.",
        texte:
          "Une pose ou un levage planifiés un jour de pluie ou de vent fort : Compyo vous prévient avant, sur le planning.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un charpentier ?",
        reponse:
          "Compyo prépare le devis d'un charpentier à partir de ce qu'il a vu et photographié sur place : lots clairs, vos prix, assurance décennale et délai de validité écrits sur le document, signature en ligne, puis acompte et facture depuis le devis. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour un traitement de charpente ?",
        reponse:
          "En général 10 % pour des travaux sur un logement achevé depuis plus de deux ans, et 20 % dans le neuf. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Les photos du chantier restent-elles attachées au devis ?",
        reponse:
          "Elles restent dans le projet du client, avec vos notes, le devis, la signature et les factures : tout le dossier du chantier au même endroit, sur le téléphone comme sur l'ordinateur.",
      },
    ],
    proches: ["couvreur", "menuisier", "macon"],
  },

  carreleur: {
    titreMeta: "Logiciel de devis et factures pour carreleur",
    descriptionMeta:
      "Votre métré dicté sur place devient un devis au m² : dépose, ragréage, pose, plinthes. Vos prix, vos postes fréquents, la signature en ligne.",
    titre: "Compyo pour un carreleur.",
    scene:
      "Il est 19h50. Grès 60 × 60, un sol à ragréer, et un client qui veut commencer lundi. Le métré est fait ; il faut encore penser aux plinthes et à la coupe.",
    points: [
      {
        titre: "Le métré dicté pendant la visite.",
        texte:
          "Surfaces, dépose de l'ancien revêtement, état du support, format des carreaux : dites-le en mesurant. C'est transcrit et rangé dans le projet.",
      },
      {
        titre: "Vos prix au mètre carré.",
        texte:
          "Ragréage, pose, plinthes, joints : les postes se préparent avec vos tarifs, et Compyo retient vos postes fréquents pour les réutiliser d'un chantier à l'autre.",
      },
      {
        titre: "Un planning qui ne se chevauche pas.",
        texte:
          "Un créneau pris ne peut pas l'être deux fois : quand le client dit « lundi », vous savez tout de suite si lundi est libre.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un carreleur ?",
        reponse:
          "Un carreleur chiffre au mètre carré, avec la dépose, la préparation du support et la coupe. Compyo prépare ces postes avec vos prix à partir du métré que vous dictez, retient vos postes fréquents, et fait signer le devis en ligne. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour la pose de carrelage ?",
        reponse:
          "En général 10 % dans un logement achevé depuis plus de deux ans, 20 % dans le neuf ou un local professionnel. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Peut-on réutiliser les postes d'un devis à l'autre ?",
        reponse:
          "Oui. Compyo retient les postes que vous chiffrez souvent — ragréage, pose au m², plinthes — avec vos propres prix, pour les reprendre en un clic plutôt que de repartir d'une bibliothèque générique.",
      },
    ],
    proches: ["plaquiste", "plombier", "peintre"],
  },

  peintre: {
    titreMeta: "Logiciel de devis pour peintre en bâtiment",
    descriptionMeta:
      "Votre métré de murs et plafonds devient un devis clair, les devis sans réponse sont relancés, la facture part du devis signé. Vos prix, toujours.",
    titre: "Compyo pour un peintre.",
    scene:
      "Il est 19h35. Trois couches de sous-couche dans les bras, et un client qui hésite entre deux blancs. Le devis du séjour de la semaine dernière n'a toujours pas de réponse.",
    points: [
      {
        titre: "Murs et plafonds, dictés au mètre carré.",
        texte:
          "Surfaces, état des supports, fissures à reprendre, nombre de couches : dites-le pendant la visite. Les postes se préparent avec vos prix au mètre carré.",
      },
      {
        titre: "Le devis qui dort, relancé.",
        texte:
          "Un devis envoyé resté sans réponse : Compyo prépare la relance en brouillon. Vous la relisez, vous l'envoyez — ou pas.",
      },
      {
        titre: "La facture depuis le devis signé.",
        texte:
          "Le chantier fini, la facture reprend le devis signé : acompte déduit, numérotation continue, mentions obligatoires.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un peintre en bâtiment ?",
        reponse:
          "Compyo prépare le devis d'un peintre à partir du métré dicté pendant la visite, avec vos prix au mètre carré, le fait signer en ligne, prépare les relances des devis restés sans réponse et facture depuis le devis signé. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour des travaux de peinture ?",
        reponse:
          "En général 10 % pour des travaux dans un logement achevé depuis plus de deux ans, 20 % dans le neuf ou un local professionnel. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Compyo convient-il à un peintre auto-entrepreneur ?",
        reponse:
          "Oui. En franchise de TVA, vos devis et factures portent la mention « TVA non applicable, art. 293 B du CGI » au lieu d'un taux, avec les autres mentions obligatoires.",
      },
    ],
    proches: ["plaquiste", "facadier", "carreleur"],
  },

  facadier: {
    titreMeta: "Logiciel de devis et factures pour façadier",
    descriptionMeta:
      "Chiffrez un ravalement depuis vos photos et votre relevé : devis en lots, acompte avant démarrage, alerte météo sur les chantiers de façade.",
    titre: "Compyo pour un façadier.",
    scene:
      "Il est 18h30. Cent vingt mètres carrés de façade sur rue, des fissures à suivre du regard, un échafaudage à prévoir côté trottoir. Les photos sont prises ; le devis, pas encore.",
    points: [
      {
        titre: "Les fissures photographiées, une par une.",
        texte:
          "Photos de la façade, des fissures et des points singuliers, rangées dans le projet du client avec votre relevé dicté : le chiffrage se fait avec tout sous les yeux.",
      },
      {
        titre: "Un devis en lots, un acompte au démarrage.",
        texte:
          "Échafaudage, nettoyage, traitement des fissures, finition : chaque lot a son sous-total. Signé en ligne, le devis donne la facture d'acompte.",
      },
      {
        titre: "Le ravalement, pas sous la pluie.",
        texte:
          "Un chantier de façade planifié un jour de forte pluie ou de vent fort : Compyo vous prévient à l'avance, sur le planning.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un façadier ?",
        reponse:
          "Compyo prépare le devis d'un façadier à partir de ses photos et de son relevé : lots clairs (échafaudage, préparation, traitement, finition), vos prix, signature en ligne et acompte depuis le devis ; le planning signale les jours de mauvais temps. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour un ravalement de façade ?",
        reponse:
          "En général 10 % pour un ravalement sur un logement achevé depuis plus de deux ans ; une isolation thermique par l'extérieur qui répond aux critères de performance peut relever de 5,5 % ; 20 % dans le neuf. Le taux dépend du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Compyo prévient-il des jours de pluie ?",
        reponse:
          "Oui. Pour les chantiers d'extérieur comme la façade, un chantier planifié un jour de forte pluie ou de vent fort est signalé à l'avance sur votre planning.",
      },
    ],
    proches: ["peintre", "macon", "couvreur"],
  },

  terrassier: {
    titreMeta: "Logiciel de devis et factures pour terrassier",
    descriptionMeta:
      "Chiffrez un décaissement avec les volumes dictés sur place et les questions d'accès posées avant, sur un planning sans chevauchement.",
    titre: "Compyo pour un terrassier.",
    scene:
      "Il est 17h55. Une terrasse à décaisser, neuf mètres cubes à sortir, et un accès par un portail de deux mètres cinquante. Si la mini-pelle ne passe pas, le devis est faux.",
    points: [
      {
        titre: "Les volumes, dictés sur le terrain.",
        texte:
          "Surface, profondeur, volume à évacuer, nature du sol : dites-le en arpentant. Les photos de l'accès se rangent avec, dans le projet du client.",
      },
      {
        titre: "L'accès vérifié avant le chiffrage.",
        texte:
          "Largeur du passage, réseaux enterrés, évacuation des terres : Compyo pose les questions qui changent le prix avant que vous l'écriviez.",
      },
      {
        titre: "Les engins, pas sous la pluie.",
        texte:
          "Un terrassement planifié un jour de fortes pluies : Compyo vous prévient à l'avance. Et un créneau pris ne peut pas l'être deux fois.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un terrassier ?",
        reponse:
          "Un devis de terrassement dépend des volumes, de l'accès et de l'évacuation des terres. Compyo range ce que vous dictez et photographiez sur le terrain, pose les questions d'accès avant le chiffrage, prépare le devis avec vos prix et signale sur le planning les jours de fortes pluies. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Que faut-il vérifier avant de chiffrer un terrassement ?",
        reponse:
          "L'accès des engins, la nature du sol, la présence de réseaux enterrés et la destination des terres évacuées changent le prix. Compyo pose ces questions avant le chiffrage, pour qu'elles ne se découvrent pas le jour du chantier.",
      },
      {
        question: "Compyo gère-t-il le planning des engins et des équipes ?",
        reponse:
          "Compyo tient le planning de vos rendez-vous et chantiers et empêche qu'un même créneau soit réservé deux fois ; il signale les jours de mauvais temps. Il ne gère pas encore la location ou l'affectation d'engins.",
      },
    ],
    proches: ["macon", "paysagiste", "pisciniste"],
  },

  paysagiste: {
    titreMeta: "Logiciel de devis et factures pour paysagiste",
    descriptionMeta:
      "Chiffrez une création de jardin depuis vos photos du terrain, relancez les devis et rappelez vos clients à chaque saison d'entretien.",
    titre: "Compyo pour un paysagiste.",
    scene:
      "Il est 18h15, début novembre. Vingt mètres de haie à planter, la saison n'attend pas, et une dizaine de clients à rappeler pour la taille d'hiver.",
    points: [
      {
        titre: "Le terrain photographié, le métré dicté.",
        texte:
          "Longueur de haie, surface de pelouse, nature du sol, accès au jardin : dites-le en marchant, les photos se rangent dans le projet du client.",
      },
      {
        titre: "Les rappels de saison, sans carnet.",
        texte:
          "Taille, tonte, entretien : un rappel récurrent par client revient à la bonne période, avec l'historique de ce que vous avez fait chez lui.",
      },
      {
        titre: "Le devis qui dort, relancé.",
        texte:
          "Un devis de création resté sans réponse : Compyo prépare la relance en brouillon, vous décidez de l'envoyer.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel pour un paysagiste ?",
        reponse:
          "Un paysagiste mêle créations chiffrées sur devis et entretiens qui reviennent chaque saison. Compyo range les photos et le métré du terrain, prépare le devis avec vos prix, le fait signer en ligne, relance les devis restés sans réponse et rappelle les entretiens saisonniers de chaque client. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour des travaux de jardin ?",
        reponse:
          "Les travaux de création et d'aménagement de jardin sont en général au taux normal de 20 %. Le taux dépend de la nature des travaux : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Comment rappeler ses clients pour l'entretien saisonnier ?",
        reponse:
          "Compyo garde un rappel d'entretien récurrent sur la fiche de chaque client. Vous le programmez une fois ; il revient à la saison suivante, avec l'adresse et l'historique des interventions.",
      },
      {
        question: "La météo est-elle prise en compte sur le planning ?",
        reponse:
          "Oui, pour les travaux d'aménagement extérieur : un chantier planifié un jour de forte pluie ou de vent fort est signalé à l'avance.",
      },
    ],
    proches: ["pisciniste", "terrassier", "macon"],
  },

  pisciniste: {
    titreMeta: "Logiciel de devis et factures pour pisciniste",
    descriptionMeta:
      "Remises en route et hivernages rappelés à temps, planning sans double réservation, devis de réparation préparés avec vos prix et signés en ligne.",
    titre: "Compyo pour un pisciniste.",
    scene:
      "Il est 18h45, fin mars. Les remises en route s'enchaînent, les devis aussi : un liner à changer ici, une pompe fatiguée là, et trente clients qui attendent leur créneau d'avril.",
    points: [
      {
        titre: "Remise en route et hivernage, rappelés à temps.",
        texte:
          "Un rappel récurrent par client revient chaque saison, avec les dimensions du bassin, le matériel en place et l'historique des interventions.",
      },
      {
        titre: "Un planning qui se remplit sans se chevaucher.",
        texte:
          "En pleine saison, un créneau pris ne peut pas l'être deux fois : vous proposez une date au client sans risque de double réservation.",
      },
      {
        titre: "Le devis de la pièce à changer, le soir même.",
        texte:
          "Pompe, filtre, liner : ce que vous constatez pendant la remise en route devient un devis préparé avec vos prix, signé en ligne par le client.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel pour un pisciniste ?",
        reponse:
          "Un pisciniste vit au rythme des saisons : remises en route au printemps, hivernages à l'automne, et des devis de réparation au milieu. Compyo rappelle chaque client à la bonne saison, tient un planning sans double réservation, prépare les devis avec vos prix et les fait signer en ligne. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour l'entretien d'une piscine ?",
        reponse:
          "Les travaux et l'entretien de piscine sont en général au taux normal de 20 %. Le taux dépend de la nature des travaux : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Comment ne plus oublier les hivernages de ses clients ?",
        reponse:
          "Compyo garde un rappel récurrent par client : vous le programmez une fois, il revient chaque saison avec les informations du bassin et l'historique.",
      },
    ],
    proches: ["paysagiste", "terrassier", "plombier"],
  },

  serrurier: {
    titreMeta: "Logiciel de devis et factures pour serrurier",
    descriptionMeta:
      "Devis express sur place, signé sur le téléphone du client avant d'intervenir, puis facture depuis ce devis. Vos prix, votre validation.",
    titre: "Compyo pour un serrurier.",
    scene:
      "Il est 21h10. Une porte claquée, un cylindre fatigué, et une cliente sur le palier qui veut savoir combien ça va coûter avant que vous commenciez.",
    points: [
      {
        titre: "Le prix annoncé avant d'intervenir.",
        texte:
          "Avec le devis express, vous remplissez quelques lignes sur place, sans passer par l'IA. La cliente lit le prix et le signe sur son téléphone avant que vous n'ouvriez.",
      },
      {
        titre: "La facture depuis le devis signé.",
        texte:
          "L'intervention faite, la facture reprend le devis : numérotation continue, mentions obligatoires, rien à ressaisir le soir.",
      },
      {
        titre: "Le client retrouvé à la prochaine intervention.",
        texte:
          "Chaque client garde sa fiche et l'historique de ses interventions : le jour où il rappelle, vous savez quel cylindre vous avez posé.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un serrurier ?",
        reponse:
          "En dépannage, le prix doit être connu du client avant l'intervention. Compyo permet de faire un devis express sur place, de le faire signer sur le téléphone du client, puis de facturer depuis ce devis ; la fiche client garde l'historique. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Peut-on faire signer un devis sur place, sur le téléphone du client ?",
        reponse:
          "Oui. Le client reçoit un lien, lit le devis sur son téléphone et le signe en ligne. Vous voyez aussitôt qu'il a signé.",
      },
      {
        question: "Quel taux de TVA pour un dépannage de serrurerie ?",
        reponse:
          "Pour une réparation ou un remplacement dans un logement achevé depuis plus de deux ans, le taux est en général de 10 % ; 20 % pour un local professionnel ou dans le neuf. Le taux dépend de l'intervention : vous le choisissez, Compyo l'écrit sur le devis.",
      },
    ],
    proches: ["vitrier", "menuisier", "electricien"],
  },

  vitrier: {
    titreMeta: "Logiciel de devis et factures pour vitrier",
    descriptionMeta:
      "Vos mesures dictées devant la fenêtre deviennent un devis de vitrerie le soir même, signé en ligne, puis facturé sans ressaisie.",
    titre: "Compyo pour un vitrier.",
    scene:
      "Il est 17h40. Un double vitrage fendu, des mesures prises au mètre ruban, et un client qui veut savoir si ce sera fait avant le week-end.",
    points: [
      {
        titre: "Les mesures dictées, pas griffonnées.",
        texte:
          "Largeur, hauteur, composition du vitrage, type de châssis : dites-le devant la fenêtre, avec une photo. Tout est rangé dans le projet du client.",
      },
      {
        titre: "Le devis le soir même.",
        texte:
          "Les postes se préparent avec vos prix ; vous relisez, le client signe en ligne. Pour une intervention déjà chiffrée sur place, le devis express suffit.",
      },
      {
        titre: "La facture sans ressaisie.",
        texte:
          "La pose faite, la facture reprend le devis signé, avec la numérotation continue et les mentions obligatoires.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel de devis pour un vitrier ?",
        reponse:
          "Compyo prépare le devis d'un vitrier à partir des mesures dictées devant la fenêtre et de la photo prise sur place, avec vos prix ; le client le signe en ligne et la facture se fait depuis ce devis. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Quel taux de TVA pour un remplacement de vitrage ?",
        reponse:
          "En général 10 % dans un logement achevé depuis plus de deux ans ; 5,5 % pour un vitrage isolant qui répond aux critères de performance thermique ; 20 % dans le neuf ou un local professionnel. Le taux dépend du vitrage et du chantier : vous le choisissez, Compyo l'écrit sur le devis.",
      },
      {
        question: "Peut-on faire un devis rapide pour une petite intervention ?",
        reponse:
          "Oui. Le devis express se remplit à la main en quelques lignes, sans IA, pour une intervention simple ou déjà chiffrée sur place.",
      },
    ],
    proches: ["menuisier", "serrurier", "facadier"],
  },

  "entreprise-de-renovation": {
    titreMeta: "Logiciel de devis pour entreprise de rénovation",
    descriptionMeta:
      "Chiffrez un chantier tous corps d'état en un seul devis en lots, avec photos, notes, acomptes, planning et factures au même endroit.",
    titre: "Compyo pour une entreprise de rénovation.",
    scene:
      "Il est 19h10. Un appartement de soixante mètres carrés à reprendre du sol au plafond : démolition, plomberie, électricité, cloisons, peinture. Le client attend un seul devis, lisible.",
    points: [
      {
        titre: "Un chantier, des lots, un seul devis.",
        texte:
          "Démolition, plomberie, électricité, plâtrerie, finitions : chaque lot a son sous-total. Le client comprend ce qu'il paie, lot par lot, et signe en ligne.",
      },
      {
        titre: "Tout le dossier au même endroit.",
        texte:
          "Messages du client, notes dictées à chaque visite, photos avant travaux, devis, signature, acomptes : tout est dans le projet, retrouvable en quelques secondes.",
      },
      {
        titre: "Un planning qui tient.",
        texte:
          "Visites, démarrages, interventions : un créneau pris ne peut pas l'être deux fois, et les chantiers extérieurs sont signalés quand la météo menace.",
      },
    ],
    faq: [
      {
        question: "Quel logiciel pour une entreprise de rénovation ?",
        reponse:
          "Une entreprise de rénovation chiffre des chantiers qui mêlent plusieurs métiers. Compyo prépare des devis en lots avec vos prix, garde tout le dossier du chantier dans un seul projet (messages, notes, photos, devis, signature, factures) et tient un planning sans double réservation. Il est en bêta privée gratuite, sur candidature.",
      },
      {
        question: "Comment présenter un devis de rénovation lisible ?",
        reponse:
          "En lots : un lot par corps d'état, chacun avec son sous-total, puis le total. Le client voit où va son argent, et vous pouvez ajuster un lot sans refaire tout le devis.",
      },
      {
        question: "Quel taux de TVA pour une rénovation complète ?",
        reponse:
          "Dans un logement achevé depuis plus de deux ans, les travaux de rénovation sont en général à 10 %, certains travaux d'économie d'énergie à 5,5 % ; les travaux qui reviennent à reconstruire ou à agrandir fortement relèvent de 20 %. Le taux dépend des travaux : vous le choisissez, Compyo l'écrit sur le devis.",
      },
    ],
    proches: ["macon", "plaquiste", "electricien"],
  },
};
