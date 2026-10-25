"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { completerParametres, type FormulaireParametres } from "@/lib/parametres";
import type { ParametresEntreprise } from "@/types";
import { BOUTON_CREUX, BOUTON_PLEIN_LARGE, CHAMP, ERREUR, LIBELLE } from "@/components/ui/recettes";

// ============================================================
// Compléter une mention sur place (26/09 — « moins mais mieux », lot F).
//
// Le score du devis savait ce qui manquait, mais renvoyait vers la page
// Paramètres : l'artisan quittait son devis et revenait plus tard, ou
// jamais. Maintenant, le champ est là, avec une raison d'une ligne et
// « Enregistrer ». L'enregistrement écrit dans les mêmes paramètres que
// la page, avec la même validation (lib/parametres) ; le score se
// recalcule aussitôt, et la mention ne sera plus jamais demandée.
// ============================================================

type Champ = {
  cle: keyof FormulaireParametres;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "url";
  /** Facultatif pour que la mention soit considérée comme présente. */
  facultatif?: boolean;
};

export const COMPLETIONS: Record<string, { raison: string; champs: Champ[] }> = {
  decennale: {
    raison: "Obligatoire sur un devis — votre assureur et votre numéro de police décennale.",
    champs: [
      { cle: "assurance_decennale_compagnie", label: "Assureur" },
      { cle: "assurance_decennale_police", label: "N° de police" },
    ],
  },
  decennale_zone: {
    raison: "À indiquer avec la décennale — la zone qu'elle couvre.",
    champs: [{ cle: "assurance_decennale_zone", label: "Zone couverte", placeholder: "Ex : France métropolitaine" }],
  },
  rc_pro: {
    raison: "Attendue à côté de la décennale — votre assureur RC Pro.",
    champs: [{ cle: "rc_pro_compagnie", label: "Assureur RC Pro" }],
  },
  identite: {
    raison: "Obligatoire sur un devis — le nom et le SIRET de l'entreprise.",
    champs: [
      { cle: "nom_entreprise", label: "Nom de l'entreprise" },
      { cle: "siret", label: "SIRET", placeholder: "123 456 789 00012" },
    ],
  },
  coordonnees: {
    raison: "Obligatoire — une adresse, et un numéro pour vous joindre.",
    champs: [
      { cle: "adresse", label: "Adresse" },
      { cle: "telephone", label: "Téléphone", type: "tel" },
    ],
  },
  mediateur: {
    raison: "Obligatoire pour un client particulier — votre médiateur de la consommation.",
    champs: [
      { cle: "mediateur_nom", label: "Nom du médiateur" },
      { cle: "mediateur_url", label: "Site du médiateur", type: "text", placeholder: "www.exemple-mediation.fr", facultatif: true },
    ],
  },
  forme_juridique: {
    raison: "Pour la mention « EI », obligatoire depuis 2022 — votre forme juridique.",
    champs: [{ cle: "forme_juridique", label: "Forme juridique", placeholder: "Ex : Micro-entrepreneur, SARL…" }],
  },
};

export type ContexteCompletion = {
  parametres: ParametresEntreprise | null;
  organisationId: string | null;
  artisanId: string;
  surEnregistre: (p: ParametresEntreprise) => void;
  /** Remplace l'enregistrement réel (aperçu avec des données simulées). */
  enregistrer?: (modifications: Partial<FormulaireParametres>) => Promise<{ erreur: string | null; parametres: ParametresEntreprise | null }>;
};

export function CompletionMention({
  pointId,
  contexte,
  principal = false,
}: {
  pointId: string;
  contexte: ContexteCompletion;
  /** Design v3 (24/10) : seule action d'une feuille → bouton plein, pleine
   *  largeur ; dans le score (à côté de « Valider »), il reste en creux
   *  pour garder un seul bouton plein par écran. */
  principal?: boolean;
}) {
  const definition = COMPLETIONS[pointId];
  const idBase = useId();
  // Prérempli avec ce qui est déjà connu (l'assureur sans le numéro…).
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (definition?.champs ?? []).map((c) => [c.cle, String(contexte.parametres?.[c.cle as keyof ParametresEntreprise] ?? "")])
    )
  );
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!definition) return null;
  const facultatif = (c: Champ) => c.facultatif || (c.cle === "telephone" && !!contexte.parametres?.email?.trim());
  const complet = definition.champs.every((c) => facultatif(c) || valeurs[c.cle]?.trim());

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!complet || enCours) return;
    setEnCours(true);
    setErreur(null);
    const modifications = Object.fromEntries(
      definition.champs.map((c) => [c.cle, valeurs[c.cle]?.trim() || null])
    ) as Partial<FormulaireParametres>;
    const resultat = contexte.enregistrer
      ? await contexte.enregistrer(modifications)
      : contexte.organisationId
        ? await completerParametres(createClient(), {
            organisationId: contexte.organisationId,
            artisanId: contexte.artisanId,
            actuels: contexte.parametres,
            modifications,
          })
        : { erreur: "Session expirée, reconnectez-vous.", parametres: null };
    setEnCours(false);
    if (resultat.erreur || !resultat.parametres) {
      setErreur(resultat.erreur ?? "Impossible d'enregistrer.");
      return;
    }
    contexte.surEnregistre(resultat.parametres);
  }

  return (
    <form onSubmit={enregistrer} className="mt-1">
      <p className="text-[15px] leading-snug text-steel [text-wrap:pretty]">{definition.raison}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {definition.champs.map((c) => (
          <div key={c.cle}>
            <label htmlFor={`${idBase}-${c.cle}`} className={LIBELLE}>
              {c.label}
              {facultatif(c) && <span className="font-normal text-steel"> (facultatif)</span>}
            </label>
            <input
              id={`${idBase}-${c.cle}`}
              type={c.type ?? "text"}
              inputMode={c.type === "tel" ? "tel" : undefined}
              value={valeurs[c.cle] ?? ""}
              onChange={(ev) => setValeurs((v) => ({ ...v, [c.cle]: ev.target.value }))}
              placeholder={c.placeholder}
              className={CHAMP}
            />
          </div>
        ))}
      </div>
      {erreur && <p className={ERREUR}>{erreur}</p>}
      {/* Design v3 (25/10) : dans le score, six « Enregistrer » grisés
          s'empilaient sur ordinateur. Le bouton n'apparaît qu'une fois les
          champs remplis (même condition qu'avant pour l'activer : `complet`) ;
          tant qu'il n'y a rien à enregistrer, rien ne s'affiche. Dans une
          feuille (seule action), il reste visible, désactivé. */}
      {(principal || complet || enCours) && (
        <button
          type="submit"
          disabled={!complet || enCours}
          className={`mt-4 ${principal ? BOUTON_PLEIN_LARGE : `${BOUTON_CREUX} w-full sm:w-auto`}`}
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
      )}
    </form>
  );
}
