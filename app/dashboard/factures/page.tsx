import { createClient } from "@/lib/supabase/server";
import { CLASSE_PAGE_LARGE } from "@/components/ui/EnTetePage";
import { BOUTON_CREUX, BOUTON_TEXTE } from "@/components/ui/recettes";
import { ListeFacturesRecherchable } from "@/components/dashboard/ListeFacturesRecherchable";
import { getOrganisationId } from "@/lib/organisation";

// Module 28 (06/09) — liste de toutes les factures de l'organisation, même
// structure que app/dashboard/devis/page.tsx.
// Refonte (03/10) : ?statut= ouvre la liste déjà filtrée (page Argent).
function IconeExport() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export default async function FacturesPage({ searchParams }: { searchParams?: { statut?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const { data: facturesBrutes } = await supabase
    .from("factures")
    .select(
      "id, demande_id, type, numero, statut, total_ttc, date_emission, date_echeance, notifie_relance_le, demandes(nom_client)"
    )
    .eq("organisation_id", organisationId)
    .order("date_emission", { ascending: false });

  const factures = (facturesBrutes ?? []).map((f) => ({
    ...f,
    demandes: Array.isArray(f.demandes) ? f.demandes[0] ?? null : f.demandes,
  }));

  return (
    // Design v3 (24/10) : la grille commune des écrans de liste.
    <div className={CLASSE_PAGE_LARGE}>
      {/* L'en-tête vit dans la liste : la recherche, les filtres et
          l'export comptable y sont posés. */}
      <ListeFacturesRecherchable
        factures={factures}
        filtreInitial={searchParams?.statut}
        // 25/10 — sur téléphone, l'export comptable (un geste rare) quitte
        // le haut de l'écran : il descend sous la liste, en bouton texte.
        // Sur ordinateur, il reste dans l'en-tête, en creux.
        actions={
          factures.length > 0 ? (
            <a href="/api/factures/export-comptable" className={`${BOUTON_CREUX} hidden sm:inline-flex`}>
              <IconeExport />
              Export comptable (CSV)
            </a>
          ) : undefined
        }
        pied={
          factures.length > 0 ? (
            <a href="/api/factures/export-comptable" className={`-ml-3 mt-3 sm:hidden ${BOUTON_TEXTE}`}>
              <IconeExport />
              Export comptable (CSV)
            </a>
          ) : undefined
        }
      />
    </div>
  );
}
