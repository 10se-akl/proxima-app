import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { ToggleMaintenance } from "@/components/admin/ToggleMaintenance";

export default async function AdminMaintenancePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("parametres_systeme")
    .select("valeur")
    .eq("cle", "maintenance_actif")
    .maybeSingle();

  return (
    <div className="min-h-screen bg-paper p-8 max-w-4xl mx-auto">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Administration
      </p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl font-semibold">Écran de maintenance</h1>
        <div className="flex items-center gap-4">
          <a
            href="/admin/logs"
            className="text-sm text-ink/60 underline decoration-ink/30 underline-offset-2 transition-colors hover:text-ink hover:decoration-ink/50"
          >
            Logs
          </a>
          <a
            href="/admin/candidatures"
            className="text-sm text-ink/60 underline decoration-ink/30 underline-offset-2 transition-colors hover:text-ink hover:decoration-ink/50"
          >
            Candidatures
          </a>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink/60 max-w-xl">
        À activer avant une modification risquée (déploiement, migration en direct) pour
        éviter qu&apos;un beta testeur ne tombe sur une erreur brute. Toi seul continues à voir
        le site normalement pendant que c&apos;est activé — tout le monde d&apos;autre voit
        l&apos;écran de maintenance, avec effet immédiat.
      </p>

      <Card className="mt-6 p-6 max-w-xl">
        <ToggleMaintenance actifInitial={data?.valeur ?? false} />
      </Card>
    </div>
  );
}
