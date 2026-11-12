import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Ouvrir un compte artisan (04/10) — profil, organisation, puis accès.
//
// Écrit le 04/10 (branche garée acces-immediat-wip), branché le 12/11 :
// à l'inscription, le compte s'ouvre tout de suite tant que la bêta a des
// places (lib/candidatures/places.ts, 20 places). Au-delà, ou si une étape
// échoue, il reste « en attente » et Axel l'accepte depuis
// /admin/candidatures, comme avant.
//
// Chaque étape est rejouable, et l'ordre est choisi pour qu'un échec laisse
// toujours le compte FERMÉ : l'accès ne passe à "actif" qu'une fois le
// profil et l'organisation en place. Un compte resté fermé apparaît dans
// /admin/candidatures, où « Accepter » reprend là où ça s'était arrêté.
// ============================================================

type Admin = ReturnType<typeof createAdminClient>;

// Chaque nouveau compte artisan devient propriétaire de sa propre
// organisation (Module 14, supabase/schema.sql) : c'est ce qui lui permet
// ensuite d'inviter un employé ou un conjoint dans SA même organisation.
export async function creerOrganisationProprietaire(admin: Admin, userId: string, nomOrganisation: string) {
  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({ nom: nomOrganisation, cree_par: userId })
    .select("id")
    .single();

  if (orgError || !org) {
    return orgError ?? new Error("Organisation non créée");
  }

  const { error: membershipError } = await admin
    .from("memberships")
    .insert({ organisation_id: org.id, user_id: userId, role: "proprietaire" });

  return membershipError ?? null;
}

export async function ouvrirCompte(
  admin: Admin,
  p: { userId: string; nomComplet: string; entreprise: string | null; metier: string; email: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  // 1. Profil
  const { data: profil } = await admin.from("profils").select("id").eq("id", p.userId).maybeSingle();
  if (!profil) {
    const { error } = await admin.from("profils").insert({
      id: p.userId,
      nom: p.nomComplet,
      entreprise: p.entreprise,
      metier: p.metier,
      email: p.email,
    });
    if (error) {
      console.error("Ouverture : profil non créé —", error.message);
      return { ok: false, message: "Profil non créé. Le compte reste fermé : réessayez." };
    }
  }

  // 2. Organisation (dont il devient propriétaire)
  const { data: membership } = await admin
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", p.userId)
    .maybeSingle();
  if (!membership) {
    const erreurOrg = await creerOrganisationProprietaire(admin, p.userId, p.entreprise ?? p.nomComplet);
    if (erreurOrg) {
      console.error("Ouverture : organisation non créée —", erreurOrg);
      return { ok: false, message: "Organisation non créée. Le compte reste fermé : réessayez." };
    }
  }

  // 3. Ouverture — en dernier, une fois tout le reste en place. Supabase
  // fusionne app_metadata : les autres clés (fournisseur de connexion) sont
  // conservées.
  const { error: erreurOuverture } = await admin.auth.admin.updateUserById(p.userId, {
    app_metadata: { acces: "actif" },
  });
  if (erreurOuverture) {
    console.error("Ouverture : accès non activé —", erreurOuverture.message);
    return { ok: false, message: "Profil prêt, mais le compte n'a pas pu être ouvert. Réessayez." };
  }

  return { ok: true };
}
