import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { GrilleAgenda } from "@/components/planning/GrilleAgenda";
import { getOrganisationId } from "@/lib/organisation";

function lundiDeLaSemaine(offsetSemaines: number): Date {
  const aujourdhui = new Date();
  const jourSemaine = aujourdhui.getDay(); // 0 = dimanche
  const diffVersLundi = jourSemaine === 0 ? -6 : 1 - jourSemaine;
  const lundi = new Date(aujourdhui);
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(aujourdhui.getDate() + diffVersLundi + offsetSemaines * 7);
  return lundi;
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: { semaine?: string; rdvCree?: string };
}) {
  const offset = Number(searchParams.semaine ?? "0") || 0;
  const lundi = lundiDeLaSemaine(offset);
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  dimanche.setHours(23, 59, 59, 999);

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    return d;
  });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const { data: evenementsBrut } = await supabase
    .from("evenements_planning")
    .select("*, demandes(nom_client, priorite)")
    .eq("organisation_id", organisationId)
    .gte("date_heure", lundi.toISOString())
    .lte("date_heure", dimanche.toISOString())
    .neq("statut", "annule")
    .order("date_heure", { ascending: true });

  // Supabase type "demandes(...)" comme un tableau (relation jointe), même
  // si demande_id ne pointe jamais vers plus d'un projet — on aplatit pour
  // correspondre au type attendu par GrilleAgenda (voir même remarque dans
  // app/dashboard/page.tsx et app/dashboard/devis/page.tsx).
  const evenements = (evenementsBrut ?? []).map((e) => ({
    ...e,
    demandes: Array.isArray(e.demandes) ? e.demandes[0] ?? null : e.demandes,
  }));

  const libelleSemaine = `${lundi.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })} — ${dimanche.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;

  return (
    <div className="p-8 max-w-5xl">
      {searchParams.rdvCree === "1" && (
        <div className="mb-4 rounded-xl bg-[#2F8F5B]/10 border border-[#2F8F5B]/30 px-4 py-3 text-sm text-ink/80">
          ✓ Un rendez-vous a été ajouté automatiquement au planning à partir du message du
          client.
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Planning</h1>
          <p className="mt-1 text-sm text-ink/50">{libelleSemaine}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/planning?semaine=${offset - 1}`}>
            <Button variant="ghost">← Semaine préc.</Button>
          </Link>
          <Link href="/dashboard/planning">
            <Button variant="ghost">Aujourd&apos;hui</Button>
          </Link>
          <Link href={`/dashboard/planning?semaine=${offset + 1}`}>
            <Button variant="ghost">Semaine suiv. →</Button>
          </Link>
          <Link href="/dashboard/planning/nouveau">
            <Button>+ Ajouter</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4 text-xs text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C23B22]" /> Urgent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D9861A]" /> Important
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2F8F5B]" /> Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ink/40" /> Tâche sans projet
        </span>
      </div>

      <div className="mt-4">
        <GrilleAgenda jours={jours} evenements={evenements} />
      </div>
    </div>
  );
}
