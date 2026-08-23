import { redirect } from "next/navigation";

// ============================================================
// Refonte Module 16 (voir supabase/schema.sql) : cette page est remplacée
// par le bouton "Faire un retour" toujours accessible (voir
// components/dashboard/BoutonRetour.tsx, monté dans app/dashboard/layout.tsx)
// pour l'envoi, et par /carte-mentale pour la visualisation — gardée en
// redirection plutôt que supprimée pour ne pas casser un ancien lien/favori.
// ============================================================

export default function DashboardRetoursPage() {
  redirect("/carte-mentale");
}
