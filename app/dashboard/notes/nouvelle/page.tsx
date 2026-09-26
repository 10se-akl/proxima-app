"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { FormulaireNote } from "@/components/notes/FormulaireNote";
import { EtatErreur } from "@/components/ui/EtatErreur";

type ProjetLeger = { id: string; nom_client: string };

// Next.js exige que tout composant utilisant useSearchParams() soit
// entouré d'une frontière <Suspense> (même remarque que planning/nouveau).
export default function NouvelleNotePage() {
  return (
    <Suspense fallback={null}>
      <NouvelleNoteForm />
    </Suspense>
  );
}

function NouvelleNoteForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const projetIdFixe = searchParams.get("projetId") ?? undefined;

  const [projets, setProjets] = useState<ProjetLeger[]>([]);
  const [chargement, setChargement] = useState(true);
  // Sprint Robustesse (30/08) — sans ça, un échec réseau au chargement de la
  // liste des projets laissait la page bloquée sur "Chargement…" indéfiniment.
  const [erreurChargement, setErreurChargement] = useState(false);
  const nomProjetFixe = projets.find((p) => p.id === projetIdFixe)?.nom_client;

  async function charger() {
    setChargement(true);
    setErreurChargement(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Sprint Robustesse (30/08) — repéré en revue de régression :
        // sans ce `setChargement(false)`, une session expirée laissait la
        // page bloquée sur "Chargement…" comme le bug qu'on corrige ici.
        setChargement(false);
        return;
      }
      const organisationId = await getOrganisationId(supabase, user.id);
      if (!organisationId) {
        setChargement(false);
        return;
      }
      const { data, error } = await supabase
        .from("demandes")
        .select("id, nom_client")
        .eq("organisation_id", organisationId)
        .neq("statut", "termine")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjets((data as ProjetLeger[]) ?? []);
      setChargement(false);
    } catch {
      // Sprint Robustesse (30/08) — coupure réseau typiquement : état
      // d'erreur explicite avec "Réessayer" plutôt qu'un chargement bloqué.
      setErreurChargement(true);
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (chargement) {
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }

  // Sprint Robustesse (30/08) — voir le catch dans `charger` ci-dessus.
  if (erreurChargement) {
    return <EtatErreur onReessayer={charger} className="p-8" />;
  }

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-lg mx-auto">
      <Link href="/dashboard/notes" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-ink/60 hover:text-ink transition-colors">
        ← Retour aux notes
      </Link>
      <h1 className="mt-4 mb-6 font-display text-2xl font-semibold text-ink">Nouvelle note</h1>
      <FormulaireNote projetIdFixe={projetIdFixe} nomProjetFixe={nomProjetFixe} projets={projets} />
    </div>
  );
}
