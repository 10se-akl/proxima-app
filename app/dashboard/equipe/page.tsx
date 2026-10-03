import { redirect } from "next/navigation";

// ============================================================
// Refonte (03/10, duel A) — une seule interface d'équipe : Paramètres ›
// Équipe (components/dashboard/EquipeSection.tsx). Cette page en était un
// double (GestionEquipe.tsx, retiré), sans aucun lien vers elle, et sa
// liste des membres reposait sur une jointure memberships → profils que
// la base ne connaît pas. L'adresse est gardée : elle mène au bon
// endroit, groupe Équipe ouvert.
// ============================================================

export default function EquipePage() {
  redirect("/dashboard/parametres#equipe");
}
