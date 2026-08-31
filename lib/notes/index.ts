import type { SupabaseClient } from "@supabase/supabase-js";
import type { Note, ImportanceNote } from "@/types";

// ============================================================
// Notes professionnelles (29/08) — voir Module 27, supabase/schema.sql.
//
// Point 8 du brief d'Axel : "Une seule table Notes [...] Toujours la même
// donnée. Aucune duplication." Ces fonctions sont le SEUL endroit qui lit
// ou écrit la table `notes` — la page Notes, la section Notes de la fiche
// projet, la section Rappels d'Aujourd'hui, le centre de notifications et
// le contexte envoyé à l'IA d'analyse passent tous par ici plutôt que de
// répéter leur propre requête Supabase.
// ============================================================

const SELECTION_AVEC_PROJET = "*, demandes(nom_client)";

// Supabase type une jointure "demandes(...)" comme un tableau côté
// TypeScript même si demande_id ne peut pointer que vers un seul projet
// (même remarque que app/dashboard/page.tsx) — aplati une bonne fois ici.
function aplatir(ligne: any): Note {
  return {
    ...ligne,
    demandes: Array.isArray(ligne.demandes) ? ligne.demandes[0] ?? null : ligne.demandes ?? null,
  };
}

export async function listerNotesProjet(
  supabase: SupabaseClient,
  demandeId: string
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("demande_id", demandeId)
    .order("created_at", { ascending: false });
  // Sprint Robustesse (30/08) — sans ce log, un échec réseau retombait
  // silencieusement sur [] exactement comme "aucune note" : un rappel
  // programmé par l'artisan pouvait disparaître de son écran sans qu'on
  // sache jamais pourquoi. Signature `Promise<Note[]>` inchangée.
  if (error) {
    console.error("listerNotesProjet: échec Supabase (notes)", error);
  }
  return (data as Note[]) ?? [];
}

// Notes actives (non terminées) d'un projet — c'est ce sous-ensemble,
// jamais les notes déjà terminées, qui doit influencer le résumé IA
// (point 4 du brief) et remonter dans les sections "Rappels".
export async function listerNotesActivesProjet(
  supabase: SupabaseClient,
  demandeId: string
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("demande_id", demandeId)
    .eq("statut", "active")
    .order("created_at", { ascending: false });
  // Sprint Robustesse (30/08) — voir listerNotesProjet ci-dessus : même
  // distinction erreur technique / réellement aucune note active.
  if (error) {
    console.error("listerNotesActivesProjet: échec Supabase (notes)", error);
  }
  return (data as Note[]) ?? [];
}

// Toutes les notes actives d'une organisation, projet ou générales
// confondus — page Notes, centre de notifications. `avecRappelUniquement`
// sert à la section "Rappels" d'Aujourd'hui, qui n'a rien à faire d'une
// note sans échéance.
export async function listerNotesActivesOrganisation(
  supabase: SupabaseClient,
  organisationId: string,
  options?: { avecRappelUniquement?: boolean }
): Promise<Note[]> {
  let requete = supabase
    .from("notes")
    .select(SELECTION_AVEC_PROJET)
    .eq("organisation_id", organisationId)
    .eq("statut", "active");

  if (options?.avecRappelUniquement) {
    requete = requete.not("rappel_a", "is", null);
  }

  const { data, error } = await requete.order("rappel_a", { ascending: true, nullsFirst: false });
  // Sprint Robustesse (30/08) — cette fonction alimente la page Notes et le
  // centre de notifications : un échec réseau silencieux ferait croire à
  // l'artisan qu'il n'a aucune note/rappel actif, alors que c'est juste la
  // requête qui a échoué.
  if (error) {
    console.error("listerNotesActivesOrganisation: échec Supabase (notes)", error);
  }
  return ((data as any[]) ?? []).map(aplatir);
}

export async function creerNote(
  supabase: SupabaseClient,
  params: {
    organisationId: string;
    artisanId: string;
    demandeId: string | null;
    titre: string;
    description: string | null;
    importance: ImportanceNote;
    rappelA: string | null;
  }
): Promise<{ note: Note | null; erreur: string | null }> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      organisation_id: params.organisationId,
      artisan_id: params.artisanId,
      demande_id: params.demandeId,
      titre: params.titre,
      description: params.description,
      importance: params.importance,
      rappel_a: params.rappelA,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { note: null, erreur: "Impossible d'enregistrer la note." };
  }
  return { note: data as Note, erreur: null };
}

export async function marquerNoteTerminee(
  supabase: SupabaseClient,
  noteId: string,
  terminee: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("notes")
    .update({
      statut: terminee ? "terminee" : "active",
      termine_le: terminee ? new Date().toISOString() : null,
    })
    .eq("id", noteId);
  return !error;
}

export async function supprimerNote(supabase: SupabaseClient, noteId: string): Promise<boolean> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  return !error;
}

// Rappels arrivés à échéance mais jamais encore vus DANS l'app (canal
// séparé du push, voir Module 27ter / vu_le) — c'est la file d'attente de
// la pop-up bloquante "Compris" (components/notes/PopupRappel.tsx).
// Triés du plus ancien au plus récent : on ne montre jamais deux pop-ups
// en même temps, l'artisan les traite une par une dans l'ordre.
export async function listerRappelsAVoir(
  supabase: SupabaseClient,
  organisationId: string
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(SELECTION_AVEC_PROJET)
    .eq("organisation_id", organisationId)
    .eq("statut", "active")
    .not("rappel_a", "is", null)
    .lte("rappel_a", new Date().toISOString())
    .is("vu_le", null)
    .order("rappel_a", { ascending: true });
  // Sprint Robustesse (30/08) — c'est la file de la pop-up bloquante
  // "Compris" : un échec réseau silencieux ferait simplement disparaître
  // un rappel programmé par l'artisan, sans aucune trace de la vraie
  // cause. Signature `Promise<Note[]>` inchangée.
  if (error) {
    console.error("listerRappelsAVoir: échec Supabase (notes)", error);
  }
  return ((data as any[]) ?? []).map(aplatir);
}

export async function marquerNoteVue(supabase: SupabaseClient, noteId: string): Promise<boolean> {
  const { error } = await supabase
    .from("notes")
    .update({ vu_le: new Date().toISOString() })
    .eq("id", noteId);
  return !error;
}

export const LABEL_IMPORTANCE: Record<ImportanceNote, string> = {
  verte: "Faible",
  orange: "Moyenne",
  rouge: "Importante",
};

// Couleurs sobres (demande explicite d'Axel : "pas de grosses cartes
// rouges flashy") — un point coloré discret, jamais un fond plein.
export const COULEUR_POINT_IMPORTANCE: Record<ImportanceNote, string> = {
  verte: "bg-[#2F8F5B]",
  orange: "bg-[#D9861A]",
  rouge: "bg-[#C23B22]",
};

// Formate les notes actives d'un projet pour un prompt IA (point 4 du
// brief) — texte brut, lisible, jamais du JSON : l'IA d'analyse (voir
// app/api/ai/analyser-demande/route.ts) attend un contexte en langage
// naturel comme le reste de son prompt.
export function formaterNotesPourPromptIA(notes: Note[]): string {
  if (notes.length === 0) return "aucune";
  return notes
    .map((n) => `- ${n.titre}${n.description ? ` : ${n.description}` : ""}`)
    .join("\n");
}
