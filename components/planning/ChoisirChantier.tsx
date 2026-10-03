"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron } from "@/components/projet/icones";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import type { ProjetAPlanifier } from "./FeuillePlanifier";
import { jourEnLettres, type CleJour } from "./semaine";

// ============================================================
// Le « + » d'un jour vide : pour quel chantier ? (refonte 03/10, duel G,
// lot 3.) Les cinq chantiers actifs les plus récents, puis « Autre… » vers
// le formulaire (une tâche, ou un chantier qui n'est pas dans la liste).
// Un appui sur un chantier ouvre « Planifier », déjà remplie pour ce jour :
// « + », le chantier, « Planifier » : trois appuis.
// ============================================================

const NOMBRE_MAX = 5;

type Ligne = ProjetAPlanifier & { type_chantier: string | null };

export function ChoisirChantier({
  jour,
  surFermer,
  surChoisir,
}: {
  /** null : feuille fermée. */
  jour: CleJour | null;
  surFermer: () => void;
  surChoisir: (projet: ProjetAPlanifier) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!jour) return;
    let vivant = true;
    setLignes(null);
    setErreur(false);
    supabase
      .from("demandes")
      .select("id, nom_client, type_chantier")
      .neq("statut", "termine")
      .order("derniere_modification_le", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(NOMBRE_MAX)
      .then(({ data, error }) => {
        if (!vivant) return;
        if (error) setErreur(true);
        else setLignes((data as Ligne[]) ?? []);
      });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jour, essai]);

  return (
    <Feuille ouverte={!!jour} titre="Quel chantier ?" surFermer={surFermer}>
      <p className="text-base text-steel first-letter:uppercase">{jour ? jourEnLettres(jour) : ""}</p>

      <div className="mt-3 flex flex-col gap-2">
        {lignes === null && !erreur && (
          <div aria-busy="true" aria-label="Chargement" className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex min-h-16 items-center rounded-2xl bg-surface px-4 ring-1 ring-ink/15">
                <div className="h-4 w-40 rounded-full bg-ink/10 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {erreur && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-base text-steel">Chantiers non chargés.</p>
            <button
              type="button"
              onClick={() => setEssai((n) => n + 1)}
              className="min-h-12 rounded-2xl px-4 text-base font-semibold text-ink ring-1 ring-inset ring-ink/60 active:bg-ink/10"
            >
              Réessayer
            </button>
          </div>
        )}

        {lignes?.length === 0 && <p className="text-base text-steel">Aucun chantier en cours.</p>}

        {lignes?.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => surChoisir(p)}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-ink/15 motion-safe:transition-colors active:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-ink">{p.nom_client}</span>
              {LABEL_TYPE_CHANTIER[p.type_chantier ?? "autre"] && (
                <span className="block truncate text-sm text-steel">{LABEL_TYPE_CHANTIER[p.type_chantier ?? "autre"]}</span>
              )}
            </span>
            <IconeChevron className="h-4 w-4 shrink-0 text-ink" />
          </button>
        ))}
      </div>

      <Link
        href={`/dashboard/planning/nouveau?date=${jour ?? ""}`}
        className="mt-2 inline-flex min-h-12 items-center text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
      >
        Autre…
      </Link>
    </Feuille>
  );
}
