import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Version ADMIN de app/api/retours/route.ts (voir Module 15,
// supabase/schema.sql) : contrairement à la route publique, celle-ci
// renvoie le détail NOMINATIF de chaque avis (artisan, organisation,
// note, commentaire) — réservée exclusivement à process.env.ADMIN_EMAIL.
// Ne jamais réutiliser ce pattern pour une route accessible aux artisans.
// ============================================================

async function verifierAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === process.env.ADMIN_EMAIL;
}

type AvisNominatif = {
  id: string;
  artisanNom: string;
  organisationNom: string;
  importance: number;
  commentaire: string | null;
  createdAt: string;
};

type ProblemeDetaille = {
  id: string;
  titre: string;
  description: string | null;
  createdAt: string;
  nombreAvis: number;
  importanceMoyenne: number;
  avis: AvisNominatif[];
};

export async function GET() {
  const estAdmin = await verifierAdmin();
  if (!estAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [
    { data: problemes, error: erreurProblemes },
    { data: avis, error: erreurAvis },
    { data: profils, error: erreurProfils },
    { data: organisations, error: erreurOrganisations },
  ] = await Promise.all([
    admin
      .from("problemes_produits")
      .select("id, titre, description, created_at")
      .order("created_at", { ascending: true }),
    admin
      .from("retours_produits")
      .select("id, probleme_id, organisation_id, user_id, importance, commentaire, created_at"),
    admin.from("profils").select("id, nom"),
    admin.from("organisations").select("id, nom"),
  ]);

  if (erreurProblemes || erreurAvis || erreurProfils || erreurOrganisations) {
    console.error(erreurProblemes ?? erreurAvis ?? erreurProfils ?? erreurOrganisations);
    return NextResponse.json({ error: "Impossible de charger les retours" }, { status: 500 });
  }

  const nomParProfil = new Map((profils ?? []).map((p) => [p.id, p.nom as string]));
  const nomParOrganisation = new Map((organisations ?? []).map((o) => [o.id, o.nom as string]));

  const resultats: ProblemeDetaille[] = (problemes ?? []).map((p) => {
    const avisDuProbleme = (avis ?? []).filter((a) => a.probleme_id === p.id);
    const nombreAvis = avisDuProbleme.length;
    const importanceMoyenne =
      nombreAvis > 0
        ? avisDuProbleme.reduce((somme, a) => somme + a.importance, 0) / nombreAvis
        : 0;

    return {
      id: p.id,
      titre: p.titre,
      description: p.description,
      createdAt: p.created_at,
      nombreAvis,
      importanceMoyenne: Math.round(importanceMoyenne * 10) / 10,
      avis: avisDuProbleme
        .map((a) => ({
          id: a.id,
          artisanNom: nomParProfil.get(a.user_id) ?? "Artisan inconnu",
          organisationNom: nomParOrganisation.get(a.organisation_id) ?? "Organisation inconnue",
          importance: a.importance,
          commentaire: a.commentaire,
          createdAt: a.created_at,
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    };
  });

  // Même logique de tri que la route publique (popularité × gravité
  // perçue décroissante) pour rester cohérent entre les deux vues.
  resultats.sort((a, b) => b.nombreAvis * b.importanceMoyenne - a.nombreAvis * a.importanceMoyenne);

  return NextResponse.json({ problemes: resultats });
}
