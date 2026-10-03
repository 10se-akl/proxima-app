import { createClient } from "@/lib/supabase/server";
import { ListeFacturesRecherchable } from "@/components/dashboard/ListeFacturesRecherchable";
import { getOrganisationId } from "@/lib/organisation";

// Module 28 (06/09) — liste de toutes les factures de l'organisation, même
// structure que app/dashboard/devis/page.tsx.
// Refonte (03/10) : ?statut= ouvre la liste déjà filtrée (page Argent).
export default async function FacturesPage({ searchParams }: { searchParams?: { statut?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const { data: facturesBrutes } = await supabase
    .from("factures")
    .select(
      "id, demande_id, type, numero, statut, total_ttc, date_emission, notifie_relance_le, demandes(nom_client)"
    )
    .eq("organisation_id", organisationId)
    .order("date_emission", { ascending: false });

  const factures = (facturesBrutes ?? []).map((f) => ({
    ...f,
    demandes: Array.isArray(f.demandes) ? f.demandes[0] ?? null : f.demandes,
  }));

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold">Factures</h1>
        {factures.length > 0 && (
          <a
            href="/api/factures/export-comptable"
            className="text-sm text-ink/60 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40"
          >
            Export comptable (CSV)
          </a>
        )}
      </div>

      <div className="mt-5">
        <ListeFacturesRecherchable factures={factures} filtreInitial={searchParams?.statut} />
      </div>
    </div>
  );
}
