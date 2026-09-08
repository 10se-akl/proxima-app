import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Signature électronique en ligne (08/09) — voir Module 31,
// supabase/schema.sql. Route PUBLIQUE, volontairement sans aucune
// vérification d'authentification : c'est le lien envoyé au client pour
// consulter son devis. Toute la sécurité (quelles colonnes exposer, quel
// état de devis reste consultable) vit dans la fonction Postgres
// obtenir_devis_public(), pas ici — jamais de client_admin (service_role),
// jamais de policy RLS publique sur la table devis elle-même.
// ============================================================

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc("obtenir_devis_public", { p_devis_id: params.id })
    .maybeSingle();

  if (error) {
    console.error("obtenir_devis_public a échoué :", error);
    return NextResponse.json({ error: "Impossible de charger ce devis." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Devis introuvable ou plus disponible." }, { status: 404 });
  }

  return NextResponse.json({ devis: data });
}
