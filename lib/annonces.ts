import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Les messages de Compyo aux comptes (Module 54, 04/11/2026) : une
// nouveauté, une offre, ou un message. Publiés par Axel depuis
// /admin/annonces ; lus dans la cloche (components/notifications/
// CentreNotifications.tsx). La RLS ne laisse voir que les annonces actives
// destinées à tous ou à l'entreprise du compte.
//
// Tant que le Module 54 n'est pas passé, les tables n'existent pas :
// chaque fonction rend alors une liste vide, sans erreur à l'écran.
// ============================================================

export type GenreAnnonce = "nouveaute" | "offre" | "message";

export type Annonce = {
  id: string;
  genre: GenreAnnonce;
  titre: string;
  texte: string;
  lien: string | null;
  publiee_le: string;
  lue: boolean;
};

export const LIBELLE_GENRE: Record<GenreAnnonce, string> = {
  nouveaute: "Nouveauté",
  offre: "Offre",
  message: "Message",
};

/** Un lien d'annonce n'ouvre que Compyo (/…) ou une adresse https. */
export function lienSur(lien: string | null | undefined): string | null {
  const l = (lien ?? "").trim();
  if (!l) return null;
  if (l.startsWith("/") && !l.startsWith("//")) return l;
  return /^https:\/\/[^\s]+$/.test(l) ? l : null;
}

/** Les 10 dernières annonces visibles par ce compte, lues ou non. */
export async function listerAnnonces(supabase: SupabaseClient, profilId: string): Promise<Annonce[]> {
  const [{ data, error }, { data: lues }] = await Promise.all([
    supabase
      .from("annonces")
      .select("id, genre, titre, texte, lien, publiee_le")
      .order("publiee_le", { ascending: false })
      .limit(10),
    supabase.from("annonces_lues").select("annonce_id").eq("profil_id", profilId),
  ]);
  if (error || !data) return [];
  const dejaLues = new Set((lues ?? []).map((l) => String(l.annonce_id)));
  return data.map((a) => ({
    id: String(a.id),
    genre: (a.genre as GenreAnnonce) ?? "message",
    titre: String(a.titre ?? ""),
    texte: String(a.texte ?? ""),
    lien: lienSur(a.lien as string | null),
    publiee_le: String(a.publiee_le),
    lue: dejaLues.has(String(a.id)),
  }));
}

/** Ouvrir la cloche vaut lecture. Un échec ne gêne rien : le chiffre
 *  reviendra simplement à la prochaine ouverture. */
export async function marquerAnnoncesLues(supabase: SupabaseClient, profilId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await supabase
      .from("annonces_lues")
      .upsert(
        ids.map((id) => ({ annonce_id: id, profil_id: profilId })),
        { onConflict: "annonce_id,profil_id", ignoreDuplicates: true }
      );
  } catch {
    // Rien à faire : voir plus haut.
  }
}
