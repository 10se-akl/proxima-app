import { appelerClaude, parserReponseJSON } from "@/lib/ai/client";
import type { BrouillonProjet, NiveauConfiance, Priorite, TypeChantier } from "@/types";

// ============================================================
// "Premier contact sans friction" (26/08) — extraction partagée entre les
// deux portes d'entrée du produit : le partage natif Android
// (app/api/partage/route.ts → page de revue) et l'import de message,
// conservé sur iPhone/desktop (app/dashboard/demandes/importer). Une seule
// logique d'extraction, jamais deux versions divergentes.
//
// Différence avec l'ancien import direct (app/api/ai/importer-message) :
// l'IA ne crée plus jamais le projet elle-même. Elle renvoie un brouillon
// que l'artisan valide — voir components/dashboard/BrouillonProjet.tsx.
// ============================================================

const TYPES_CHANTIER_VALIDES: TypeChantier[] = [
  "renovation_complete",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "toiture",
  "electricite",
  "plomberie",
  "chauffage",
  "autre",
];

function typeChantierValide(valeur: string | undefined | null): TypeChantier {
  return (TYPES_CHANTIER_VALIDES as string[]).includes(valeur ?? "")
    ? (valeur as TypeChantier)
    : "autre";
}

const NIVEAUX_VALIDES: NiveauConfiance[] = ["explicite", "deduit", "absent"];

function niveauValide(valeur: string | undefined | null): NiveauConfiance {
  return (NIVEAUX_VALIDES as string[]).includes(valeur ?? "")
    ? (valeur as NiveauConfiance)
    : "absent";
}

type ChampBrut = { valeur: string | null; confiance: string };

type ReponseIABrouillon = {
  nom_client: ChampBrut;
  telephone_client: ChampBrut;
  adresse_client: ChampBrut;
  type_chantier: ChampBrut;
  resume: ChampBrut;
  urgence: ChampBrut; // "urgent" | "normal"
  rdv_date: ChampBrut;
  rdv_heure: ChampBrut;
};

function construirePrompt(dateDuJour: string): string {
  return `Tu es l'assistant de Compyo, un outil pour artisans du bâtiment.

Nous sommes le ${dateDuJour}.

Un artisan reçoit un texte brut (message client, SMS, email, WhatsApp, ou légende d'une photo partagée). Extrais-en les informations ci-dessous, et indique pour CHAQUE champ un niveau de confiance :
- "explicite" : la valeur est recopiée telle quelle du texte (un nom, un numéro, une adresse cités mot pour mot).
- "deduit" : la valeur est résolue ou interprétée par toi à partir du contexte (ex. "mardi prochain" → une date calculée, un besoin visiblement urgent sans que le mot "urgent" soit écrit).
- "absent" : rien trouvé, valeur alors à null (sauf "resume", toujours rempli même en résumant vaguement).

N'invente jamais un fait qui ne peut ni être lu ni raisonnablement déduit. En cas de doute entre "explicite" et "deduit", choisis "deduit".

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "nom_client": { "valeur": "nom ou null", "confiance": "explicite | deduit | absent" },
  "telephone_client": { "valeur": "numéro ou null", "confiance": "..." },
  "adresse_client": { "valeur": "adresse ou null", "confiance": "..." },
  "type_chantier": { "valeur": "salle_de_bain | cuisine | peinture | toiture | electricite | plomberie | chauffage | renovation_complete | autre", "confiance": "..." },
  "resume": { "valeur": "résumé en une ou deux phrases de ce que veut le client", "confiance": "..." },
  "urgence": { "valeur": "urgent ou normal", "confiance": "..." },
  "rdv_date": { "valeur": "AAAA-MM-JJ ou null", "confiance": "..." },
  "rdv_heure": { "valeur": "HH:MM ou null", "confiance": "..." }
}`;
}

export async function preparerBrouillonDepuisTexte(
  texte: string,
  signal?: AbortSignal
): Promise<BrouillonProjet> {
  const dateDuJour = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const reponseTexte = await appelerClaude(construirePrompt(dateDuJour), texte, signal);
  const extrait = parserReponseJSON<ReponseIABrouillon>(reponseTexte);

  return {
    nomClient: {
      valeur: extrait.nom_client?.valeur?.trim() || null,
      confiance: niveauValide(extrait.nom_client?.confiance),
    },
    telephoneClient: {
      valeur: extrait.telephone_client?.valeur?.trim() || null,
      confiance: niveauValide(extrait.telephone_client?.confiance),
    },
    adresseClient: {
      valeur: extrait.adresse_client?.valeur?.trim() || null,
      confiance: niveauValide(extrait.adresse_client?.confiance),
    },
    typeChantier: {
      valeur: typeChantierValide(extrait.type_chantier?.valeur),
      confiance: extrait.type_chantier?.valeur
        ? niveauValide(extrait.type_chantier?.confiance)
        : "absent",
    },
    resume: {
      valeur: extrait.resume?.valeur?.trim() || "À préciser avec l'artisan.",
      confiance: extrait.resume?.valeur?.trim() ? niveauValide(extrait.resume?.confiance) : "absent",
    },
    priorite: {
      valeur: (extrait.urgence?.valeur === "urgent" ? "urgent" : "normal") as Priorite,
      confiance: extrait.urgence?.valeur ? niveauValide(extrait.urgence?.confiance) : "absent",
    },
    rdvDate: {
      valeur: extrait.rdv_date?.valeur?.trim() || null,
      confiance: niveauValide(extrait.rdv_date?.confiance),
    },
    rdvHeure: {
      valeur: extrait.rdv_heure?.valeur?.trim() || null,
      confiance: niveauValide(extrait.rdv_heure?.confiance),
    },
    texteOrigine: texte,
  };
}
