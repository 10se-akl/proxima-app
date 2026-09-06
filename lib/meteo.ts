import type { TypeChantier } from "@/types";

// ============================================================
// Alerte météo planning (06/09) — audit métier : maçon, terrassier,
// façadier, couvreur, charpentier et paysagiste perdent régulièrement une
// demi-journée (déplacement + matériel sorti) sur un chantier extérieur
// annulé au dernier moment par la pluie ou le vent, sans l'avoir vu venir
// ni avoir prévenu le client à l'avance. Ce module ne fait qu'un pari
// raisonnable : la météo au siège de l'entreprise est une bonne
// approximation de la météo du chantier pour un artisan local (rayon
// d'intervention habituel). Utilise Open-Meteo (gratuit, sans clé API,
// sans compte à créer) — cohérent avec la contrainte "pas de dépendance
// tierce payante" du produit en bêta.
//
// Toute panne réseau, adresse introuvable ou ville non détectée doit
// silencieusement renvoyer une carte vide : ceci est une amélioration de
// confort, jamais un point de blocage pour afficher le planning.
// ============================================================

export const TYPES_CHANTIER_METEO_SENSIBLES: TypeChantier[] = [
  "terrassement",
  "maconnerie",
  "facade",
  "toiture",
  "charpente",
  "amenagement_exterieur",
];

export type RisqueMeteoJour = {
  risque: boolean;
  resume: string; // ex. "70% de pluie, vent 45 km/h"
};

type Coordonnees = { lat: number; lon: number };

// Cache mémoire process — suffisant pour une bêta privée à faible trafic ;
// évite de re-géocoder/re-interroger l'API à chaque chargement de page.
// Le géocodage d'une ville est stable dans le temps (pas d'expiration).
// La prévision, elle, change : on la garde 3h.
const CACHE_GEOCODAGE = new Map<string, Coordonnees | null>();
const CACHE_PREVISIONS = new Map<string, { expire: number; donnees: Map<string, RisqueMeteoJour> }>();
const DUREE_CACHE_PREVISIONS_MS = 3 * 60 * 60 * 1000;

const SEUIL_PLUIE_PCT = 60;
const SEUIL_VENT_KMH = 50;

// Extrait la ville d'une adresse française classique ("12 rue de la Paix,
// 75002 Paris" ou "12 rue de la Paix\n75002 Paris") : on cherche un code
// postal à 5 chiffres et on prend ce qui suit sur la même ligne/segment.
export function extraireVilleDepuisAdresse(adresse: string | null | undefined): string | null {
  if (!adresse) return null;
  const correspondance = adresse.match(/\b\d{5}\s+([A-Za-zÀ-ÿ' -]+)/);
  if (!correspondance) return null;
  const ville = correspondance[1].trim().replace(/[,.;].*$/, "");
  return ville.length > 1 ? ville : null;
}

async function geocoderVille(ville: string): Promise<Coordonnees | null> {
  const cle = ville.toLowerCase();
  if (CACHE_GEOCODAGE.has(cle)) return CACHE_GEOCODAGE.get(cle) ?? null;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      ville
    )}&count=1&language=fr&format=json&country=FR`;
    const reponse = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!reponse.ok) {
      CACHE_GEOCODAGE.set(cle, null);
      return null;
    }
    const donnees = await reponse.json();
    const resultat = donnees?.results?.[0];
    const coords: Coordonnees | null = resultat
      ? { lat: resultat.latitude, lon: resultat.longitude }
      : null;
    CACHE_GEOCODAGE.set(cle, coords);
    return coords;
  } catch {
    CACHE_GEOCODAGE.set(cle, null);
    return null;
  }
}

async function recupererPrevisions(coords: Coordonnees): Promise<Map<string, RisqueMeteoJour>> {
  const cle = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  const enCache = CACHE_PREVISIONS.get(cle);
  if (enCache && enCache.expire > Date.now()) return enCache.donnees;

  const carte = new Map<string, RisqueMeteoJour>();
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=precipitation_probability_max,windspeed_10m_max&timezone=Europe%2FParis&forecast_days=10`;
    const reponse = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!reponse.ok) return carte;
    const donnees = await reponse.json();
    const dates: string[] = donnees?.daily?.time ?? [];
    const pluies: number[] = donnees?.daily?.precipitation_probability_max ?? [];
    const vents: number[] = donnees?.daily?.windspeed_10m_max ?? [];

    dates.forEach((date, i) => {
      const pluie = pluies[i] ?? 0;
      const vent = vents[i] ?? 0;
      const risque = pluie >= SEUIL_PLUIE_PCT || vent >= SEUIL_VENT_KMH;
      const parties: string[] = [];
      if (pluie > 0) parties.push(`${Math.round(pluie)}% de pluie`);
      if (vent > 0) parties.push(`vent ${Math.round(vent)} km/h`);
      carte.set(date, { risque, resume: parties.join(", ") || "conditions incertaines" });
    });

    CACHE_PREVISIONS.set(cle, { expire: Date.now() + DUREE_CACHE_PREVISIONS_MS, donnees: carte });
  } catch {
    // Réseau indisponible : carte vide, le planning s'affiche sans alerte.
  }
  return carte;
}

// Point d'entrée unique utilisé par la page planning. `adresseEntreprise`
// est le champ libre `parametres_entreprise.adresse` — jamais bloquant si
// absent ou non reconnu.
export async function recupererAlertesMeteoSemaine(
  adresseEntreprise: string | null | undefined
): Promise<Map<string, RisqueMeteoJour>> {
  const ville = extraireVilleDepuisAdresse(adresseEntreprise);
  if (!ville) return new Map();

  const coords = await geocoderVille(ville);
  if (!coords) return new Map();

  return recupererPrevisions(coords);
}
