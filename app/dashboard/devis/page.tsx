import { createClient } from "@/lib/supabase/server";
import { ListeDevisRecherchable } from "@/components/dashboard/ListeDevisRecherchable";

export default async function DevisPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: devisListBrut } = await supabase
    .from("devis")
    .select(
      "id, demande_id, numero, statut, total_estime, envoye_le, created_at, demandes(nom_client, statut)"
    )
    .eq("artisan_id", user?.id)
    .order("created_at", { ascending: false });

  // Supabase renvoie "demandes" comme un tableau au niveau du type (relation
  // jointe), même si c'est en réalité toujours 0 ou 1 projet par devis (clé
  // étrangère demande_id). On aplatit ici pour correspondre à la forme
  // attendue par le composant plutôt que de complexifier son typage.
  const devisList = (devisListBrut ?? []).map((d) => ({
    ...d,
    demandes: Array.isArray(d.demandes) ? d.demandes[0] ?? null : d.demandes,
  }));

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-2xl font-semibold">Devis</h1>
      <p className="mt-1.5 text-sm text-ink/50">
        Tous vos devis, tous projets confondus. Cliquez sur un devis pour ouvrir le projet.
      </p>

      <div className="mt-8">
        <ListeDevisRecherchable devisList={devisList} />
      </div>
    </div>
  );
}
