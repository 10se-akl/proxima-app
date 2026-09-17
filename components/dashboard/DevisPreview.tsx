import { Button } from "@/components/ui/Button";
import { DocumentDevis } from "@/components/devis/DocumentDevis";
import { margeDuDevis } from "@/lib/moteur-metier/calculerDevis";
import { mentionsEffectives } from "@/lib/devis/mentionsLegales";
import { construireModeleDevis, formatMontant, sourceDepuisDevis } from "@/lib/devis/modeleDocument";
import type { Devis, ParametresEntreprise } from "@/types";

// Le devis tel que le client le recevra (17/09) : exactement le même
// document que sur sa page de signature (components/devis/DocumentDevis),
// construit à partir du même modèle. Ce qui ne concerne que l'artisan — sa
// marge — reste EN DEHORS du document, sous l'aperçu : il ne peut donc
// plus partir à l'impression par erreur (constaté le 13/09).
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
  const modele = construireModeleDevis({
    source: sourceDepuisDevis(devis),
    mentions: mentionsEffectives(devis, entreprise),
    client: { nom: nomClient, adresse: adresseClient ?? null, telephone: telephoneClient ?? null },
    logoUrl: logoUrl ?? null,
    nomDeRepli: nomArtisan || "Votre entreprise",
    signature: devis.signe_le
      ? { nom: devis.signature_nom, le: devis.signe_le, image: devis.signature_data }
      : null,
  });
  const marge = margeDuDevis(devis);

  return (
    <div>
      <DocumentDevis modele={modele} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Button variant="ghost" onClick={() => window.print()}>
          Exporter en PDF
        </Button>
        {marge !== 0 && (
          <p className="text-xs text-ink/45">
            Votre marge : <span className="font-medium text-ink/70">{formatMontant(marge)}</span> ({devis.marge_pct} %) —
            incluse dans les prix, jamais affichée au client.
          </p>
        )}
      </div>
    </div>
  );
}
