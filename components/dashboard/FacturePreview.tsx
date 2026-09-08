import { Button } from "@/components/ui/Button";
import type { Facture } from "@/types";

function formatEuros(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

const LIBELLE_TYPE: Record<Facture["type"], string> = {
  facture: "FACTURE",
  acompte: "FACTURE D'ACOMPTE",
  avoir: "AVOIR",
};

// ============================================================
// Module 28 (06/09) — même logique que DevisPreview.tsx (export PDF via
// window.print(), pas de librairie PDF) mais avec les mentions légales
// obligatoires d'une facture, absentes du devis puisqu'un devis n'est pas
// un document fiscal :
// - identité complète de l'émetteur (SIRET, forme juridique, TVA intra ou
//   mention d'exonération)
// - assurance décennale (obligatoire dans le bâtiment, loi Spinetta)
// - numéro et date, non modifiables (voir mentions_legales, figé à
//   l'émission)
// - conditions de paiement, coordonnées bancaires
// - pénalités de retard + indemnité forfaitaire de recouvrement
//   (obligatoires depuis la loi LME — formulées sans taux chiffré : le taux
//   d'intérêt légal change deux fois par an, un chiffre figé en dur
//   deviendrait rapidement faux ; la formule légale par défaut reste exacte
//   quelle que soit la date).
//
// ⚠️ Ce document est un support de facturation, pas une transmission
// électronique conforme à la réforme 2026 (PDP/PPF) — voir le rapport
// livré à Axel pour ce qui reste à faire côté partenariat externe.
// ============================================================
export function FacturePreview({
  facture,
  nomClient,
  telephoneClient,
  adresseClient,
  logoUrl,
}: {
  facture: Facture;
  nomClient: string;
  telephoneClient?: string | null;
  adresseClient?: string | null;
  logoUrl?: string | null;
}) {
  const m = facture.mentions_legales;
  const estAvoir = facture.type === "avoir";

  return (
    <div>
      <div id="facture-imprimable" className="doc-imprimable rounded-2xl border border-ink/10 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink/10">
          <div className="flex items-start gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-12 h-12 object-contain shrink-0" />
            )}
            <div>
              <p className="font-semibold">{m.nom_entreprise || "—"}</p>
              {m.adresse && <p className="text-xs text-ink/50 mt-0.5">{m.adresse}</p>}
              {(m.telephone || m.email) && (
                <p className="text-xs text-ink/50">{[m.telephone, m.email].filter(Boolean).join(" · ")}</p>
              )}
              <p className="text-[11px] text-ink/50 mt-1">
                {[m.forme_juridique, m.siret ? `SIRET ${m.siret}` : null].filter(Boolean).join(" · ")}
              </p>
              {m.numero_tva_intracommunautaire && !m.mention_tva_non_applicable && (
                <p className="text-[11px] text-ink/50">TVA intracommunautaire : {m.numero_tva_intracommunautaire}</p>
              )}
              {(m.assurance_decennale_compagnie || m.assurance_decennale_police) && (
                <p className="text-[11px] text-ink/50 mt-0.5">
                  Assurance décennale : {[m.assurance_decennale_compagnie, m.assurance_decennale_police].filter(Boolean).join(" — police n° ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-xs font-semibold text-signal">{LIBELLE_TYPE[facture.type]}</p>
            <p className="font-mono text-[11px] text-ink/50 mt-0.5">N° {facture.numero}</p>
            <p className="text-sm text-ink/70 mt-2">Client : {nomClient}</p>
            {telephoneClient && <p className="text-xs text-ink/50">{telephoneClient}</p>}
            {adresseClient && <p className="text-xs text-ink/50 max-w-[220px]">{adresseClient}</p>}
            <p className="font-mono text-[11px] text-ink/50 mt-1">
              Émise le {new Date(facture.date_emission).toLocaleDateString("fr-FR")}
            </p>
            {facture.date_echeance && (
              <p className="font-mono text-[11px] text-ink/50">
                Échéance le {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        </div>

        {estAvoir && (
          <p className="px-5 py-2 bg-signal/10 text-signal text-xs font-medium">
            Cet avoir annule la facture n° {facture.facture_liee_id ? "correspondante" : ""} — les montants ci-dessous
            viennent en déduction.
          </p>
        )}

        <div className="divide-y divide-ink/5">
          {facture.lignes.map((ligne, i) => (
            <div key={i} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-ink/80">{ligne.description}</p>
                <span className="font-mono">{formatEuros(ligne.total)}</span>
              </div>
              {ligne.detail_calcul && <p className="text-xs text-ink/40 font-mono mt-0.5">{ligne.detail_calcul}</p>}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-ink/10 bg-paper text-sm space-y-1.5">
          <div className="flex items-center justify-between text-ink/60">
            <span>Total HT</span>
            <span className="font-mono">{formatEuros(facture.sous_total_ht)}</span>
          </div>
          {m.mention_tva_non_applicable ? (
            <div className="flex items-center justify-between text-ink/60">
              <span>TVA</span>
              <span className="font-mono text-xs">Non applicable, art. 293 B du CGI</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-ink/60">
              <span>TVA ({facture.tva_pct}%)</span>
              <span className="font-mono">{formatEuros(facture.montant_tva)}</span>
            </div>
          )}
          <div className="flex items-center justify-between font-semibold pt-2 border-t border-ink/10">
            <span>Total TTC</span>
            <span className="font-mono text-lg">
              {formatEuros(m.mention_tva_non_applicable ? facture.sous_total_ht : facture.total_ttc)}
            </span>
          </div>
        </div>

        {!estAvoir && (m.iban || m.bic) && (
          <div className="px-5 py-3 border-t border-ink/10 text-xs text-ink/60">
            <p className="font-medium text-ink/70 mb-0.5">Coordonnées de paiement</p>
            {m.iban && <p className="font-mono">IBAN : {m.iban}</p>}
            {m.bic && <p className="font-mono">BIC : {m.bic}</p>}
          </div>
        )}

        {m.mention_tva_reduite && (
          <p className="px-5 py-3 border-t border-ink/10 text-[11px] text-ink/50 leading-relaxed">
            {m.mention_tva_reduite}
          </p>
        )}

        {!estAvoir && (
          <p className="px-5 py-3 border-t border-ink/10 text-[10.5px] text-ink/40 leading-relaxed">
            En cas de retard de paiement, une pénalité au taux d&apos;intérêt légal en vigueur majoré de 10 points est
            exigible de plein droit, ainsi qu&apos;une indemnité forfaitaire pour frais de recouvrement de 40 €
            (articles L441-10 et D441-5 du Code de commerce). Pas d&apos;escompte pour paiement anticipé.
          </p>
        )}
      </div>

      <Button variant="ghost" className="mt-4" onClick={() => window.print()}>
        Exporter en PDF
      </Button>
    </div>
  );
}
