import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { ActionsCandidature } from "@/components/admin/ActionsCandidature";
import type { Candidature } from "@/types";

export default async function AdminCandidaturesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: candidatures } = await admin
    .from("candidatures")
    .select("*")
    .order("created_at", { ascending: false });

  const liste = (candidatures as Candidature[] | null) ?? [];
  const enAttente = liste.filter((c) => c.statut === "pending");
  const traitees = liste.filter((c) => c.statut !== "pending");

  return (
    <div className="min-h-screen bg-paper p-8 max-w-4xl mx-auto">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Administration
      </p>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Candidatures bêta privée</h1>
        <a href="/admin/logs" className="text-sm text-ink/60 hover:text-ink underline">
          Voir les logs →
        </a>
      </div>

      <h2 className="mt-10 text-sm font-semibold text-ink/70">
        En attente ({enAttente.length})
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {enAttente.length === 0 && (
          <p className="text-sm text-ink/40">Aucune candidature en attente.</p>
        )}
        {enAttente.map((c) => (
          <CandidatureCard key={c.id} candidature={c} />
        ))}
      </div>

      {traitees.length > 0 && (
        <>
          <h2 className="mt-12 text-sm font-semibold text-ink/70">Traitées</h2>
          <div className="mt-4 flex flex-col gap-3">
            {traitees.map((c) => (
              <CandidatureCard key={c.id} candidature={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CandidatureCard({ candidature }: { candidature: Candidature }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">
            {candidature.prenom} {candidature.nom} — {candidature.metier}
          </p>
          <p className="text-xs text-ink/50 mt-0.5">
            {candidature.entreprise ?? "Sans entreprise renseignée"} · {candidature.email} ·{" "}
            {candidature.telephone}
          </p>
        </div>
        <ActionsCandidature candidature={candidature} />
      </div>

      <p className="mt-3 text-sm text-ink/70">{candidature.probleme_principal}</p>

      <div className="mt-3 flex gap-4 font-mono text-[10px] text-ink/40">
        {candidature.nb_employes && <span>{candidature.nb_employes} employé(s)</span>}
        {candidature.devis_par_semaine && (
          <span>{candidature.devis_par_semaine} devis/semaine</span>
        )}
        {candidature.decouverte && <span>Via {candidature.decouverte}</span>}
      </div>
    </Card>
  );
}
