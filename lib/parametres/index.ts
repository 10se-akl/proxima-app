import type { SupabaseClient } from "@supabase/supabase-js";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import type { ParametresEntreprise } from "@/types";

// ============================================================
// Les paramètres de l'entreprise : validation et enregistrement (26/09).
//
// Deux écrans les modifient : la page Paramètres (tout le formulaire) et
// le score du devis, qui propose de compléter sur place une mention
// obligatoire manquante (components/devis/CompletionMention.tsx). Les deux
// passent par ici : mêmes bornes, même validation, mêmes messages.
// ============================================================

export type FormulaireParametres = typeof PARAMETRES_PAR_DEFAUT;

// Audit Cycle 2 (Agent Destructeur) : aucune de ces valeurs n'était bornée,
// ni côté client ni côté serveur — une faute de frappe (TVA négative, coût
// horaire à 1e8...) contaminait silencieusement tous les devis générés
// ensuite. Bornes larges mais réalistes pour un artisan du bâtiment.
// Revue métier (06/09) — "prix_km" et "rayon_max_km" ont été retirés (et
// du formulaire) : deux champs éditables, sauvegardés, mais jamais lus par
// lib/moteur-metier/calculerDevis.ts — le déplacement a toujours été un
// forfait fixe. Voir aussi calculerLigne() : "cout_journalier", lui, a été
// câblé pour de vrai (bascule automatique en tarif jour au-delà d'une
// journée de travail) plutôt que retiré, parce que plusieurs métiers
// (maçon, couvreur, charpentier, terrassier, façadier) raisonnent
// naturellement à la journée sur un gros chantier.
export const BORNES: Partial<Record<keyof FormulaireParametres, { min: number; max: number; label: string }>> = {
  tva_pct: { min: 0, max: 100, label: "TVA" },
  cout_horaire: { min: 0, max: 1000, label: "Coût horaire" },
  cout_journalier: { min: 0, max: 5000, label: "Coût journalier" },
  marge_defaut_pct: { min: 0, max: 500, label: "Marge par défaut" },
  heures_min_facturables: { min: 0, max: 24, label: "Heures minimum facturables" },
  forfait_deplacement: { min: 0, max: 2000, label: "Forfait déplacement" },
  capital_social: { min: 0, max: 10_000_000_000, label: "Capital social" },
  devis_validite_jours: { min: 1, max: 365, label: "Validité des devis" },
  devis_acompte_pct: { min: 0, max: 100, label: "Acompte" },
};

// Liste EXPLICITE des champs numériques. Corrigé le 17/09 : on devinait
// jusqu'ici le type d'après la valeur par défaut (typeof … === "number"),
// or un champ facultatif comme le coût journalier vaut null par défaut —
// typeof null vaut "object", la saisie était donc stockée comme du texte,
// puis rejetée par validerParametres ("valeur invalide").
export const CHAMPS_NUMERIQUES = new Set<keyof FormulaireParametres>([
  "tva_pct",
  "cout_horaire",
  "cout_journalier",
  "marge_defaut_pct",
  "heures_min_facturables",
  "forfait_deplacement",
  "capital_social",
  "devis_validite_jours",
  "devis_acompte_pct",
]);

// Champs numériques qui ne peuvent pas rester vides (colonne NOT NULL).
const CHAMPS_REQUIS = new Set<keyof FormulaireParametres>(["devis_validite_jours"]);

export function validerParametres(form: FormulaireParametres): string | null {
  for (const [champ, bornes] of Object.entries(BORNES)) {
    const valeur = form[champ as keyof FormulaireParametres];
    if (valeur === null || valeur === undefined) {
      if (CHAMPS_REQUIS.has(champ as keyof FormulaireParametres)) {
        return `${bornes.label} : ce champ est nécessaire.`;
      }
      continue;
    }
    if (typeof valeur !== "number" || !Number.isFinite(valeur)) {
      return `${bornes.label} : valeur invalide.`;
    }
    if (valeur < bornes.min || valeur > bornes.max) {
      return `${bornes.label} doit être compris entre ${bornes.min} et ${bornes.max}.`;
    }
  }
  return null;
}

function messageErreur(error: { code?: string } | null): string {
  // Même piège que pour la génération de devis (13/09) : si la base n'a
  // pas reçu la dernière migration, les nouveaux champs sont refusés.
  // Le dire explicitement évite de chercher ailleurs.
  return error?.code === "PGRST204" || error?.code === "42703"
    ? "Base de données pas à jour : rejouez supabase/schema.sql dans l'éditeur SQL Supabase, puis réessayez."
    : "Impossible d'enregistrer les paramètres.";
}

type Resultat = { erreur: string | null; parametres: ParametresEntreprise | null };

/** La page Paramètres : tout le formulaire, en une fois. */
export async function enregistrerParametres(
  supabase: SupabaseClient,
  params: { organisationId: string; artisanId: string; form: FormulaireParametres }
): Promise<Resultat> {
  const erreur = validerParametres(params.form);
  if (erreur) return { erreur, parametres: null };
  const { data, error } = await supabase
    .from("parametres_entreprise")
    .upsert(
      { organisation_id: params.organisationId, artisan_id: params.artisanId, ...params.form },
      { onConflict: "organisation_id" }
    )
    .select("*")
    .single();
  if (error || !data) {
    console.error("Enregistrement des paramètres :", error);
    return { erreur: messageErreur(error), parametres: null };
  }
  return { erreur: null, parametres: data as ParametresEntreprise };
}

/** Quelques champs seulement (une mention complétée depuis le devis). Les
 *  autres réglages ne sont pas réécrits : un collègue a pu les changer
 *  entre-temps. La validation porte sur l'ensemble, comme sur la page. */
export async function completerParametres(
  supabase: SupabaseClient,
  params: {
    organisationId: string;
    artisanId: string;
    actuels: ParametresEntreprise | null;
    modifications: Partial<FormulaireParametres>;
  }
): Promise<Resultat> {
  let actuels = params.actuels;
  if (!actuels) {
    // 27/09 — « Pas de paramètres connus » peut vouloir dire « la lecture
    // a échoué » (réseau) : créer la ligne avec les valeurs par défaut
    // écraserait alors les vrais réglages de l'artisan (tarifs, TVA…).
    // On relit la base avant de décider.
    const { data: existant, error: erreurLecture } = await supabase
      .from("parametres_entreprise")
      .select("*")
      .eq("organisation_id", params.organisationId)
      .maybeSingle();
    if (erreurLecture) return { erreur: messageErreur(erreurLecture), parametres: null };
    if (!existant) {
      // Vraiment aucun paramètre encore enregistré : on crée la ligne,
      // valeurs par défaut comprises (comme la page Paramètres).
      return enregistrerParametres(supabase, {
        organisationId: params.organisationId,
        artisanId: params.artisanId,
        form: { ...PARAMETRES_PAR_DEFAUT, ...params.modifications },
      });
    }
    actuels = existant as ParametresEntreprise;
  }
  const erreur = validerParametres({ ...PARAMETRES_PAR_DEFAUT, ...actuels, ...params.modifications });
  if (erreur) return { erreur, parametres: null };
  const { data, error } = await supabase
    .from("parametres_entreprise")
    .update(params.modifications)
    .eq("organisation_id", params.organisationId)
    .select("*")
    .single();
  if (error || !data) {
    console.error("Complément des paramètres :", error);
    return { erreur: messageErreur(error), parametres: null };
  }
  return { erreur: null, parametres: data as ParametresEntreprise };
}

// ---- Ce qui manque, groupe par groupe (page Paramètres) --------------------
// Seulement ce que les devis et les factures utilisent vraiment : les
// mentions que le score du devis signale, et de quoi se faire payer.

const vide = (v: unknown) => v === null || v === undefined || (typeof v === "string" && !v.trim());

export function aCompleter(form: FormulaireParametres) {
  return {
    entreprise: [vide(form.nom_entreprise), vide(form.adresse), vide(form.telephone) && vide(form.email)].filter(Boolean)
      .length,
    mentions: [vide(form.forme_juridique), vide(form.siret), vide(form.mediateur_nom)].filter(Boolean).length,
    assurances: [
      vide(form.assurance_decennale_compagnie),
      vide(form.assurance_decennale_police),
      vide(form.assurance_decennale_zone),
      vide(form.rc_pro_compagnie),
    ].filter(Boolean).length,
    paiement: [vide(form.moyens_paiement), vide(form.iban)].filter(Boolean).length,
  };
}
