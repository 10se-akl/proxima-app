"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { IconeDocument } from "@/components/ui/Icones";

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

// Le statut du devis (en base) ne distingue pas "envoyé, en attente" de
// "envoyé, accepté" — c'est le projet qui porte l'acceptation. On combine
// les deux pour donner une vraie photo de la situation, sans obliger
// l'artisan à comprendre la mécanique interne.
function statutAffiche(d: DevisAvecClient): { texte: string; classe: string } {
  if (d.statut === "brouillon") return { texte: "Brouillon", classe: "bg-ink/10 text-ink/60" };
  if (d.statut === "a_valider")
    return { texte: "À valider", classe: "bg-[#D9861A]/15 text-[#D9861A]" };
  if (d.statut === "refuse") return { texte: "Refusé", classe: "bg-signal/10 text-signal" };
  const statutProjet = d.demandes?.statut;
  if (statutProjet === "accepte" || statutProjet === "en_cours" || statutProjet === "termine") {
    return { texte: "Accepté", classe: "bg-[#2F8F5B]/15 text-[#2F8F5B]" };
  }
  // Relance (11/09) — le devis est toujours en attente, mais l'artisan a
  // déjà reçu une proposition de relance (voir app/api/cron/relance-devis).
  // Le badge dit juste où on en est, sans compteur ni couleur alarmante :
  // même nuance neutre que "en attente", seul le texte change. "Relancé"
  // signifie ici "relance proposée à l'artisan" — Compyo n'envoie jamais
  // rien de lui-même au client.
  if (d.notifie_relance_j10_le) {
    return { texte: "Relancé J+10", classe: "bg-steel/15 text-steel" };
  }
  if (d.notifie_relance_j5_le) {
    return { texte: "Relancé J+5", classe: "bg-steel/15 text-steel" };
  }
  return { texte: "Envoyé — en attente", classe: "bg-steel/15 text-steel" };
}

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

export function ListeDevisRecherchable({ devisList }: { devisList: DevisAvecClient[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<(typeof LABEL_STATUT_FILTRE)[number]["cle"]>("tous");

  const filtres = devisList
    .filter((d) => correspondFiltre(d, filtre))
    .filter((d) =>
      `${d.demandes?.nom_client ?? ""} ${d.numero}`.toLowerCase().includes(recherche.toLowerCase())
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un client, un numéro de devis…"
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
              {devisList.length === 0
                ? "Aucun devis pour le moment. Générez-en un depuis un projet."
                : "Aucun devis pour ce filtre."}
            </p>
          </div>
        ) : (
          filtres.map((d) => {
            const { texte, classe } = statutAffiche(d);
            return (
              <Link key={d.id} href={`/dashboard/demandes/${d.demande_id}`}>
                <Card className="p-3.5 flex items-center justify-between gap-3 flex-wrap transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink/[0.06]">
                  <div className="flex items-center gap-3">
                    <Avatar nom={d.demandes?.nom_client ?? "?"} taille={32} />
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${classe}`}>
                      {texte}
                    </span>
                    <div>
                      <p className="text-sm text-ink/80">
                        {d.demandes?.nom_client ?? "Client"}{" "}
                        <span className="text-ink/40 font-mono text-xs">{d.numero}</span>
                      </p>
                      <p className="text-xs text-ink/40">
                        {d.envoye_le
                          ? `Envoyé le ${new Date(d.envoye_le).toLocaleDateString("fr-FR")}`
                          : `Créé le ${new Date(d.created_at).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-ink whitespace-nowrap">
                    {d.total_estime.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
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
