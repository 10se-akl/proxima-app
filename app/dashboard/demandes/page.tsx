import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ListeProjetsRecherchable } from "@/components/dashboard/ListeProjetsRecherchable";
import type { Projet } from "@/types";

export default async function ProjetsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projets } = await supabase
    .from("demandes")
    .select("*")
    .eq("artisan_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Projets</h1>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/demandes/importer">
            <Button variant="ghost">Importer un message</Button>
          </Link>
          <Link href="/dashboard/demandes/importer-capture">
            <Button variant="ghost">Importer des captures d&apos;écran</Button>
          </Link>
          <Link href="/dashboard/demandes/nouvelle">
            <Button>+ Nouveau projet</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ListeProjetsRecherchable projets={(projets as Projet[] | null) ?? []} />
      </div>
    </div>
  );
}
