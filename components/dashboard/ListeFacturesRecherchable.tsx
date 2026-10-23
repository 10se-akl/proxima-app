"use client";

import { useState, type ReactNode } from "react";
import { EnTeteColonnes, LigneDocument, formatEuros } from "@/components/dashboard/LigneDocument";
import { resumerAEncaisser } from "@/lib/argent";
import { aujourdhuiParis } from "@/lib/moisParis";
import { IconeDocument } from "@/components/ui/Icones";
import { CLASSE_CHAMP_NUIT, EnTetePage, classePuceNuit } from "@/components/ui/EnTetePage";
import { Pastille } from "@/components/ui/Pastille";
import { IconeEuro } from "@/components/projet/icones";
import type { Facture } from "@/types";

type FactureAvecClient = Pick<
  Facture,
  "id" | "demande_id" | "type" | "numero" | "statut" | "total_ttc" | "date_emission"
> & {
  date_echeance?: string | null;
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
  { cle: "emise", label: "À encaisser" },
  { cle: "payee", label: "Payées" },
  { cle: "annulee", label: "Annulées" },
] as const;

/** « 2026-10-22 », la date du jour à Paris (les échéances n'ont pas d'heure). */
function jourParis(): string {
  const j = aujourdhuiParis(new Date());
  return `${j.annee}-${String(j.mois + 1).padStart(2, "0")}-${String(j.jour).padStart(2, "0")}`;
}

function statutAffiche(f: FactureAvecClient, aujourdHui: string): { texte: string; classe: string } {
  // Un avoir est créé « émis » (creer_avoir_et_annuler, schema.sql) : il ne
  // s'encaisse pas, il annule. Il le dit, avant tout le reste.
  if (f.type === "avoir") return { texte: "Avoir", classe: "bg-ink/10 text-ink/60" };
  if (f.statut === "payee") return { texte: "Payée", classe: "bg-succes/15 text-succes" };
  if (f.statut === "annulee") return { texte: "Annulée", classe: "bg-ink/10 text-ink/40" };
  // Module 40 (11/09) — une relance a déjà été PROPOSÉE à l'artisan pour
  // cette facture (voir app/api/cron/relance-factures). Même nuance neutre
  // que "Émise", seul le texte change : pas de rouge, pas de compteur de
  // retard — ce badge informe, il ne met pas la pression.
  const enRetard = !!f.date_echeance && f.date_echeance < aujourdHui;
  if (enRetard) return { texte: f.notifie_relance_le ? "En retard · relancée" : "En retard", classe: "bg-alerte-orange/15 text-alerte-orange" };
  if (f.notifie_relance_le) return { texte: "Relancée", classe: "bg-steel/15 text-steel" };
  // 22/10 (panel) — « Émise » ne disait pas si c'était payé, envoyé ou en
  // retard. L'échéance passée se voit (même règle que l'accueil,
  // resumerAEncaisser) ; sinon, ce qu'on attend : l'argent.
  return { texte: "À encaisser", classe: "bg-steel/15 text-steel" };
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
    // « À encaisser » : les factures émises, sans les avoirs (le même
    // périmètre que le total du sous-titre, resumerAEncaisser).
    .filter((f) => filtre === "tous" || (f.statut === filtre && !(filtre === "emise" && f.type === "avoir")))
    .filter((f) => `${f.demandes?.nom_client ?? ""} ${f.numero}`.toLowerCase().includes(recherche.toLowerCase()));

  const aujourdHui = jourParis();
  // 22/10 (panel) — le reste à encaisser, le même calcul que l'accueil et
  // le Bilan (lib/argent.ts : factures émises, hors avoirs, en TTC).
  const aEncaisser = resumerAEncaisser(factures.map((f) => ({ ...f, date_echeance: f.date_echeance ?? null })));
  const nombre = factures.length === 0 ? "Aucune facture" : factures.length === 1 ? "1 facture" : `${factures.length} factures`;

  return (
    <div>
      <EnTetePage
        titre="Factures"
        sousTitre={aEncaisser.nombre > 0 ? `${nombre} · ${formatEuros(aEncaisser.total)} TTC à encaisser` : nombre}
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
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
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
      <div className="mt-5 overflow-hidden rounded-[20px] bg-surface ombre-douce">
        {filtres.length > 0 && <EnTeteColonnes />}
        <div className="divide-y divide-ink/[0.08]">
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
          <>
            {filtres.map((f) => (
              <LigneDocument
                key={f.id}
                href={`/dashboard/demandes/${f.demande_id}#facturation`}
                client={f.demandes?.nom_client ?? "Client"}
                numero={`${LIBELLE_TYPE[f.type]} ${f.numero}`}
                date={`émise le ${new Date(f.date_emission).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                montant={Number(f.total_ttc ?? 0)}
                etat={statutAffiche(f, aujourdHui)}
              />
            ))}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
