"use client";

import { DevisPreview } from "@/components/dashboard/DevisPreview";
import { genererMentionTvaReduite } from "@/lib/moteur-metier/calculerDevis";
import type { Devis, ParametresEntreprise } from "@/types";

// ============================================================
// Audit pré-bêta (09/09), point 🟠 n°15 — sans exemple, l'effet "wow" du
// premier lancement dépend ENTIÈREMENT de ce que le bêta testeur tape
// lui-même, dans un compte qui démarre vide. Ce modal montre un vrai
// devis Compyo, chiffré et mis en forme exactement comme un vrai (même
// composant DevisPreview.tsx que le produit réel), sans qu'aucune donnée
// ne soit écrite en base — jamais mélangé aux vrais projets/clients de
// l'artisan (contrairement à un projet de démo injecté dans son compte,
// qui risquerait de le faire douter "c'est un vrai client ?"). Accessible
// depuis l'onboarding (voir PremierLancement.tsx), fermable à tout moment.
// ============================================================

const DEVIS_EXEMPLE: Devis = {
  id: "exemple",
  demande_id: "exemple",
  artisan_id: "exemple",
  organisation_id: "exemple",
  numero: "2026-001",
  lignes: [
    {
      description: "Dépose de l'ancienne baignoire et évacuation",
      categorie: "main_oeuvre",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: 180,
      total: 180,
      detail_calcul: "1 forfait × 180 €",
    },
    {
      description: "Fourniture et pose d'une douche à l'italienne",
      categorie: "fourniture",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: 1450,
      total: 1450,
      detail_calcul: "1 forfait × 1 450 €",
    },
    {
      description: "Carrelage mural",
      categorie: "fourniture",
      quantite: 12,
      unite: "m²",
      prix_unitaire: 45,
      total: 540,
      detail_calcul: "12 m² × 45 €/m²",
    },
    {
      description: "Pose du carrelage et de la faïence",
      categorie: "main_oeuvre",
      quantite: 14,
      unite: "heure",
      prix_unitaire: 45,
      total: 630,
      detail_calcul: "14 h × 45 €/h",
    },
  ],
  sous_total_ht: 2800,
  deplacement: 0,
  marge_pct: 15,
  tva_pct: 10,
  montant_tva: 322,
  total_estime: 3542,
  envoye_le: null,
  commentaires: "Devis valable 30 jours. Début de chantier possible sous 2 semaines.",
  statut: "brouillon",
  created_at: new Date().toISOString(),
  suggestions_oublis: null,
  mention_tva_reduite: genererMentionTvaReduite(10),
  signature_nom: null,
  signature_data: null,
  signature_ip: null,
  signature_user_agent: null,
  signe_le: null,
  parametres_configures: true,
  notifie_relance_j5_le: null,
  notifie_relance_j10_le: null,
};

const ENTREPRISE_EXEMPLE: ParametresEntreprise = {
  id: "exemple",
  artisan_id: "exemple",
  organisation_id: "exemple",
  nom_entreprise: "Dupont Rénovation",
  adresse: "12 rue des Artisans, 69000 Lyon",
  telephone: "06 12 34 56 78",
  email: "contact@dupont-renovation.fr",
  tva_pct: 20,
  cout_horaire: 45,
  cout_journalier: null,
  forfait_deplacement: 0,
  marge_defaut_pct: 15,
  heures_min_facturables: 1,
  logo_url: null,
  conditions_generales: null,
  siret: "123 456 789 00012",
  forme_juridique: "EURL",
  numero_tva_intracommunautaire: null,
  mention_tva_non_applicable: false,
  assurance_decennale_compagnie: null,
  assurance_decennale_police: null,
  iban: null,
  bic: null,
};

export function ExempleDevisModal({ onFermer }: { onFermer: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm p-0 sm:p-6"
      onClick={onFermer}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-ink/10 bg-surface shadow-xl shadow-ink/20 p-5 sm:p-6 [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-signal uppercase tracking-wider">
            Exemple — à quoi ressemblera votre devis
          </p>
          <button
            onClick={onFermer}
            aria-label="Fermer"
            className="w-8 h-8 grid place-items-center rounded-lg text-ink/40 hover:text-ink hover:bg-paper transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          Généré par l&apos;IA à partir d&apos;un message client comme celui-ci, en quelques
          secondes. Aucune donnée réelle — c&apos;est un exemple.
        </p>

        <div className="mt-4">
          <DevisPreview
            devis={DEVIS_EXEMPLE}
            nomClient="M. Bernard"
            telephoneClient="06 98 76 54 32"
            adresseClient="8 allée des Tilleuls, 69003 Lyon"
            nomArtisan="Dupont Rénovation"
            entreprise={ENTREPRISE_EXEMPLE}
          />
        </div>
      </div>
    </div>
  );
}
