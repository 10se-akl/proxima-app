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
};
