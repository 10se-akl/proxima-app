import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lienSur, type GenreAnnonce } from "@/lib/annonces";

// ============================================================
// Les messages de Compyo aux comptes (Module 54, 04/11/2026) : Axel les
// publie et les retire depuis /admin/annonces. Écriture avec la clé
// service, réservée à ADMIN_EMAIL ; les comptes ne font que lire (RLS).
// Aucun envoi par e-mail ni par notification téléphone : le message
// attend dans la cloche, rien ne part sans qu'on l'ouvre.
// ============================================================

async function verifierAdmin() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  // Jamais `user?.email === process.env.ADMIN_EMAIL` seul : undefined ===
  // undefined ouvrirait l'accès si la variable manquait (audit du 05/09).
  return Boolean(user && process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL);
}

const GENRES: GenreAnnonce[] = ["nouveaute", "offre", "message"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (!(await verifierAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const corps = await request.json().catch(() => null);
  const genre = GENRES.includes(corps?.genre) ? (corps.genre as GenreAnnonce) : null;
  const titre = typeof corps?.titre === "string" ? corps.titre.trim() : "";
  const texte = typeof corps?.texte === "string" ? corps.texte.trim() : "";
  const lienBrut = typeof corps?.lien === "string" ? corps.lien.trim() : "";
  const lien = lienSur(lienBrut);
  const organisationId = typeof corps?.organisation_id === "string" && corps.organisation_id ? corps.organisation_id : null;

  if (!genre) return NextResponse.json({ error: "Choisissez le genre du message." }, { status: 400 });
  if (!titre || titre.length > 120) return NextResponse.json({ error: "Un titre de 1 à 120 caractères." }, { status: 400 });
  if (texte.length > 1000) return NextResponse.json({ error: "1 000 caractères au plus." }, { status: 400 });
  if (lienBrut && !lien) return NextResponse.json({ error: "Le lien doit commencer par / ou https://." }, { status: 400 });
  if (organisationId && !UUID.test(organisationId)) return NextResponse.json({ error: "Entreprise inconnue." }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from("annonces")
    .insert({ genre, titre, texte, lien, organisation_id: organisationId })
    .select("id")
    .single();
  if (error) {
    console.error("Annonce : publication impossible —", error);
    return NextResponse.json({ error: "Publication impossible.", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function PATCH(request: NextRequest) {
  if (!(await verifierAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const corps = await request.json().catch(() => null);
  if (typeof corps?.id !== "string" || !UUID.test(corps.id) || typeof corps?.active !== "boolean") {
    return NextResponse.json({ error: "id et active requis" }, { status: 400 });
  }
  // On retire un message (il disparaît des cloches), on ne l'efface pas.
  const { error } = await createAdminClient().from("annonces").update({ active: corps.active }).eq("id", corps.id);
  if (error) {
    console.error("Annonce : bascule impossible —", error);
    return NextResponse.json({ error: "Modification impossible.", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ active: corps.active });
}
