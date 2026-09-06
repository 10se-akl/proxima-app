import type { TypeChantier } from "@/types";

// Aide-mémoire statique, écrit une fois, aucune IA. Un plombier et un
// couvreur n'ont pas à vérifier les mêmes choses sur place — l'objectif
// est d'éviter le retour sur chantier pour une info oubliée, pas de
// remplacer le jugement de l'artisan. Volontairement court (5 points max) :
// une checklist illisible ne sert à personne.
export const CHECKLISTS_METIER: Record<TypeChantier, string[]> = {
  plomberie: [
    "Type et âge de la robinetterie / chaudière existante",
    "Accès aux arrivées d'eau et aux évacuations",
    "Fuite active ou dégât des eaux en cours ?",
    "Marque/modèle si remplacement à l'identique",
    "Possibilité de couper l'eau pendant l'intervention",
  ],
  electricite: [
    "Tableau électrique aux normes ou à refaire",
    "Nombre de points lumineux / prises concernés",
    "Présence d'un disjoncteur différentiel",
    "Accès au tableau et aux gaines",
    "Possibilité de couper le courant pendant les travaux",
  ],
  chauffage: [
    "Type d'énergie (gaz, électrique, fioul, pompe à chaleur)",
    "Âge et état de la chaudière ou de la PAC actuelle",
    "Nombre de radiateurs ou pièces à chauffer",
    "Accès pour l'évacuation (conduit, extérieur)",
    "Contrat d'entretien déjà existant ?",
  ],
  toiture: [
    "Type de toiture et de matériau",
    "Surface et pente approximatives",
    "Accès chantier (échafaudage nécessaire ?)",
    "État de la charpente visible",
    "Traces de fuite ou d'humidité constatées",
  ],
  salle_de_bain: [
    "Surface et configuration actuelles",
    "État de l'évacuation et de l'arrivée d'eau",
    "Type de sol souhaité (carrelage, receveur…)",
    "Étage et accès (portage du matériel)",
    "Amiante à vérifier si logement ancien",
  ],
  cuisine: [
    "Configuration actuelle (linéaire, en L, îlot)",
    "Emplacement des arrivées eau / élec / gaz",
    "Électroménager à intégrer ou remplacer",
    "Étage et accès (portage du matériel)",
    "Délai souhaité par le client",
  ],
  peinture: [
    "Surface totale à peindre (m²)",
    "État actuel des murs (fissures, humidité)",
    "Teinte et finition souhaitées",
    "Meubles à déplacer ou protéger",
    "Nombre de couches nécessaires",
  ],
  renovation_complete: [
    "Surface totale du chantier",
    "Amiante ou plomb à vérifier si logement ancien",
    "Réseaux à revoir (électricité, plomberie)",
    "Délai souhaité par le client",
    "Accès chantier et stationnement",
  ],
  autre: [
    "Description précise du besoin",
    "Mesures ou dimensions disponibles",
    "Accès au chantier",
    "Délai souhaité par le client",
    "Budget approximatif si évoqué",
  ],
  // Revue métier (06/09) — 11 nouveaux types, un par métier qui tombait
  // systématiquement sur "autre" jusqu'ici (voir types/index.ts). Contenu
  // repris tel quel de CHECKLISTS_PAR_METIER ci-dessous (même texte, déjà
  // écrit et pensé pour ce métier) : ces types de chantier sont
  // spécifiques à UN SEUL métier, contrairement à "salle_de_bain"/
  // "cuisine" qui restent transverses — inutile de dupliquer le contenu
  // dans deux tables différentes indéfiniment, mais CHECKLISTS_PAR_METIER
  // reste en place comme filet de sécurité (voir obtenirChecklist) pour le
  // cas où l'IA classerait malgré tout un chantier en "autre".
  maconnerie: [
    "Nature du sol / fondations existantes",
    "Surface et hauteur des murs concernés",
    "Accès chantier pour livraison de matériaux (bétonnière, camion)",
    "Réseaux enterrés à proximité (eau, élec, gaz)",
    "Déclaration préalable ou permis nécessaire ?",
  ],
  terrassement: [
    "Nature du terrain (roche, argile, remblai)",
    "Surface et profondeur à terrasser",
    "Accès pour engins de chantier",
    "Réseaux enterrés déclarés (DICT à faire)",
    "Évacuation des déblais prévue",
  ],
  facade: [
    "État actuel de la façade (fissures, humidité)",
    "Surface totale et hauteur (échafaudage nécessaire ?)",
    "Type de revêtement souhaité",
    "Isolation par l'extérieur incluse ?",
    "Autorisation copropriété / mairie si nécessaire",
  ],
  serrurerie: [
    "Type de serrure/porte concernée",
    "Marque si remplacement à l'identique",
    "Urgence (porte claquée, effraction) ?",
    "Niveau de sécurité souhaité",
    "Nombre de clés/badges à fournir",
  ],
  vitrerie: [
    "Type et dimensions du vitrage",
    "Simple, double ou triple vitrage",
    "Urgence (bris de glace) ?",
    "Étage et accès pour la pose",
    "Mesures précises disponibles",
  ],
  charpente: [
    "Type de charpente (traditionnelle, fermette)",
    "État du bois existant (humidité, insectes)",
    "Surface et portée à couvrir",
    "Accès chantier (grue, échafaudage)",
    "Isolation liée aux travaux de charpente",
  ],
  menuiserie: [
    "Type de menuiserie (fenêtre, porte, placard, escalier)",
    "Matériau souhaité (bois, PVC, alu)",
    "Mesures précises disponibles",
    "Dépose de l'ancienne menuiserie incluse ?",
    "Délai souhaité par le client",
  ],
  plaquisterie: [
    "Surface totale à traiter (m²)",
    "Isolation à intégrer dans la cloison",
    "État du support existant",
    "Emplacements de prises/interrupteurs à prévoir",
    "Hauteur sous plafond",
  ],
  carrelage: [
    "Surface totale et pièce concernée",
    "État du support (chape à prévoir ?)",
    "Format et type de carrelage souhaité",
    "Faïence murale incluse ?",
    "Étage et accès (portage du matériel)",
  ],
  amenagement_exterieur: [
    "Surface totale du terrain",
    "Nature du sol et exposition",
    "Accès pour engins/livraison de matériaux",
    "Entretien récurrent souhaité ou intervention ponctuelle",
    "Présence d'un réseau d'arrosage existant",
  ],
  climatisation: [
    "Surface et nombre de pièces à climatiser",
    "Type d'installation (mono/multi-split)",
    "Emplacement souhaité pour l'unité extérieure",
    "Installation électrique existante suffisante",
    "Contrat d'entretien déjà existant ?",
  ],
};

// Sprint Beta Final (27/08), mise à jour Revue métier (06/09) —
// CHECKLISTS_METIER ci-dessus est indexé par TypeChantier (la NATURE du
// chantier détectée dans le texte). Jusqu'au 06/09, un serrurier, un
// carreleur ou un paysagiste tombaient presque toujours dans "autre" faute
// de type dédié — corrigé depuis (voir types/index.ts, 11 nouveaux types
// ajoutés, un par métier). CHECKLISTS_PAR_METIER reste toutefois en place :
// c'est le filet de sécurité si l'IA classe malgré tout un chantier en
// "autre" (message ambigu, description trop courte...) alors que l'artisan
// a bien déclaré son métier à l'inscription — voir obtenirChecklist
// ci-dessous, qui vérifie d'abord le type de chantier détecté, puis
// retombe sur le métier déclaré uniquement si besoin.
export const CHECKLISTS_PAR_METIER: Record<string, string[]> = {
  "Maçon": [
    "Nature du sol / fondations existantes",
    "Surface et hauteur des murs concernés",
    "Accès chantier pour livraison de matériaux (bétonnière, camion)",
    "Réseaux enterrés à proximité (eau, élec, gaz)",
    "Déclaration préalable ou permis nécessaire ?",
  ],
  "Terrassier": [
    "Nature du terrain (roche, argile, remblai)",
    "Surface et profondeur à terrasser",
    "Accès pour engins de chantier",
    "Réseaux enterrés déclarés (DICT à faire)",
    "Évacuation des déblais prévue",
  ],
  "Façadier": [
    "État actuel de la façade (fissures, humidité)",
    "Surface totale et hauteur (échafaudage nécessaire ?)",
    "Type de revêtement souhaité",
    "Isolation par l'extérieur incluse ?",
    "Autorisation copropriété / mairie si nécessaire",
  ],
  "Serrurier": [
    "Type de serrure/porte concernée",
    "Marque si remplacement à l'identique",
    "Urgence (porte claquée, effraction) ?",
    "Niveau de sécurité souhaité",
    "Nombre de clés/badges à fournir",
  ],
  "Vitrier": [
    "Type et dimensions du vitrage",
    "Simple, double ou triple vitrage",
    "Urgence (bris de glace) ?",
    "Étage et accès pour la pose",
    "Mesures précises disponibles",
  ],
  "Charpentier": [
    "Type de charpente (traditionnelle, fermette)",
    "État du bois existant (humidité, insectes)",
    "Surface et portée à couvrir",
    "Accès chantier (grue, échafaudage)",
    "Isolation liée aux travaux de charpente",
  ],
  "Menuisier": [
    "Type de menuiserie (fenêtre, porte, placard, escalier)",
    "Matériau souhaité (bois, PVC, alu)",
    "Mesures précises disponibles",
    "Dépose de l'ancienne menuiserie incluse ?",
    "Délai souhaité par le client",
  ],
  "Plaquiste": [
    "Surface totale à traiter (m²)",
    "Isolation à intégrer dans la cloison",
    "État du support existant",
    "Emplacements de prises/interrupteurs à prévoir",
    "Hauteur sous plafond",
  ],
  "Carreleur": [
    "Surface totale et pièce concernée",
    "État du support (chape à prévoir ?)",
    "Format et type de carrelage souhaité",
    "Faïence murale incluse ?",
    "Étage et accès (portage du matériel)",
  ],
  "Paysagiste": [
    "Surface totale du terrain",
    "Nature du sol et exposition",
    "Accès pour engins/livraison de matériaux",
    "Entretien récurrent souhaité ou intervention ponctuelle",
    "Présence d'un réseau d'arrosage existant",
  ],
  "Climaticien": [
    "Surface et nombre de pièces à climatiser",
    "Type d'installation (mono/multi-split)",
    "Emplacement souhaité pour l'unité extérieure",
    "Installation électrique existante suffisante",
    "Contrat d'entretien déjà existant ?",
  ],
};

// Choisit la checklist la plus pertinente : le type de chantier détecté
// s'il est spécifique, sinon la checklist du métier déclaré par
// l'artisan si elle existe, sinon rien plutôt qu'un pense-bête hors sujet.
export function obtenirChecklist(
  typeChantier: string,
  metierArtisan: string | null | undefined
): string[] | null {
  if (typeChantier !== "autre") {
    const points = CHECKLISTS_METIER[typeChantier as keyof typeof CHECKLISTS_METIER];
    if (points) return points;
  }
  if (metierArtisan && CHECKLISTS_PAR_METIER[metierArtisan]) {
    return CHECKLISTS_PAR_METIER[metierArtisan];
  }
  return CHECKLISTS_METIER[typeChantier as keyof typeof CHECKLISTS_METIER] ?? null;
}
