"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Input";
import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import type { BrouillonProjet as TypeBrouillonProjet, NiveauConfiance, TypeChantier } from "@/types";

// ============================================================
// "Premier contact sans friction" (26/08) — écran de revue partagé entre
// les deux portes d'entrée (partage natif Android et import de message
// iPhone/desktop). Principe non négociable : le bouton de validation
// n'est JAMAIS bloqué, même si tous les champs sont 🔴 absent — l'artisan
// peut toujours créer le projet et compléter à la main ensuite. Voir
// app/api/demandes/creer-depuis-brouillon, qui applique les mêmes
// filets de sécurité côté serveur.
// ============================================================

const BADGE_CONFIANCE: Record<NiveauConfiance, { icone: string; titre: string }> = {
  explicite: { icone: "🟢", titre: "Reconnu tel quel dans le message" },
  deduit: { icone: "🟡", titre: "Estimé par l'IA à partir du contexte" },
  absent: { icone: "🔴", titre: "Introuvable — à compléter" },
};

function BadgeConfiance({ niveau }: { niveau: NiveauConfiance }) {
  const badge = BADGE_CONFIANCE[niveau];
  return (
    <span title={badge.titre} className="ml-1.5 text-xs align-middle select-none">
      {badge.icone}
    </span>
  );
}

// Revue métier (06/09) — liste élargie à 20 valeurs, voir types/index.ts.
const TYPES_CHANTIER: TypeChantier[] = [
  "renovation_complete",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "toiture",
  "electricite",
  "plomberie",
  "chauffage",
  "maconnerie",
  "terrassement",
  "facade",
  "serrurerie",
  "vitrerie",
  "charpente",
  "menuiserie",
  "plaquisterie",
  "carrelage",
  "amenagement_exterieur",
  "climatisation",
  "piscine",
  "autre",
];

type Props = {
  brouillon: TypeBrouillonProjet;
  onValider: (brouillon: TypeBrouillonProjet) => void | Promise<void>;
  validationEnCours?: boolean;
  erreur?: string | null;
};

export function BrouillonProjetForm({ brouillon, onValider, validationEnCours, erreur }: Props) {
  const [valeurs, setValeurs] = useState(brouillon);
  const [texteOuvert, setTexteOuvert] = useState(false);

  function majChamp<K extends keyof TypeBrouillonProjet>(
    champ: K,
    valeur: TypeBrouillonProjet[K] extends { valeur: infer V } ? V : never
  ) {
    setValeurs((v) => ({
      ...v,
      [champ]: { ...(v[champ] as object), valeur },
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Brouillon préparé par l'IA</h2>
          <p className="text-sm text-ink/60 mt-0.5">
            Vérifiez et corrigez si besoin, puis créez le projet.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Field
            label={
              <>
                Client <BadgeConfiance niveau={valeurs.nomClient.confiance} />
              </>
            }
            value={valeurs.nomClient.valeur ?? ""}
            onChange={(e) => majChamp("nomClient", e.target.value || null)}
            placeholder="Nom du client"
          />
        </div>
        <div>
          <Field
            label={
              <>
                Téléphone <BadgeConfiance niveau={valeurs.telephoneClient.confiance} />
              </>
            }
            value={valeurs.telephoneClient.valeur ?? ""}
            onChange={(e) => majChamp("telephoneClient", e.target.value || null)}
            placeholder="06 12 34 56 78"
          />
        </div>
      </div>

      <Field
        label={
          <>
            Adresse <BadgeConfiance niveau={valeurs.adresseClient.confiance} />
          </>
        }
        value={valeurs.adresseClient.valeur ?? ""}
        onChange={(e) => majChamp("adresseClient", e.target.value || null)}
        placeholder="Adresse du chantier"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1.5">
            Type de chantier <BadgeConfiance niveau={valeurs.typeChantier.confiance} />
          </label>
          <select
            value={valeurs.typeChantier.valeur}
            onChange={(e) => majChamp("typeChantier", e.target.value as TypeChantier)}
            className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
          >
            {TYPES_CHANTIER.map((t) => (
              <option key={t} value={t}>
                {LABEL_TYPE_CHANTIER[t] || "Autre"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1.5">
            Urgence <BadgeConfiance niveau={valeurs.priorite.confiance} />
          </label>
          <select
            value={valeurs.priorite.valeur}
            onChange={(e) => majChamp("priorite", e.target.value === "urgent" ? "urgent" : "normal")}
            className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <TextareaField
        label={
          <>
            Résumé <BadgeConfiance niveau={valeurs.resume.confiance} />
          </>
        }
        value={valeurs.resume.valeur}
        onChange={(e) => majChamp("resume", e.target.value)}
        rows={3}
      />

      {(valeurs.rdvDate.valeur || valeurs.rdvHeure.confiance !== "absent") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field
              label={
                <>
                  Date de RDV proposée <BadgeConfiance niveau={valeurs.rdvDate.confiance} />
                </>
              }
              type="date"
              value={valeurs.rdvDate.valeur ?? ""}
              onChange={(e) => majChamp("rdvDate", e.target.value || null)}
            />
          </div>
          <div>
            <Field
              label={
                <>
                  Heure <BadgeConfiance niveau={valeurs.rdvHeure.confiance} />
                </>
              }
              type="time"
              value={valeurs.rdvHeure.valeur ?? ""}
              onChange={(e) => majChamp("rdvHeure", e.target.value || null)}
            />
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setTexteOuvert((v) => !v)}
          className="text-xs text-ink/50 hover:text-ink/70 underline underline-offset-2"
        >
          {texteOuvert ? "Masquer le message d'origine" : "Voir le message d'origine"}
        </button>
        {texteOuvert && (
          <div className="mt-2 rounded-xl bg-ink/5 p-3 text-sm text-ink/70 whitespace-pre-wrap">
            {valeurs.texteOrigine}
          </div>
        )}
      </div>

      {erreur && <p className="text-sm text-signal">{erreur}</p>}

      <Button
        onClick={() => onValider(valeurs)}
        disabled={validationEnCours}
        className="w-full"
      >
        {validationEnCours ? "Création en cours…" : "Créer le projet"}
      </Button>
    </div>
  );
}
