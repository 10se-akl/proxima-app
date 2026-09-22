import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avant, depuisCle, moisCourant } from "@/lib/moisParis";
import { calculerStatistiques } from "@/lib/statistiques/calculerStatistiques";
import { VueStatistiques } from "@/components/admin/stats/VueStatistiques";

// ============================================================
// /admin/statistiques (Module 44, 22/09) — le site et l'app, mois par
// mois, sur une seule page. Réservée à Axel (ADMIN_EMAIL). Voir
// lib/statistiques/calculerStatistiques.ts pour les sources et les règles
// d'exclusion des comptes de test.
// ============================================================

export const metadata: Metadata = {
  title: "Statistiques",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StatistiquesPage({ searchParams }: { searchParams: { mois?: string } }) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/login");

  const courant = moisCourant();
  const demande = depuisCle(searchParams.mois);
  const mois = demande && !avant(courant, demande) ? demande : courant;

  const stats = await calculerStatistiques(createAdminClient(), mois, process.env.ADMIN_EMAIL);
  return <VueStatistiques stats={stats} />;
}
