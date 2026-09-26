"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { completerParametres, type FormulaireParametres } from "@/lib/parametres";
import type { ParametresEntreprise } from "@/types";

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
      { cle: "mediateur_url", label: "Site du médiateur", type: "url", placeholder: "www.exemple-mediation.fr", facultatif: true },
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

export function CompletionMention({ pointId, contexte }: { pointId: string; contexte: ContexteCompletion }) {
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
      <p className="text-[13px] leading-snug text-ink/65">{definition.raison}</p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {definition.champs.map((c) => (
          <div key={c.cle}>
            <label htmlFor={`${idBase}-${c.cle}`} className="block text-[12.5px] font-medium text-ink/70">
              {c.label}
              {facultatif(c) && <span className="font-normal text-ink/45"> (facultatif)</span>}
            </label>
            <input
              id={`${idBase}-${c.cle}`}
              type={c.type ?? "text"}
              inputMode={c.type === "tel" ? "tel" : undefined}
              value={valeurs[c.cle] ?? ""}
              onChange={(ev) => setValeurs((v) => ({ ...v, [c.cle]: ev.target.value }))}
              placeholder={c.placeholder}
              className="mt-1 w-full min-h-12 rounded-xl border border-ink/15 bg-paper px-3 text-[16px] text-ink placeholder:text-ink/35 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </div>
        ))}
      </div>
      {erreur && <p className="mt-2 text-[13px] text-signal">{erreur}</p>}
      <button
        type="submit"
        disabled={!complet || enCours}
        className="mt-3 min-h-12 w-full rounded-xl bg-ink px-5 text-[15px] font-semibold text-paper transition disabled:opacity-40 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
      >
        {enCours ? "…" : "Enregistrer"}
      </button>
    </form>
  );
}
