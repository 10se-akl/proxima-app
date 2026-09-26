import { createClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/organisation";
import { GestionEquipe } from "@/components/dashboard/GestionEquipe";

// ============================================================
// Gestion d'équipe (08/09) — l'API existait déjà (app/api/equipe/inviter,
// app/api/equipe/retirer) mais aucune page ne s'en servait : un artisan ne
// pouvait tout simplement pas ajouter un coéquipier depuis l'interface.
// Cette page ne fait que lire les données et les passer au composant
// client qui gère l'interaction — toute la logique métier (qui a le droit
// d'inviter/retirer) est déjà dans les routes API, pas dupliquée ici.
// ============================================================

type MembreBrut = {
  user_id: string;
  role: string;
  profils: { nom: string; email: string; metier: string } | { nom: string; email: string; metier: string }[] | null;
};

export default async function EquipePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = user ? await getMembership(supabase, user.id) : null;

  if (!membership) {
    return (
      <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl mx-auto">
        <p className="text-sm text-ink/50">Aucune organisation associée à ce compte.</p>
      </div>
    );
  }

  const { data: membresBrut } = await supabase
    .from("memberships")
    .select("user_id, role, profils(nom, email, metier)")
    .eq("organisation_id", membership.organisationId)
    .order("created_at", { ascending: true });

  // "profils(...)" est typé comme un tableau par Supabase (relation
  // jointe), même si user_id ne pointe jamais vers plus d'un profil — même
  // remarque qu'ailleurs dans l'app (voir app/dashboard/page.tsx).
  const membres = ((membresBrut as MembreBrut[] | null) ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as "proprietaire" | "employe",
    profil: Array.isArray(m.profils) ? m.profils[0] ?? null : m.profils,
  }));

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-semibold">Équipe</h1>
      <p className="mt-1 text-sm text-ink/50">
        Toutes les personnes de votre équipe voient les mêmes projets, devis et planning.
      </p>

      <GestionEquipe
        membres={membres}
        monUserId={user?.id ?? ""}
        estProprietaire={membership.role === "proprietaire"}
      />
    </div>
  );
}
