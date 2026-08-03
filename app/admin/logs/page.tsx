import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";

const STYLE_TYPE: Record<string, string> = {
  erreur_ia: "text-signal",
  analyse_ia: "text-steel",
  devis_genere: "text-steel",
  reponse_generee: "text-steel",
};

export default async function AdminLogsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("logs")
    .select("*, profils(nom)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="min-h-screen bg-paper p-8 max-w-4xl mx-auto">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Administration
      </p>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">
          Logs (100 derniers événements)
        </h1>
        <a href="/admin/candidatures" className="text-sm text-ink/60 hover:text-ink underline">
          ← Candidatures
        </a>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {(!logs || logs.length === 0) && (
          <p className="text-sm text-ink/40">Aucun événement pour le moment.</p>
        )}
        {logs?.map((log) => (
          <Card key={log.id} className="p-4">
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  STYLE_TYPE[log.type] ?? "text-ink/50"
                }`}
              >
                {log.type}
              </span>
              <span className="font-mono text-[10px] text-ink/40">
                {new Date(log.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              {(log as { profils?: { nom?: string } }).profils?.nom ?? "Artisan inconnu"}
              {log.contexte && ` · projet ${log.contexte.slice(0, 8)}`}
            </p>
            {log.details && (
              <pre className="mt-2 text-[10px] font-mono text-ink/40 whitespace-pre-wrap break-all">
                {JSON.stringify(log.details)}
              </pre>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
