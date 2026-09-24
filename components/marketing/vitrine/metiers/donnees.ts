import { EXEMPLES_METIERS, type ExempleMetier } from "@/components/marketing/metiers/exemplesMetiers";
import { FICHE_PAR_ID, type FicheMetier } from "@/lib/metiersPages";

// ============================================================
// Les dix-sept métiers de la vitrine (24/09), dans l'ordre du brief.
//
// Ce fichier ne porte que ce qui est propre à la vitrine : la phrase
// d'accroche (une scène, pas une promesse), ce que l'artisan dicte sur
// place, et trois atouts de Compyo vus depuis ce métier-là. Le reste vient
// de sources qui existent déjà et restent les seules :
//   - lib/metiersPages.ts        : nom, adresse de la page, page rédigée ou non ;
//   - metiers/exemplesMetiers.ts : le chantier type et son devis d'exemple ;
//   - lib/checklistsMetier.ts    : les questions posées avant chiffrage,
//                                  celles de l'application, mot pour mot.
//
// Les atouts ne citent que des fonctions réelles de l'app : projet créé
// depuis un message, note vocale transcrite, photos rangées, devis en
// lots, taux de TVA, signature en ligne, facture d'acompte depuis le
// devis, relance préparée, planning sans double réservation, questions
// métier avant chiffrage, repérage d'urgence dans une note.
//
// Pour ajouter un métier : une entrée ici, un exemple dans
// exemplesMetiers.ts, une fiche dans lib/metiersPages.ts. Une photo
// exclusive, plus tard : components/marketing/vitrine/photos.ts.
// ============================================================

type ContenuVitrine = {
  id: string;
  accroche: string;
  dictee: string;
  atouts: [string, string, string];
};

const CONTENUS: ContenuVitrine[] = [
  {
    id: "electricien",
    accroche: "Le tableau est ouvert depuis ce matin. Le client veut un prix avant ce soir.",
    dictee: "Tableau d'origine, aucun différentiel 30 mA. Douze circuits à reprendre, deux interrupteurs différentiels type A. Une journée.",
    atouts: ["Photos du tableau, rangées", "Devis en lots", "TVA 10 % en rénovation"],
  },
  {
    id: "chauffagiste",
    accroche: "Chaudière en panne, 14 degrés dans la maison. Le devis doit partir ce soir.",
    dictee: "Chaudière de 2004, échangeur percé. Remplacement par une murale à condensation 25 kW, conduit à vérifier. Une journée de pose.",
    atouts: ["Urgence repérée dans la note", "Questions avant chiffrage", "Acompte depuis le devis"],
  },
  {
    id: "peintre",
    accroche: "Trois couches de sous-couche dans les bras, et un client qui hésite entre deux blancs.",
    dictee: "Séjour, 48 m² de murs, 22 de plafond. Fissures fines à reboucher, sous-couche partout, deux couches de finition. Trois jours.",
    atouts: ["Métré dicté sur place", "Surfaces au m²", "Relance si le devis dort"],
  },
  {
    id: "couvreur",
    accroche: "Le relevé est fait sur le toit. Le métré attendra, pas le client.",
    dictee: "Toiture de 80 m², tuiles poreuses, pas d'écran sous-toiture. Échafaudage côté rue. Cinq jours si la météo tient.",
    atouts: ["Photos du toit, rangées", "Métré dicté d'en haut", "Acompte avant commande"],
  },
  {
    id: "plombier",
    accroche: "Une fuite à 22 h, une photo floue du compteur. Le projet existe déjà.",
    dictee: "Chauffe-eau 200 litres entartré, groupe de sécurité qui fuit. Remplacement à l'identique, évacuation de l'ancien. Une demi-journée.",
    atouts: ["Message du client → projet", "Urgence repérée dans la note", "TVA 10 % ou 20 %"],
  },
  {
    id: "macon",
    accroche: "Un mur porteur à ouvrir, un client pressé, et rien à laisser au hasard.",
    dictee: "Ouverture de 2,40 m dans le mur porteur du séjour. Étaiement, poutre acier, reprise des enduits des deux côtés. Trois jours.",
    atouts: ["Devis en lots", "Questions avant chiffrage", "Photos avant travaux"],
  },
  {
    id: "menuisier",
    accroche: "Les cotes sont dans le carnet, à moitié effacées par la sciure.",
    dictee: "Trois fenêtres PVC deux vantaux, 115 par 125. Dépose des anciennes en bois, calfeutrement neuf. Une journée de pose.",
    atouts: ["Cotes dictées devant l'ouverture", "TVA 5,5 % si isolant", "Signature en ligne"],
  },
  {
    id: "carreleur",
    accroche: "Grès 60 × 60, sol à ragréer, et un client qui veut commencer lundi.",
    dictee: "Cuisine de 18 m², ancien carrelage déposé. Ragréage, grès cérame 60 par 60, plinthes assorties. Prévoir dix pour cent de coupe.",
    atouts: ["Métré dicté sur place", "Surfaces au m²", "Planning sans chevauchement"],
  },
  {
    id: "serrurier",
    accroche: "21 h, une porte claquée. Le devis est prêt avant que vous repartiez.",
    dictee: "Porte claquée, cylindre fatigué. Ouverture, pose d'un cylindre A2P, déplacement en soirée. Une heure sur place.",
    atouts: ["Devis prêt sur place", "Signature sur son téléphone", "Facture depuis le devis"],
  },
  {
    id: "paysagiste",
    accroche: "Vingt mètres de haie à planter, et la saison n'attend pas.",
    dictee: "Haie de lauriers sur 20 mètres, deux plants au mètre. Sol argileux à préparer, paillage. Deux jours.",
    atouts: ["Photos du terrain", "TVA 20 % au jardin", "Relance si le devis dort"],
  },
  {
    id: "terrassier",
    accroche: "Une terrasse à décaisser, neuf mètres cubes à sortir, un accès étroit.",
    dictee: "Terrasse de 30 m², décaissement sur 30 centimètres. Neuf mètres cubes à évacuer, hérisson compacté. Accès mini-pelle par le portail.",
    atouts: ["Volumes dictés sur place", "Questions d'accès avant chiffrage", "Planning sans chevauchement"],
  },
  {
    id: "facadier",
    accroche: "120 m² de façade sur rue, des fissures à suivre du regard.",
    dictee: "Façade sur rue, 120 m². Nettoyage haute pression, fissures à ouvrir et reboucher, deux couches de peinture. Six jours avec l'échafaudage.",
    atouts: ["Photos des fissures, rangées", "Devis en lots", "Acompte avant démarrage"],
  },
  {
    id: "climaticien",
    accroche: "Deux chambres à 29 degrés, un client qui veut être prêt avant l'été.",
    dictee: "Bi-split réversible, deux unités murales dans les chambres. Groupe extérieur en façade nord, huit mètres de liaisons. Une journée.",
    atouts: ["Questions avant chiffrage", "Photos de l'emplacement", "Signature en ligne"],
  },
  {
    id: "vitrier",
    accroche: "Un double vitrage fendu, des mesures prises au mètre ruban.",
    dictee: "Double vitrage 4-16-4 fendu, 120 par 90. Dépose, pose et joints neufs. Deux heures sur place.",
    atouts: ["Mesures dictées", "Devis prêt le soir même", "Facture depuis le devis"],
  },
  {
    id: "charpentier",
    accroche: "Des chevrons attaqués, une panne à renforcer, un grenier à traiter.",
    dictee: "Charpente de 60 m², traces d'insectes. Traitement complet, six chevrons à changer, renfort de la panne. Trois jours.",
    atouts: ["Photos du grenier, rangées", "Devis en lots", "Questions avant chiffrage"],
  },
  {
    id: "plaquiste",
    accroche: "Une journée à poser des rails. Reste un métré à transformer en devis.",
    dictee: "Cloison 72/48 sur 25 m², doublage isolé sur 30 m². Bandes, enduit et ponçage partout. Quatre jours.",
    atouts: ["Métré dicté pendant le relevé", "Surfaces au m²", "Devis en lots"],
  },
  {
    id: "pisciniste",
    accroche: "Fin d'hiver : les remises en route s'enchaînent, les devis aussi.",
    dictee: "Bassin de 8 par 4, bâche à retirer. Nettoyage, contrôle de la filtration, traitement choc et analyse de l'eau. Une demi-journée.",
    atouts: ["Planning qui se remplit", "TVA 20 % sur la piscine", "Relance si le devis dort"],
  },
];

export type MetierVitrine = ContenuVitrine & {
  numero: string;
  fiche: FicheMetier;
  exemple: ExempleMetier;
};

export const METIERS_VITRINE: MetierVitrine[] = CONTENUS.map((c, i) => {
  const fiche = FICHE_PAR_ID[c.id];
  const exemple = EXEMPLES_METIERS.find((e) => e.id === c.id);
  if (!fiche || !exemple) throw new Error(`Métier incomplet pour la vitrine : ${c.id}`);
  return { ...c, numero: String(i + 1).padStart(2, "0"), fiche, exemple };
});
