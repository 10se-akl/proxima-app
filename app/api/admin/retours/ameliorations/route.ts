import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// "Créer une tâche" depuis le panneau admin de la carte mentale (voir
// Module 21, supabase/schema.sql) : convertir un thème remonté par les
// artisans en note de travail actionnable, sans quitter la page. Volontairement
// minimal (pas de dates, assignation, priorité...) — Compyo est un produit
// solo, pas un outil de gestion de projet ; l'objectif est juste de ne pas
// perdre une idée entre le moment où elle apparaît sur la carte et le
// moment où Axel a le temps de la traiter.
// ============================================================

async function verifierAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 🔴 Audit sécurité (05/09) : `user?.email === process.env.ADMIN_EMAIL`
  // vaut `true` pour un visiteur NON CONNECTÉ si ADMIN_EMAIL n'est pas
  // défini en environnement (undefined === undefined) — accès admin total
  // sans authentification en cas d'oubli de variable d'env.
  return Boolean(user && user.email === process.env.ADMIN_EMAIL);
}

export async function GET(request: NextRequest) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const categorie = request.nextUrl.searchParams.get("categorie");
  const admin = createAdminClient();

  let requete = admin
    .from("ameliorations_produit")
    .select("id, categorie, titre, statut, created_at")
    .order("created_at", { ascending: false });

  if (categorie) {
    requete = requete.eq("categorie", categorie);
  }

  const { data, error } = await requete;
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger les tâches" }, { status: 500 });
  }

  return NextResponse.json({ taches: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { categorie, titre } = await request.json();
  if (!categorie || typeof titre !== "string" || !titre.trim()) {
    return NextResponse.json({ error: "categorie et titre requis" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ameliorations_produit")
    .insert({ categorie, titre: titre.trim().slice(0, 200) })
    .select("id, categorie, titre, statut, created_at")
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de créer la tâche" }, { status: 500 });
  }

  return NextResponse.json({ tache: data });
}

const STATUTS_VALIDES = ["a_faire", "en_cours", "fait"] as const;

export async function PATCH(request: NextRequest) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id, statut } = await request.json();
  if (!id || !STATUTS_VALIDES.includes(statut)) {
    return NextResponse.json({ error: "id et statut valides requis" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ameliorations_produit").update({ statut }).eq("id", id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de mettre à jour la tâche" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
