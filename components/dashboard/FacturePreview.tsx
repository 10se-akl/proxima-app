import { Button } from "@/components/ui/Button";
import { identiteJuridique, mentionsAssurances, nomEntreprise } from "@/lib/devis/mentionsLegales";
import { formatQuantite } from "@/lib/devis/modeleDocument";
import { euros } from "@/components/ui/recettes";
import type { Facture } from "@/types";

// Design v3 (25/10) : un montant de document, avec centimes, par euros()
// des recettes (espace insécable lisible entre les milliers, jamais coupé).
function formatEuros(n: number) {
  return euros(n, true);
}

// Design v3 (24/10) : en minuscules, comme le titre « Devis » du devis —
// plus de capitales qui crient.
const LIBELLE_TYPE: Record<Facture["type"], string> = {
  facture: "Facture",
  acompte: "Facture d'acompte",
  avoir: "Avoir",
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
//
// Design v3 (24/10) : la facture devient un document papier, comme le
// devis (.document-papier : blanc et encre, même en mode sombre) — encre
// seule, secondaire en `steel` (plus de gris par transparence ni de
// chasse fixe), total TTC en gros sous un trait d'encre, mentions en
// 12-13 px lisibles. Ordre des informations et textes légaux inchangés.
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
      <article
        id="facture-imprimable"
        className="document-papier doc-imprimable rounded-[14px] bg-surface px-5 py-6 text-[15px] leading-relaxed text-ink ring-1 ring-inset ring-gris-clair sm:rounded-[6px] sm:px-8 sm:py-8 sm:text-[14px]"
      >
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-12 shrink-0 object-contain" />
            )}
            <div className="min-w-0">
              <p className="break-words font-display text-[17px] font-bold leading-snug text-ink">
                {nomEntreprise(m, "—")}
              </p>
              {m.adresse && <p className="mt-0.5 text-steel">{m.adresse}</p>}
              {(m.telephone || m.email) && (
                <p className="break-words text-steel">{[m.telephone, m.email].filter(Boolean).join(" · ")}</p>
              )}
              {/* 17/09 — mêmes mentions, même formulation que le devis
                  (lib/devis/mentionsLegales.ts) : RCS, capital, RM, RC Pro
                  et zone de couverture de la décennale manquaient. */}
              <p className="mt-1.5 text-[13px] leading-relaxed text-steel print:text-[12px]">{identiteJuridique(m).join(" · ")}</p>
              {mentionsAssurances(m).map((ligne) => (
                <p key={ligne} className="mt-0.5 text-[13px] leading-relaxed text-steel print:text-[12px]">
                  {ligne}
                </p>
              ))}
            </div>
          </div>
          <div className="shrink-0 sm:max-w-[240px] sm:text-right">
            <p className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {LIBELLE_TYPE[facture.type]}
            </p>
            <p className="mt-1 text-steel">
              N° <span className="font-semibold tabular-nums text-ink">{facture.numero}</span>
            </p>
            <p className="mt-3 text-ink">
              <span className="text-steel">Client{"\u00a0"}: </span>
              <span className="font-semibold">{nomClient}</span>
            </p>
            {telephoneClient && <p className="tabular-nums text-ink">{telephoneClient}</p>}
            {adresseClient && <p className="text-ink">{adresseClient}</p>}
            <p className="mt-3 tabular-nums text-steel">
              Émise le {new Date(facture.date_emission).toLocaleDateString("fr-FR")}
            </p>
            {facture.date_echeance && (
              <p className="tabular-nums text-steel">
                Échéance le {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        </header>

        {estAvoir && (
          <p className="mt-6 rounded-[8px] border border-steel px-4 py-2.5 text-[14px] font-medium text-ink">
            Cet avoir annule la facture n° {facture.facture_liee_id ? "correspondante" : ""} — les montants ci-dessous
            viennent en déduction.
          </p>
        )}

        <div className="mt-6 divide-y divide-gris-clair border-y border-gris-clair">
          {facture.lignes.map((ligne, i) => (
            <div key={i} className="break-inside-avoid py-3.5">
              {/* Audit "vérification systématique" (10/09) — même correctif
                  que DevisPreview.tsx : min-w-0/shrink-0 pour enrouler le
                  texte au lieu d'un débordement invisible. */}
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 break-words text-ink">{ligne.description}</p>
                <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-ink">
                  {formatEuros(ligne.total)}
                </span>
              </div>
              {/* Quantité et prix unitaire HT : obligatoires sur une facture. */}
              <p className="mt-1 text-[13px] tabular-nums text-steel">
                {formatQuantite(ligne.quantite).replace(/\u202f/g, "\u00a0")}{"\u00a0"}{ligne.unite} × {formatEuros(ligne.prix_unitaire)}{"\u00a0"}HT
              </p>
              {/* Note de calcul interne (anciennes factures) : visible par
                  l'artisan, jamais imprimée pour le client. */}
              {ligne.detail_calcul && (
                <p className="masquer-impression mt-0.5 text-[13px] text-steel">{ligne.detail_calcul}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end break-inside-avoid">
          <div className="w-full sm:w-80">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-steel">Total HT</span>
                <span className="whitespace-nowrap tabular-nums text-ink">{formatEuros(facture.sous_total_ht)}</span>
              </div>
              {/* 21/09 — Ce qui s'affiche = ce qui est enregistré. Avant,
                  la mention de franchise masquait la TVA même quand la facture
                  en contenait une (devis resté à 20 %) : écran à 1 000 €, base
                  à 1 200 €. Seule une facture réellement à 0 % dit « non
                  applicable » ; les nouvelles le sont toujours en franchise. */}
              {m.mention_tva_non_applicable && facture.tva_pct === 0 ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-steel">TVA</span>
                  <span className="text-right text-[13px] text-steel">Non applicable, art. 293 B du CGI</span>
                </div>
              ) : (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-steel">TVA ({facture.tva_pct}{"\u00a0"}%)</span>
                  <span className="whitespace-nowrap tabular-nums text-ink">{formatEuros(facture.montant_tva)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
              <span className="font-semibold text-ink">Total TTC</span>
              <span className="whitespace-nowrap font-display text-[24px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
                {formatEuros(facture.total_ttc)}
              </span>
            </div>
          </div>
        </div>

        {!estAvoir && (m.iban || m.bic) && (
          <div className="mt-6 break-inside-avoid break-words text-[13px] text-steel">
            <p className="font-semibold text-ink">Coordonnées de paiement</p>
            {m.iban && <p className="tabular-nums">IBAN{"\u00a0"}: {m.iban}</p>}
            {m.bic && <p>BIC{"\u00a0"}: {m.bic}</p>}
          </div>
        )}

        {(m.mention_tva_reduite || !estAvoir) && (
          <footer className="mt-8 space-y-2 border-t border-gris-clair pt-4 text-[13px] leading-relaxed text-steel [text-wrap:pretty] print:text-[12px]">
            {m.mention_tva_reduite && <p>{m.mention_tva_reduite}</p>}
            {!estAvoir && (
              <p>
                En cas de retard de paiement, des pénalités au taux de refinancement de la Banque centrale européenne
                majoré de 10 points sont exigibles de plein droit (article L441-10 du Code de commerce) ; pour un client
                professionnel, s&apos;y ajoute une indemnité forfaitaire pour frais de recouvrement de 40&nbsp;€ (article
                D441-5). Pas d&apos;escompte pour paiement anticipé.
              </p>
            )}
          </footer>
        )}
      </article>

      <Button variant="secondary" className="mt-4" onClick={() => window.print()}>
        Exporter en PDF
      </Button>
    </div>
  );
}
