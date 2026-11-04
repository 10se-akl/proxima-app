import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GestionAnnonces, type AnnonceAdmin } from "@/components/admin/GestionAnnonces";

// ============================================================
// /admin/annonces (04/11/2026) — écrire aux comptes : une nouveauté, une
// offre, un message. Le message arrive dans la cloche de l'app et du site,
// et compte dans son chiffre tant qu'il n'est pas lu (Module 54).
// ============================================================

export const metadata: Metadata = {
  title: "Messages aux comptes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AnnoncesPage() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const [annonces, lues, organisations] = await Promise.all([
    admin
      .from("annonces")
      .select("id, genre, titre, texte, lien, organisation_id, active, publiee_le")
      .order("publiee_le", { ascending: false })
      .limit(100),
    admin.from("annonces_lues").select("annonce_id").limit(20000),
    admin.from("organisations").select("id, nom").order("nom", { ascending: true }).limit(500),
  ]);

  // Module 54 pas encore passé : on le dit, plutôt qu'une page vide.
  const moduleManquant = Boolean(annonces.error);
  const compte = new Map<string, number>();
  for (const l of lues.data ?? []) compte.set(String(l.annonce_id), (compte.get(String(l.annonce_id)) ?? 0) + 1);

  const liste: AnnonceAdmin[] = (annonces.data ?? []).map((a) => ({
    id: String(a.id),
    genre: a.genre,
    titre: String(a.titre),
    texte: String(a.texte ?? ""),
    lien: (a.lien as string | null) ?? null,
    organisation_id: (a.organisation_id as string | null) ?? null,
    active: Boolean(a.active),
    publiee_le: String(a.publiee_le),
    lues: compte.get(String(a.id)) ?? 0,
  }));

  return (
    <GestionAnnonces
      annonces={liste}
      organisations={(organisations.data ?? []).map((o) => ({ id: String(o.id), nom: String(o.nom) }))}
      moduleManquant={moduleManquant}
    />
  );
}
