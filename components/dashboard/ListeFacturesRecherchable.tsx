"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { IconeDocument } from "@/components/ui/Icones";
import { CLASSE_CHAMP_NUIT, EnTetePage, classePuceNuit } from "@/components/ui/EnTetePage";
import { Pastille } from "@/components/ui/Pastille";
import { IconeEuro } from "@/components/projet/icones";
import type { Facture } from "@/types";

type FactureAvecClient = Pick<
  Facture,
  "id" | "demande_id" | "type" | "numero" | "statut" | "total_ttc" | "date_emission"
> & {
  notifie_relance_le?: string | null;
  demandes?: { nom_client?: string } | null;
};

const LIBELLE_TYPE: Record<Facture["type"], string> = {
  facture: "Facture",
  acompte: "Acompte",
  avoir: "Avoir",
};

const LABEL_STATUT_FILTRE = [
  { cle: "tous", label: "Toutes" },
  { cle: "emise", label: "Émises" },
  { cle: "payee", label: "Payées" },
  { cle: "annulee", label: "Annulées" },
] as const;

function statutAffiche(f: FactureAvecClient): { texte: string; classe: string } {
  if (f.statut === "payee") return { texte: "Payée", classe: "bg-succes/15 text-succes" };
  if (f.statut === "annulee") return { texte: "Annulée", classe: "bg-ink/10 text-ink/40" };
  // Module 40 (11/09) — une relance a déjà été PROPOSÉE à l'artisan pour
  // cette facture (voir app/api/cron/relance-factures). Même nuance neutre
  // que "Émise", seul le texte change : pas de rouge, pas de compteur de
  // retard — ce badge informe, il ne met pas la pression.
  if (f.notifie_relance_le) return { texte: "Relancée", classe: "bg-steel/15 text-steel" };
  return { texte: "Émise", classe: "bg-steel/15 text-steel" };
}

// ============================================================
// Module 28 (06/09) — même structure que ListeDevisRecherchable.tsx :
// recherche + filtre par statut, clic vers le projet correspondant (une
// facture n'a pas d'écran dédié, elle vit dans la fiche projet qui l'a
// générée — voir FacturesProjet.tsx).
// ============================================================
type CleFiltre = (typeof LABEL_STATUT_FILTRE)[number]["cle"];

/** Refonte (03/10 — duel B, lot 2) : le total de la page Argent ouvre la
 *  liste déjà filtrée (?statut=emise). Une valeur inconnue retombe sur
 *  « Toutes ». */
export function filtreFacturesDepuis(statut: string | null | undefined): CleFiltre {
  return LABEL_STATUT_FILTRE.find((f) => f.cle === statut)?.cle ?? "tous";
}

export function ListeFacturesRecherchable({
  factures,
  filtreInitial,
  actions,
}: {
  factures: FactureAvecClient[];
  /** Les boutons de l'en-tête (l'export comptable). */
  actions?: ReactNode;
  /** La valeur de ?statut= dans l'adresse. */
  filtreInitial?: string | null;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<CleFiltre>(() => filtreFacturesDepuis(filtreInitial));

  const filtres = factures
    .filter((f) => filtre === "tous" || f.statut === filtre)
    .filter((f) => `${f.demandes?.nom_client ?? ""} ${f.numero}`.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div>
      <EnTetePage
        titre="Factures"
        sousTitre={factures.length === 0 ? "Aucune facture" : factures.length === 1 ? "1 facture" : `${factures.length} factures`}
        icone={
          <Pastille couleur="violet" taille="grande">
            <IconeEuro className="h-6 w-6" />
          </Pastille>
        }
        actions={actions}
      >
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Client, numéro de facture…"
          aria-label="Rechercher une facture"
          className={CLASSE_CHAMP_NUIT}
        />

        {/* 27/09 — Des pastilles au pouce (44 px) sur une seule rangée qui
            défile, plutôt que de petites étiquettes de 24 px sur deux lignes. */}
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {LABEL_STATUT_FILTRE.map((f) => (
            <button
              key={f.cle}
              type="button"
              onClick={() => setFiltre(f.cle)}
              aria-pressed={filtre === f.cle}
              className={`shrink-0 ${classePuceNuit(filtre === f.cle)}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </EnTetePage>

      {/* Refonte visuelle (04/10) : la liste dans une carte, chaque ligne
          un cran plus sombre, comme « Mes projets » sur l'accueil. */}
      <div className="mt-4 flex flex-col gap-2 rounded-3xl bg-surface p-2 ring-1 ring-ink/10 sm:p-3">
        {filtres.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-signal/10">
              <IconeDocument taille={20} className="text-signal" />
            </span>
            <p className="text-sm text-ink/50">
              {factures.length === 0
                ? "Aucune facture pour le moment. Créez-en une depuis un projet dont le devis a été accepté."
                : "Aucune facture pour ce filtre."}
            </p>
          </div>
        ) : (
          filtres.map((f) => {
            const { texte, classe } = statutAffiche(f);
            return (
              <Link
                key={f.id}
                href={`/dashboard/demandes/${f.demande_id}#facturation`}
                className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-paper/70 px-4 py-3 ring-1 ring-ink/10 transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Avatar nom={f.demandes?.nom_client ?? "?"} taille={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[16px] font-semibold text-ink">{f.demandes?.nom_client ?? "Client"}</span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                      {f.total_ttc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px] text-ink/65">{`${LIBELLE_TYPE[f.type]} ${f.numero} · ${new Date(f.date_emission).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classe}`}>{texte}</span>
                  </span>
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
