import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Bascule l'écran de maintenance (Module 23, supabase/schema.sql) : Axel
// travaille seul, parfois de nuit pendant que les premiers beta testeurs
// utilisent l'app en journée — l'objectif est de pouvoir couper l'accès au
// site en un clic pendant une modification risquée plutôt que de laisser
// une erreur brute s'afficher. Un seul flag global (pas par organisation) :
// c'est tout le site qui bascule, pas un artisan en particulier. Vérifié
// par le middleware (voir middleware.ts) à chaque requête, avec bypass
// automatique pour ADMIN_EMAIL — Axel doit pouvoir continuer à naviguer
// pendant que c'est activé.
// ============================================================

async function verifierAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("parametres_systeme")
    .select("valeur, mis_a_jour_le")
    .eq("cle", "maintenance_actif")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de lire l'état" }, { status: 500 });
  }

  return NextResponse.json({ actif: data?.valeur ?? false, mis_a_jour_le: data?.mis_a_jour_le ?? null });
}

export async function POST(request: NextRequest) {
  if (!(await verifierAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { actif } = await request.json();
  if (typeof actif !== "boolean") {
    return NextResponse.json({ error: "actif (booléen) requis" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("parametres_systeme")
    .update({ valeur: actif, mis_a_jour_le: new Date().toISOString() })
    .eq("cle", "maintenance_actif");

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de mettre à jour l'état" }, { status: 500 });
  }

  return NextResponse.json({ actif });
}
