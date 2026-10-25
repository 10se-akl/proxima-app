"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron } from "@/components/projet/icones";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import type { ProjetAPlanifier } from "./FeuillePlanifier";
import { jourEnLettres, type CleJour } from "./semaine";
import { BOUTON_CREUX, BOUTON_TEXTE, GROUPE, SECONDAIRE } from "@/components/ui/recettes";

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
      <p className={`${SECONDAIRE} first-letter:uppercase`}>{jour ? jourEnLettres(jour) : ""}</p>

      {/* Design v3 (24/10) : les chantiers en liste groupée (une carte,
          des filets), plus un cadre par ligne ; le chargement est immobile
          (pas d'animation en boucle). */}
      <div className="mt-3">
        {lignes === null && !erreur && (
          <div aria-busy="true" aria-label="Chargement" className={GROUPE}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex min-h-16 items-center px-4">
                <div className="h-4 w-40 rounded-full bg-paper-warm" />
              </div>
            ))}
          </div>
        )}

        {erreur && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-base text-steel">Chantiers non chargés.</p>
            <button type="button" onClick={() => setEssai((n) => n + 1)} className={BOUTON_CREUX}>
              Réessayer
            </button>
          </div>
        )}

        {lignes?.length === 0 && <p className="text-base text-steel">Aucun chantier en cours.</p>}

        {lignes && lignes.length > 0 && (
          <div className={GROUPE}>
            {lignes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => surChoisir(p)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left motion-safe:transition-colors active:bg-ink/[0.06] sm:hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[17px] font-semibold text-ink">{p.nom_client}</span>
                  {LABEL_TYPE_CHANTIER[p.type_chantier ?? "autre"] && (
                    <span className="block text-[15px] text-steel">{LABEL_TYPE_CHANTIER[p.type_chantier ?? "autre"]}</span>
                  )}
                </span>
                <IconeChevron className="h-4 w-4 shrink-0 text-steel" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Link href={`/dashboard/planning/nouveau?date=${jour ?? ""}`} className={`-ml-3 mt-2 ${BOUTON_TEXTE}`}>
        Autre…
      </Link>
    </Feuille>
  );
}
