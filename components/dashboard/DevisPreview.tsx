import { Button } from "@/components/ui/Button";
import type { Devis, ParametresEntreprise } from "@/types";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function DevisPreview({
  devis,
  nomClient,
  telephoneClient,
  adresseClient,
  nomArtisan,
  entreprise,
  logoUrl,
}: {
  devis: Devis;
  nomClient: string;
  telephoneClient?: string | null;
  adresseClient?: string | null;
  nomArtisan: string;
  entreprise?: ParametresEntreprise | null;
  logoUrl?: string | null;
}) {
  const totalHT = devis.total_estime - devis.montant_tva;
  const montantMarge = totalHT - devis.sous_total_ht - devis.deplacement;

  return (
    <div>
      <div id="devis-imprimable" className="rounded-2xl border border-ink/10 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink/10">
          <div className="flex items-start gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-12 h-12 object-contain shrink-0" />
            )}
            <div>
              <p className="font-semibold">{entreprise?.nom_entreprise || nomArtisan}</p>
              {entreprise?.adresse && (
                <p className="text-xs text-ink/50 mt-0.5">{entreprise.adresse}</p>
              )}
              {(entreprise?.telephone || entreprise?.email) && (
                <p className="text-xs text-ink/50">
                  {[entreprise?.telephone, entreprise?.email].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="font-mono text-[11px] text-ink/50 mt-0.5">
                DEVIS N° {devis.numero}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-ink/70">Client : {nomClient}</p>
            {telephoneClient && <p className="text-xs text-ink/50">{telephoneClient}</p>}
            {adresseClient && <p className="text-xs text-ink/50 max-w-[220px]">{adresseClient}</p>}
            <p className="font-mono text-[11px] text-ink/50 mt-0.5">
              {new Date(devis.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="divide-y divide-ink/5">
          {devis.lignes.map((ligne, i) => (
            <div key={i} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-ink/80">{ligne.description}</p>
                <span className="font-mono">{formatEuros(ligne.total)}</span>
              </div>
              <p className="text-xs text-ink/40 font-mono mt-0.5">{ligne.detail_calcul}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-ink/10 bg-paper text-sm space-y-1.5">
          <div className="flex items-center justify-between text-ink/60">
            <span>Sous-total HT</span>
            <span className="font-mono">{formatEuros(devis.sous_total_ht)}</span>
          </div>
          {devis.deplacement > 0 && (
            <div className="flex items-center justify-between text-ink/60">
              <span>Déplacement</span>
              <span className="font-mono">{formatEuros(devis.deplacement)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-ink/60">
            <span>Marge ({devis.marge_pct}%)</span>
            <span className="font-mono">{formatEuros(montantMarge)}</span>
          </div>
          <div className="flex items-center justify-between text-ink/60">
            <span>TVA ({devis.tva_pct}%)</span>
            <span className="font-mono">{formatEuros(devis.montant_tva)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold pt-2 border-t border-ink/10">
            <span>Total TTC</span>
            <span className="font-mono text-lg">{formatEuros(devis.total_estime)}</span>
          </div>
        </div>

        {devis.commentaires && (
          <div className="px-5 py-3 border-t border-ink/10 text-sm text-ink/70">
            {devis.commentaires}
          </div>
        )}

        {entreprise?.conditions_generales && (
          <p className="px-5 py-3 border-t border-ink/10 text-[11px] text-ink/40 leading-relaxed whitespace-pre-line">
            {entreprise.conditions_generales}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        className="mt-4"
        onClick={() => window.print()}
      >
        Exporter en PDF
      </Button>
    </div>
  );
}
