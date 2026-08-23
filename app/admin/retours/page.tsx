import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";

// ============================================================
// Page admin de la "carte des problèmes" (voir Module 15, supabase/schema.sql).
// Contrairement à /dashboard/retours (vue artisan, jamais nominative), cette
// page affiche le détail nominatif de chaque avis — réservée à Axel. Fetch
// direct en base ici (comme app/admin/candidatures/page.tsx), pas de passage
// par app/api/admin/retours côté rendu — cette route API reste disponible
// pour un usage client si besoin plus tard, mais n'est pas requise ici.
// ============================================================

type Avis = {
  id: string;
  probleme_id: string;
  organisation_id: string;
  user_id: string;
  importance: number;
  commentaire: string | null;
  created_at: string;
};

type Probleme = {
  id: string;
  titre: string;
  description: string | null;
  created_at: string;
};

export default async function AdminRetoursPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  const admin = createAdminClient();

  const [
    { data: problemes },
    { data: avis },
    { data: profils },
    { data: organisations },
  ] = await Promise.all([
    admin
      .from("problemes_produits")
      .select("id, titre, description, created_at")
      .order("created_at", { ascending: true }),
    admin
      .from("retours_produits")
      .select("id, probleme_id, organisation_id, user_id, importance, commentaire, created_at"),
    admin.from("profils").select("id, nom"),
    admin.from("organisations").select("id, nom"),
  ]);

  const nomParProfil = new Map(((profils as { id: string; nom: string }[]) ?? []).map((p) => [p.id, p.nom]));
  const nomParOrganisation = new Map(
    ((organisations as { id: string; nom: string }[]) ?? []).map((o) => [o.id, o.nom])
  );

  const listeProblemes = (problemes as Probleme[] | null) ?? [];
  const listeAvis = (avis as Avis[] | null) ?? [];

  const problemesDetailles = listeProblemes.map((p) => {
    const avisDuProbleme = listeAvis
      .filter((a) => a.probleme_id === p.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const nombreAvis = avisDuProbleme.length;
    const importanceMoyenne =
      nombreAvis > 0
        ? avisDuProbleme.reduce((somme, a) => somme + a.importance, 0) / nombreAvis
        : 0;

    return {
      probleme: p,
      nombreAvis,
      importanceMoyenne: Math.round(importanceMoyenne * 10) / 10,
      avis: avisDuProbleme,
    };
  });

  // Trié par pertinence (popularité × gravité perçue) décroissante, comme
  // sur la vue artisan — ce qui revient le plus souvent ET compte le plus
  // remonte en premier.
  problemesDetailles.sort(
    (a, b) => b.nombreAvis * b.importanceMoyenne - a.nombreAvis * a.importanceMoyenne
  );

  return (
    <div className="min-h-screen bg-paper p-8 max-w-4xl mx-auto">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Administration
      </p>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Retours produit — détail nominatif</h1>
        <a
          href="/admin/candidatures"
          className="text-sm text-ink/60 underline decoration-ink/30 underline-offset-2 transition-colors hover:text-ink hover:decoration-ink/50"
        >
          ← Candidatures
        </a>
      </div>

      <p className="mt-2 text-sm text-ink/50">
        Réservé à l&apos;admin plateforme : contrairement à la vue artisan (jamais nominative), chaque
        avis ci-dessous est associé à l&apos;artisan et à l&apos;organisation qui l&apos;ont exprimé.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {problemesDetailles.length === 0 && (
          <p className="text-sm text-ink/40">Aucun problème remonté pour l&apos;instant.</p>
        )}

        {problemesDetailles.map(({ probleme, nombreAvis, importanceMoyenne, avis }) => (
          <Card key={probleme.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">{probleme.titre}</p>
                {probleme.description && (
                  <p className="mt-1 text-sm text-ink/70">{probleme.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[11px] uppercase tracking-wide text-steel">
                  {nombreAvis} avis
                </p>
                <p className="mt-0.5 text-sm font-semibold text-signal">
                  {importanceMoyenne}/10 en moyenne
                </p>
              </div>
            </div>

            {avis.length > 0 && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs font-semibold text-ink/60 hover:text-ink transition-colors">
                  Voir le détail nominatif ({avis.length})
                </summary>
                <div className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-3">
                  {avis.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl bg-paper border border-ink/10 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">
                          {nomParProfil.get(a.user_id) ?? "Artisan inconnu"}
                          <span className="text-ink/40 font-normal">
                            {" "}
                            · {nomParOrganisation.get(a.organisation_id) ?? "Organisation inconnue"}
                          </span>
                        </p>
                        <p className="shrink-0 font-mono text-[11px] text-steel">
                          Importance {a.importance}/10
                        </p>
                      </div>
                      {a.commentaire && (
                        <p className="mt-1.5 text-ink/70">{a.commentaire}</p>
                      )}
                      <p className="mt-1.5 font-mono text-[10px] text-ink/40">
                        {new Date(a.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
