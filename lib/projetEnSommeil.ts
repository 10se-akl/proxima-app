import type { SupabaseClient } from "@supabase/supabase-js";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { jourParis, minuitParis } from "@/lib/moisParis";

// ============================================================
// Les projets qui dorment (23/10, idée d'Axel, revue par Claude et par deux
// relectures).
//
// Un projet que plus personne ne touche s'empile sur l'accueil (« 47 j »)
// sans qu'on puisse le fermer. L'accueil le signale, dans « À confirmer »,
// avec trois gestes :
//   - Continuer : la ligne ouvre la fiche ;
//   - Dans 1 sem. : il se tait une semaine, puis revient s'il dort encore ;
//   - Ranger (trace « projet_classe ») : il quitte l'accueil (À suivre, Mes
//     projets) mais reste dans Projets, et se reprend depuis sa fiche.
//     Jamais « Effacer » : l'historique compte, on ne supprime aucune donnée.
// Un projet rangé ou mis de côté se RÉVEILLE tout seul dès qu'il bouge
// (le client signe, un devis est créé ou envoyé, la fiche est modifiée) :
// voir sommeilValable.
//
// Aucune migration : chaque geste est une trace du carnet
// (evenements_projet, colonne type sans contrainte), comme « Pas encore »
// de « Chantier terminé ? ». La dernière trace de sommeil dit l'état. Rien
// n'appelle l'IA, rien ne part chez le client.
// ============================================================

/** « projet_pause_annulee » : « Annuler » juste après « Dans 1 sem. »
 *  (masqué au carnet, contrairement à « Projet repris »). */
export const TYPES_SOMMEIL = ["projet_en_pause", "projet_classe", "projet_repris", "projet_pause_annulee"] as const;
type TypeSommeil = (typeof TYPES_SOMMEIL)[number];

/** « Dans 1 sem. » : le projet se tait une semaine. */
export const JOURS_PAUSE = 7;
/** Un projet à cadrer ou dont le devis reste à préparer dort après 14 jours. */
export const JOURS_DORT_PREPARATION = 14;
/** Un devis sans réponse dort une fois expiré, ou 30 jours après l'envoi
 *  (les relances de 5 et 10 jours sont passées). */
export const JOURS_DORT_DEVIS = 30;
/** Un projet signé sans date de chantier : « Planifier » après 2 jours. */
export const JOURS_A_PLANIFIER = 2;
/** Un devis qui expire dans 5 jours ou moins : un bon motif de relance. */
export const JOURS_AVANT_EXPIRATION = 5;

const JOUR_MS = 86400000;
/** Les étapes où un projet peut dormir ; signé, en cours ou fini : jamais. */
const ETAPES_QUI_DORMENT = ["nouveau", "analyse", "devis_envoye"];

export type EtatSommeil = { etat: "pause"; depuis: string; jusquAu: number } | { etat: "classe"; depuis: string };

type ProjetSommeil = {
  id: string;
  statut: string;
  created_at: string;
  derniere_modification_le?: string | null;
  accepte_le?: string | null;
};
type DevisSommeil = {
  demande_id: string | null;
  statut: string;
  created_at?: string | null;
  envoye_le?: string | null;
  validite_jours?: number | null;
};

/** L'état de chaque projet d'après ses traces, triées ou non. Un projet
 *  absent de la carte est éveillé. Une pause échue ne compte plus. */
export function etatsSommeil(
  traces: { demande_id: string | null; type: string; created_at: string }[],
  maintenant = new Date()
): Map<string, EtatSommeil> {
  const derniere = new Map<string, { type: TypeSommeil; at: string }>();
  for (const e of traces) {
    if (!e.demande_id || !(TYPES_SOMMEIL as readonly string[]).includes(e.type)) continue;
    const deja = derniere.get(e.demande_id);
    if (!deja || e.created_at > deja.at) derniere.set(e.demande_id, { type: e.type as TypeSommeil, at: e.created_at });
  }
  const etats = new Map<string, EtatSommeil>();
  derniere.forEach((d, id) => {
    if (d.type === "projet_classe") etats.set(id, { etat: "classe", depuis: d.at });
    else if (d.type === "projet_en_pause") {
      const jusquAu = Date.parse(d.at) + JOURS_PAUSE * JOUR_MS;
      if (jusquAu > maintenant.getTime()) etats.set(id, { etat: "pause", depuis: d.at, jusquAu });
    }
  });
  return etats;
}

/** Faux dès que le projet a bougé après le geste : signé, passé à une
 *  autre étape, fiche modifiée, devis créé ou envoyé. Un client qui revient
 *  six mois plus tard ramène son projet sur l'accueil sans que personne
 *  n'ait à penser à « Reprendre ». */
export function sommeilValable(etat: EtatSommeil, projet: ProjetSommeil, devisDuProjet: DevisSommeil[]): boolean {
  const depuis = etat.depuis;
  const apres = (iso: string | null | undefined) => !!iso && iso > depuis;
  if (!ETAPES_QUI_DORMENT.includes(projet.statut)) return false;
  if (apres(projet.accepte_le) || apres(projet.derniere_modification_le)) return false;
  return !devisDuProjet.some((d) => apres(d.created_at) || apres(d.envoye_le));
}

/** Les états qui tiennent encore (sommeilValable), projet par projet. */
export function etatsValables(
  etats: Map<string, EtatSommeil>,
  projets: ProjetSommeil[],
  devis: DevisSommeil[]
): Map<string, EtatSommeil> {
  const parId = new Map(projets.map((p) => [p.id, p]));
  const valables = new Map<string, EtatSommeil>();
  etats.forEach((e, id) => {
    const p = parId.get(id);
    if (p && sommeilValable(e, p, devis.filter((d) => d.demande_id === id))) valables.set(id, e);
  });
  return valables;
}

/** La fin de validité d'un devis, comme sur le document
 *  (lib/devis/mentionsLegales.ts, finDeValidite) : la fin du dernier jour,
 *  à Paris. Sans durée posée (devis d'avant le 17/09) : aucune. */
export function finDeValiditeDevis(d: { validite_jours?: number | null; envoye_le?: string | null; created_at?: string | null }): Date | null {
  const origine = d.envoye_le ?? d.created_at;
  if (!d.validite_jours || !origine) return null;
  const depart = jourParis(origine);
  return new Date(minuitParis(depart.annee, depart.mois, depart.jour + d.validite_jours + 1).getTime() - 1);
}

/** Jours calendaires (Paris) qui restent avant la fin de validité : 0 le
 *  dernier jour, négatif une fois expiré, null sans validité. */
export function joursAvantExpiration(
  d: { validite_jours?: number | null; envoye_le?: string | null; created_at?: string | null },
  maintenant = new Date()
): number | null {
  const fin = finDeValiditeDevis(d);
  if (!fin) return null;
  const a = jourParis(maintenant.toISOString());
  const b = jourParis(fin.toISOString());
  return Math.round((Date.UTC(b.annee, b.mois, b.jour) - Date.UTC(a.annee, a.mois, a.jour)) / JOUR_MS);
}

/** Ce que dit la ligne « ça dort », ou null si le projet ne dort pas. */
export function raisonSommeil(
  projet: ProjetSommeil,
  /** Tous les devis du projet. */
  devisDuProjet: DevisSommeil[],
  /** Un rendez-vous ou un rappel à venir : le projet est suivi, il ne dort pas. */
  aUnEvenementFutur: boolean,
  maintenant = new Date()
): { jours: number; texte: string } | null {
  if (aUnEvenementFutur) return null;
  // Un devis en préparation (brouillon, à envoyer) : le travail avance.
  if (devisDuProjet.some((d) => d.statut === "brouillon" || d.statut === "a_valider")) return null;
  const t = maintenant.getTime();
  const depuis = (iso: string) => Math.max(0, Math.floor((t - Date.parse(iso)) / JOUR_MS));
  // La dernière trace d'activité connue : la fiche, ou le dernier devis.
  const dates = [projet.derniere_modification_le ?? projet.created_at, ...devisDuProjet.map((d) => d.created_at ?? "")].filter(Boolean) as string[];
  const derniereActivite = dates.reduce((a, b) => (b > a ? b : a), projet.created_at);

  if (projet.statut === "nouveau" || projet.statut === "analyse") {
    const jours = depuis(derniereActivite);
    if (jours < JOURS_DORT_PREPARATION) return null;
    // Court : sur téléphone, la ligne garde deux boutons.
    const etape = projet.statut === "nouveau" ? "À cadrer" : "Devis à faire";
    return { jours, texte: `${etape} · ${dureeEnMots(jours)}` };
  }
  if (projet.statut === "devis_envoye") {
    const envoye = devisDuProjet
      .filter((d) => d.statut === "envoye" && d.envoye_le)
      .sort((a, b) => ((b.envoye_le as string) > (a.envoye_le as string) ? 1 : -1))[0];
    if (!envoye?.envoye_le) return null;
    const jours = depuis(envoye.envoye_le);
    const reste = joursAvantExpiration(envoye, maintenant);
    if (reste !== null && reste < 0) return { jours, texte: `Devis expiré · ${dureeEnMots(jours)}` };
    if (jours >= JOURS_DORT_DEVIS) return { jours, texte: `Sans réponse · ${dureeEnMots(jours)}` };
  }
  return null;
}

/** « 16 j », « 3 sem. », « 2 mois » : depuis quand ça dort. */
export function dureeEnMots(jours: number): string {
  // Espace insécable : « 3 » et « sem. » ne se séparent jamais en fin de ligne.
  if (jours < 21) return `${jours} j`;
  if (jours < 60) return `${Math.round(jours / 7)} sem.`;
  return `${Math.round(jours / 30)} mois`;
}

async function ecrire(supabase: SupabaseClient, projetId: string, type: TypeSommeil, titre: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const organisationId = user ? await getOrganisationId(supabase, user.id) : null;
  if (!user || !organisationId) return false;
  return enregistrerEvenement(supabase, { demandeId: projetId, artisanId: user.id, organisationId, type, titre });
}

export const mettreEnPause = (supabase: SupabaseClient, projetId: string) =>
  ecrire(supabase, projetId, "projet_en_pause", "Mis de côté une semaine");
export const annulerPause = (supabase: SupabaseClient, projetId: string) =>
  ecrire(supabase, projetId, "projet_pause_annulee", "Mise de côté annulée");
export const classerProjet = (supabase: SupabaseClient, projetId: string) =>
  ecrire(supabase, projetId, "projet_classe", "Projet rangé (plus sur l'accueil)");
export const reprendreProjet = (supabase: SupabaseClient, projetId: string) => ecrire(supabase, projetId, "projet_repris", "Projet repris");
