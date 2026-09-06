"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { IconeDocument } from "@/components/ui/Icones";
import type { Facture } from "@/types";

type FactureAvecClient = Pick<
  Facture,
  "id" | "demande_id" | "type" | "numero" | "statut" | "total_ttc" | "date_emission"
> & {
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
  if (f.statut === "payee") return { texte: "Payée", classe: "bg-[#2F8F5B]/15 text-[#2F8F5B]" };
  if (f.statut === "annulee") return { texte: "Annulée", classe: "bg-ink/10 text-ink/40" };
  return { texte: "Émise", classe: "bg-steel/15 text-steel" };
}

// ============================================================
// Module 28 (06/09) — même structure que ListeDevisRecherchable.tsx :
// recherche + filtre par statut, clic vers le projet correspondant (une
// facture n'a pas d'écran dédié, elle vit dans la fiche projet qui l'a
// générée — voir FacturesProjet.tsx).
// ============================================================
export function ListeFacturesRecherchable({ factures }: { factures: FactureAvecClient[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<(typeof LABEL_STATUT_FILTRE)[number]["cle"]>("tous");

  const filtres = factures
    .filter((f) => filtre === "tous" || f.statut === filtre)
    .filter((f) => `${f.demandes?.nom_client ?? ""} ${f.numero}`.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un client, un numéro de facture…"
          className="flex-1 min-w-[200px] rounded-xl border border-ink/15 bg-surface px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {LABEL_STATUT_FILTRE.map((f) => (
          <button
            key={f.cle}
            onClick={() => setFiltre(f.cle)}
            className={`rounded-lg px-2.5 py-1 text-xs border transition-colors ${
              filtre === f.cle
                ? "bg-ink text-paper border-ink"
                : "border-ink/15 text-ink/50 hover:border-ink/40 hover:text-ink/70"
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
              {factures.length === 0
                ? "Aucune facture pour le moment. Créez-en une depuis un projet dont le devis a été accepté."
                : "Aucune facture pour ce filtre."}
            </p>
          </div>
        ) : (
          filtres.map((f) => {
            const { texte, classe } = statutAffiche(f);
            return (
              <Link key={f.id} href={`/dashboard/demandes/${f.demande_id}`}>
                <Card className="p-3.5 flex items-center justify-between gap-3 flex-wrap transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink/[0.06]">
                  <div className="flex items-center gap-3">
                    <Avatar nom={f.demandes?.nom_client ?? "?"} taille={32} />
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${classe}`}>{texte}</span>
                    <div>
                      <p className="text-sm text-ink/80">
                        {f.demandes?.nom_client ?? "Client"}{" "}
                        <span className="text-ink/40 font-mono text-xs">
                          {LIBELLE_TYPE[f.type]} {f.numero}
                        </span>
                      </p>
                      <p className="text-xs text-ink/40">
                        Émise le {new Date(f.date_emission).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-ink whitespace-nowrap">
                    {f.total_ttc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </p>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
