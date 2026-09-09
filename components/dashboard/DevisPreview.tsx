import { Button } from "@/components/ui/Button";
import type { Devis, ParametresEntreprise } from "@/types";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Sous-totaux par catégorie (08/09) — repéré en étude de marché : une
// vraie faiblesse citée sur un concurrent (Tolteck) est l'absence de
// distinction main d'œuvre / fournitures sur le devis. N'affiche que les
// catégories réellement présentes, et seulement s'il y en a plus d'une —
// un devis 100% main d'œuvre n'a rien à gagner à répéter un total déjà
// visible juste en dessous.
const LABEL_CATEGORIE: Record<string, string> = {
  main_oeuvre: "Main d'œuvre",
  fourniture: "Fournitures",
  forfait: "Forfait",
};

function sousTotauxParCategorie(lignes: { categorie: string; total: number }[]) {
  const parCategorie = new Map<string, number>();
  for (const l of lignes) {
    parCategorie.set(l.categorie, (parCategorie.get(l.categorie) ?? 0) + l.total);
  }
  return Array.from(parCategorie.entries());
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
              {/* Audit pré-bêta (09/09), point 🟠 — SIRET absent du devis
                  (présent uniquement sur la facture, voir FacturePreview.tsx)
                  donnait l'impression d'un document "pas tout à fait
                  officiel" pour un premier envoi à un client. Pas une
                  obligation légale sur un devis (contrairement à une
                  facture), mais un vrai gain de crédibilité — mêmes champs,
                  même formulation que la facture. */}
              {(entreprise?.forme_juridique || entreprise?.siret) && (
                <p className="text-[11px] text-ink/50 mt-1">
                  {[entreprise?.forme_juridique, entreprise?.siret ? `SIRET ${entreprise.siret}` : null]
                    .filter(Boolean)
                    .join(" · ")}
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

        {sousTotauxParCategorie(devis.lignes).length > 1 && (
          <div className="px-5 py-3 border-t border-ink/10 text-xs text-ink/50 space-y-1">
            {sousTotauxParCategorie(devis.lignes).map(([categorie, total]) => (
              <div key={categorie} className="flex items-center justify-between">
                <span>{LABEL_CATEGORIE[categorie] ?? categorie}</span>
                <span className="font-mono">{formatEuros(total)}</span>
              </div>
            ))}
          </div>
        )}

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

        {devis.mention_tva_reduite && (
          <p className="px-5 py-3 border-t border-ink/10 text-[11px] text-ink/50 leading-relaxed">
            {devis.mention_tva_reduite}
          </p>
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
