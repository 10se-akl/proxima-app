import { createClient } from "@/lib/supabase/server";
import { CLASSE_BOUTON_NUIT_SECONDAIRE } from "@/components/ui/EnTetePage";
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
    <div className="px-4 pt-4 pb-8 sm:p-8 max-w-4xl">
      {/* L'en-tête bleu nuit vit dans la liste : la recherche, les filtres
          et l'export comptable y sont posés. */}
      <ListeFacturesRecherchable
        factures={factures}
        filtreInitial={searchParams?.statut}
        actions={
          factures.length > 0 ? (
            <a href="/api/factures/export-comptable" className={CLASSE_BOUTON_NUIT_SECONDAIRE}>
              Export comptable (CSV)
            </a>
          ) : undefined
        }
      />
    </div>
  );
}
