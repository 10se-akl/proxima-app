"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { FormulaireNote } from "@/components/notes/FormulaireNote";

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
  const nomProjetFixe = projets.find((p) => p.id === projetIdFixe)?.nom_client;

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const organisationId = await getOrganisationId(supabase, user.id);
      if (!organisationId) return;
      const { data } = await supabase
        .from("demandes")
        .select("id, nom_client")
        .eq("organisation_id", organisationId)
        .neq("statut", "termine")
        .order("created_at", { ascending: false });
      setProjets((data as ProjetLeger[]) ?? []);
      setChargement(false);
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (chargement) {
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <Link href="/dashboard/notes" className="text-sm text-ink/60 hover:text-ink transition-colors">
        ← Retour aux notes
      </Link>
      <h1 className="mt-4 mb-6 font-display text-2xl font-semibold text-ink">Nouvelle note</h1>
      <FormulaireNote projetIdFixe={projetIdFixe} nomProjetFixe={nomProjetFixe} projets={projets} />
    </div>
  );
}
