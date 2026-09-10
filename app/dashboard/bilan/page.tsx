import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { calculerBilanMensuel } from "@/lib/bilan-mensuel";
import { Card } from "@/components/ui/Card";

// ============================================================
// Bilan mensuel (08/09) — voir Module 32, lib/bilan-mensuel.ts et
// docs/idees-futures.md pour le raisonnement produit. Ton neutre façon
// relevé bancaire, volontairement : pas d'exclamation, pas de "Bravo !",
// pas de comparaison à la concurrence, pas d'appel à l'action commercial
// sur cet écran — un chiffre encadré par sa méthode de calcul inspire
// confiance, un slogan sonne comme une pub.
// ============================================================

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function moisDepuisParam(param: string | undefined): { debut: Date; fin: Date; libelle: string } {
  const maintenant = new Date();
  let annee = maintenant.getFullYear();
  let mois = maintenant.getMonth() - 1; // mois précédent par défaut

  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [a, m] = param.split("-").map(Number);
    annee = a;
    mois = m - 1;
  }

  const debut = new Date(annee, mois, 1);
  const fin = new Date(annee, mois + 1, 1);
  const libelle = debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { debut, fin, libelle };
}

export default async function BilanMensuelPage({
  searchParams,
}: {
  searchParams: { mois?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");
  const { debut, fin, libelle } = moisDepuisParam(searchParams.mois);

  if (!organisationId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-sm text-ink/50">Aucune organisation associée à ce compte.</p>
      </div>
    );
  }

  const bilan = await calculerBilanMensuel(supabase, organisationId, debut, fin);

  // Audit "vérification systématique" (10/09) — trouvé par un agent de
  // recherche : devisEnvoyes compte par devis.envoye_le, devisAcceptes
  // compte par la date de l'ÉVÉNEMENT d'acceptation (lib/bilan-mensuel.ts)
  // — deux fenêtres réellement différentes. Un devis envoyé fin du mois
  // précédent et accepté ce mois-ci compte dans devisAcceptes sans avoir
  // compté dans devisEnvoyes, et le "taux" peut alors dépasser 100% — un
  // chiffre qui se contredit lui-même, à l'opposé du "relevé bancaire"
  // digne de confiance visé par cet écran (voir commentaire en tête de
  // lib/bilan-mensuel.ts). On n'affiche donc la proportion que quand elle
  // reste mathématiquement cohérente (jamais > 100%) — les deux nombres
  // bruts, eux, restent toujours affichés, jamais masqués.
  const tauxTransformation =
    bilan.devisEnvoyes > 0 && bilan.devisAcceptes <= bilan.devisEnvoyes
      ? Math.round((bilan.devisAcceptes / bilan.devisEnvoyes) * 100)
      : null;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel">Bilan mensuel</p>
      <h1 className="mt-1 font-display text-2xl font-semibold capitalize">{libelle}</h1>

      <Card className="mt-6 p-6">
        <div className="divide-y divide-ink/10">
          <div className="py-4 first:pt-0">
            <p className="text-xs text-ink/50">Montant encaissé via les factures Compyo</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {formatEuros(bilan.montantEncaisse)}
            </p>
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink/50">Devis envoyés</p>
              <p className="mt-1 text-lg font-medium">{bilan.devisEnvoyes}</p>
            </div>
            <div>
              <p className="text-xs text-ink/50">Devis acceptés</p>
              <p className="mt-1 text-lg font-medium">
                {bilan.devisAcceptes}
                {tauxTransformation !== null && (
                  <span className="ml-1.5 text-xs text-ink/40 font-normal">
                    ({tauxTransformation}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="py-4 last:pb-0">
            <p className="text-xs text-ink/50">Temps estimé gagné grâce à Compyo</p>
            <p className="mt-1 text-lg font-medium">{bilan.heuresGagnees} h</p>
            {bilan.detailHeures.length > 0 && (
              <ul className="mt-2 space-y-1">
                {bilan.detailHeures.map((d) => (
                  <li key={d.libelle} className="text-xs text-ink/50">
                    {d.libelle} : {d.occurrences} × ~{Math.round(d.minutes / d.occurrences)} min
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <p className="mt-4 text-xs text-ink/40 leading-relaxed">
        Le temps gagné est une estimation, calculée selon la méthode détaillée ci-dessus — pas une
        mesure exacte. Le montant encaissé, lui, correspond aux factures que vous avez marquées
        comme payées sur cette période.
      </p>
    </div>
  );
}
