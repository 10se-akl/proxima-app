import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VueProjection } from "@/components/admin/projection/VueProjection";

// ============================================================
// /admin/projection (05/10) — Compyo sur 10 ans, jour par jour. Réservée
// à Axel (ADMIN_EMAIL). Le calcul tourne dans le navigateur
// (lib/projection/moteur.ts) : aucune donnée lue ni écrite en base.
// ============================================================

export const metadata: Metadata = {
  title: "Projection",
  robots: { index: false, follow: false },
};

export default async function ProjectionPage() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/login");
  return <VueProjection />;
}
