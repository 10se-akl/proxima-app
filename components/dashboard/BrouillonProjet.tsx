"use client";

import { useState } from "react";
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

// 27/09 — Un mot, et seulement quand il y a quelque chose à faire. Avant :
// une pastille de couleur sur chaque champ (vert, jaune, rouge), à
// déchiffrer champ par champ. Ce qui a été lu tel quel dans le message ne
// porte plus rien.
const MENTION_CONFIANCE: Record<NiveauConfiance, { texte: string; classe: string } | null> = {
  explicite: null,
  deduit: { texte: "à vérifier", classe: "text-steel" },
  absent: { texte: "à compléter", classe: "text-signal-fonce dark:text-signal-clair" },
};

function BadgeConfiance({ niveau }: { niveau: NiveauConfiance }) {
  const mention = MENTION_CONFIANCE[niveau];
  if (!mention) return null;
  return <span className={`ml-1.5 font-normal ${mention.classe}`}>· {mention.texte}</span>;
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
      <p className="text-[15px] text-ink/70">Relisez, puis créez le projet.</p>

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
            Urgence
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
          className="inline-flex min-h-11 items-center text-[14px] text-ink/65 underline underline-offset-4 hover:text-ink"
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

      {/* Sur téléphone, le bouton reste sous le pouce pendant qu'on relit,
          juste au-dessus de la barre du bas. */}
      <div className="sticky bottom-[calc(var(--barre-bas,0px)+env(safe-area-inset-bottom)+1.75rem)] z-10 sm:static">
        <button
          type="button"
          onClick={() => onValider(valeurs)}
          disabled={validationEnCours}
          className="w-full min-h-14 rounded-2xl bg-ink text-[16px] font-semibold text-paper shadow-[0_10px_30px_-12px_rgb(var(--c-ink)/0.6)] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 sm:shadow-none"
        >
          {validationEnCours ? "Création en cours…" : "Créer le projet"}
        </button>
      </div>
    </div>
  );
}
