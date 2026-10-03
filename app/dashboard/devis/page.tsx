import { createClient } from "@/lib/supabase/server";
import { ListeDevisRecherchable } from "@/components/dashboard/ListeDevisRecherchable";
import { getOrganisationId } from "@/lib/organisation";

// Refonte (03/10) : ?statut= ouvre la liste déjà filtrée (page Argent).
export default async function DevisPage({ searchParams }: { searchParams?: { statut?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const { data: devisListBrut } = await supabase
    .from("devis")
    .select(
      "id, demande_id, numero, statut, total_estime, envoye_le, created_at, notifie_relance_j5_le, notifie_relance_j10_le, demandes(nom_client, statut)"
    )
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  // Supabase renvoie "demandes" comme un tableau au niveau du type (relation
  // jointe), même si c'est en réalité toujours 0 ou 1 projet par devis (clé
  // étrangère demande_id). On aplatit ici pour correspondre à la forme
  // attendue par le composant plutôt que de complexifier son typage.
  const devisList = (devisListBrut ?? []).map((d) => ({
    ...d,
    demandes: Array.isArray(d.demandes) ? d.demandes[0] ?? null : d.demandes,
  }));

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold">Devis</h1>

      <div className="mt-5">
        <ListeDevisRecherchable devisList={devisList} filtreInitial={searchParams?.statut} />
      </div>
    </div>
  );
}
