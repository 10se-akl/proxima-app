import { createClient } from "@/lib/supabase/server";
import { ListeFacturesRecherchable } from "@/components/dashboard/ListeFacturesRecherchable";
import { getOrganisationId } from "@/lib/organisation";

// Module 28 (06/09) — liste de toutes les factures de l'organisation, même
// structure que app/dashboard/devis/page.tsx.
export default async function FacturesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const { data: facturesBrutes } = await supabase
    .from("factures")
    .select("id, demande_id, type, numero, statut, total_ttc, date_emission, demandes(nom_client)")
    .eq("organisation_id", organisationId)
    .order("date_emission", { ascending: false });

  const factures = (facturesBrutes ?? []).map((f) => ({
    ...f,
    demandes: Array.isArray(f.demandes) ? f.demandes[0] ?? null : f.demandes,
  }));

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Factures</h1>
          <p className="mt-1.5 text-sm text-ink/50">
            Toutes vos factures, tous projets confondus. Cliquez sur une facture pour ouvrir le projet.
          </p>
        </div>
        {factures.length > 0 && (
          <a
            href="/api/factures/export-comptable"
            className="text-sm text-ink/60 underline decoration-ink/20 underline-offset-2 hover:text-signal hover:decoration-signal/40"
          >
            Export comptable (CSV)
          </a>
        )}
      </div>

      <div className="mt-8">
        <ListeFacturesRecherchable factures={factures} />
      </div>
    </div>
  );
}
