"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { IconeDocument } from "@/components/ui/Icones";
import { adresseEspaceDevis } from "@/lib/devis/actions";
import { statutAffiche } from "@/lib/devis/statut";

type DevisAvecClient = {
  id: string;
  demande_id: string;
  numero: string;
  statut: "brouillon" | "a_valider" | "envoye" | "refuse";
  total_estime: number;
  envoye_le: string | null;
  created_at: string;
  notifie_relance_j5_le?: string | null;
  notifie_relance_j10_le?: string | null;
  demandes?: { nom_client?: string; statut?: string } | null;
};

const LABEL_STATUT_FILTRE = [
  { cle: "tous", label: "Tous" },
  { cle: "a_traiter", label: "À traiter" }, // brouillon + à valider
  { cle: "envoye", label: "En attente" },
  { cle: "accepte", label: "Acceptés" },
  { cle: "refuse", label: "Refusés" },
] as const;

function correspondFiltre(d: DevisAvecClient, filtre: string): boolean {
  if (filtre === "tous") return true;
  if (filtre === "a_traiter") return d.statut === "brouillon" || d.statut === "a_valider";
  if (filtre === "refuse") return d.statut === "refuse";
  if (filtre === "accepte") {
    const statutProjet = d.demandes?.statut;
    return (
      d.statut === "envoye" &&
      (statutProjet === "accepte" || statutProjet === "en_cours" || statutProjet === "termine")
    );
  }
  if (filtre === "envoye") {
    const statutProjet = d.demandes?.statut;
    return (
      d.statut === "envoye" &&
      statutProjet !== "accepte" &&
      statutProjet !== "en_cours" &&
      statutProjet !== "termine"
    );
  }
  return true;
}

type CleFiltre = (typeof LABEL_STATUT_FILTRE)[number]["cle"];

/** Refonte (03/10 — duel B, lot 2) : « Voir les N » de la page Argent
 *  ouvre la liste déjà filtrée (?statut=a_traiter). Une valeur inconnue
 *  retombe sur « Tous ». */
export function filtreDevisDepuis(statut: string | null | undefined): CleFiltre {
  return LABEL_STATUT_FILTRE.find((f) => f.cle === statut)?.cle ?? "tous";
}

export function ListeDevisRecherchable({
  devisList,
  filtreInitial,
}: {
  devisList: DevisAvecClient[];
  /** La valeur de ?statut= dans l'adresse. */
  filtreInitial?: string | null;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<CleFiltre>(() => filtreDevisDepuis(filtreInitial));

  const filtres = devisList
    .filter((d) => correspondFiltre(d, filtre))
    .filter((d) =>
      `${d.demandes?.nom_client ?? ""} ${d.numero}`.toLowerCase().includes(recherche.toLowerCase())
    );

  return (
    <div>
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Client, numéro de devis…"
        aria-label="Rechercher un devis"
        className="w-full min-h-12 rounded-2xl border border-ink/15 bg-surface px-4 text-[15px] transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
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
            className={`min-h-11 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
              filtre === f.cle ? "bg-ink text-paper" : "text-ink/70 ring-1 ring-ink/15 hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtres.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-signal/10">
              <IconeDocument taille={20} className="text-signal" />
            </span>
            <p className="text-sm text-ink/50">
              {devisList.length === 0
                ? "Aucun devis pour le moment. Générez-en un depuis un projet."
                : "Aucun devis pour ce filtre."}
            </p>
          </div>
        ) : (
          filtres.map((d) => {
            const { texte, classe } = statutAffiche(d, d.demandes?.statut);
            return (
              <Link
                key={d.id}
                href={adresseEspaceDevis(d.id)}
                className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/[0.07] transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
              >
                <Avatar nom={d.demandes?.nom_client ?? "?"} taille={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[16px] font-semibold text-ink">{d.demandes?.nom_client ?? "Client"}</span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                      {d.total_estime.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px] text-ink/65">{`${d.numero} · ${d.envoye_le ? `envoyé le ${new Date(d.envoye_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : `créé le ${new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}`}</span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium ${classe}`}>{texte}</span>
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
