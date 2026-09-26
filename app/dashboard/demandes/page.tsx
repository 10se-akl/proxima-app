import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { ListeProjetsRecherchable } from "@/components/dashboard/ListeProjetsRecherchable";
import { AstucePartage } from "@/components/onboarding/AstucePartage";
import type { Projet } from "@/types";

export default async function ProjetsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = user ? await getOrganisationId(supabase, user.id) : null;

  const { data: projets } = organisationId
    ? await supabase
        .from("demandes")
        .select("*")
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false })
    : { data: [] as Projet[] | null };

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-4xl">
      {/* 26/09 (lot C) — plus de bouton « Nouveau projet » ici : le [+] de
          la navigation est la seule porte d'entrée, partout. */}
      <h1 className="font-display text-2xl font-semibold text-ink">Projets</h1>

      <div className="mt-6">
        <AstucePartage />
        <ListeProjetsRecherchable projets={(projets as Projet[] | null) ?? []} />
      </div>
    </div>
  );
}
