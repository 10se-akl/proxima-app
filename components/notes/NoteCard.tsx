"use client";

import Link from "next/link";
import { IconeCoche } from "@/components/projet/icones";
import { ETIQUETTE, FOCUS, FORME_ETIQUETTE } from "@/components/ui/recettes";
import type { ImportanceNote, Note } from "@/types";
import { dateEtHeure } from "@/lib/heure";

// ============================================================
// Une note dans la page Notes.
//
// 08/10 (passe de finition) — la même ligne que « À faire » sur la fiche
// projet : un rond à cocher de 48 px à gauche, le titre en 16 px, le
// détail sur une ligne (l'heure du rappel, le client), et toute la ligne
// ouvre le projet. Avant : une carte en 12 px, « ✓ Marquer comme
// terminé » et « Voir le projet » en petits liens pâles, « Projet X » ou
// « Note générale » écrits en toutes lettres. Le groupe (« En retard »,
// « Aujourd'hui »…) dit déjà quand : la ligne ne le répète pas.
// ============================================================

// Design v3 (24/10) — la note est une LIGNE d'une liste groupée (GROUPE,
// posé par la page) : plus de cadre ni de fond à elle. L'importance n'est
// plus un point de couleur seul, mais une étiquette sobre qui dit le mot ;
// seul ce qui presse se signale.
const ETIQUETTE_IMPORTANCE: Partial<Record<ImportanceNote, string>> = {
  rouge: ETIQUETTE.urgent,
  orange: ETIQUETTE.attention,
};

const formatRappel = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
});

function quandRappel(iso: string): string {
  return dateEtHeure(iso, formatRappel);
}

export function NoteCard({
  note,
  afficherProjet = true,
  onTerminer,
  className = "",
}: {
  note: Note;
  afficherProjet?: boolean;
  onTerminer?: (noteId: string, terminee: boolean) => void;
  className?: string;
}) {
  const estTerminee = note.statut === "terminee";
  // Design v3 (25/10) : « Bernard-Lefèvre » ne se coupe plus au trait
  // d'union (trait d'union insécable, U+2011).
  const nomProjet = afficherProjet ? note.demandes?.nom_client?.replace(/-/g, "\u2011") : null;
  const etiquette = estTerminee ? undefined : ETIQUETTE_IMPORTANCE[note.importance];
  const detail = [note.rappel_a ? quandRappel(note.rappel_a) : null, nomProjet].filter(Boolean).join(" · ");

  const texte = (
    <>
      <span className={`block break-words text-[17px] leading-snug text-ink [text-wrap:pretty] ${estTerminee ? "line-through" : ""}`}>{note.titre}</span>
      {(etiquette || detail) && (
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {etiquette && <span className={`${FORME_ETIQUETTE} ${etiquette}`}>Important</span>}
          {detail && <span className="break-words text-[15px] text-steel [hyphens:none]">{detail}</span>}
        </span>
      )}
      {note.description && <span className="mt-0.5 line-clamp-2 whitespace-pre-line text-[15px] text-steel">{note.description}</span>}
    </>
  );
  const classeTexte = "flex min-h-14 min-w-0 flex-1 flex-col justify-center py-2.5 pr-4";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {onTerminer ? (
        // Un rond de 24 px dans une cible de 48.
        <button
          type="button"
          onClick={() => {
            if (!estTerminee) navigator.vibrate?.(12);
            onTerminer(note.id, !estTerminee);
          }}
          aria-label={estTerminee ? `Pas fait : ${note.titre}` : `Fait : ${note.titre}`}
          className={`group ml-1 mt-1 grid h-12 w-12 shrink-0 place-items-center self-start rounded-full ${FOCUS}`}
        >
          {/* Design v3 (24/10) : le rond au trait acier (8:1), plus l'encre
              à 40 % qui passait sous 3:1. */}
          <span
            className={`grid h-6 w-6 place-items-center rounded-full border-2 motion-safe:transition-colors ${
              estTerminee
                ? "border-succes bg-succes text-white dark:text-nuit"
                : "border-steel text-transparent group-active:border-succes group-active:text-succes sm:group-hover:border-succes sm:group-hover:text-succes"
            }`}
          >
            <IconeCoche className="h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      {note.demande_id ? (
        <Link
          href={`/dashboard/demandes/${note.demande_id}`}
          className={`${classeTexte} rounded-[14px] pl-1 active:bg-ink/[0.06] motion-safe:transition-colors sm:hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink`}
        >
          {texte}
        </Link>
      ) : (
        // 25/10 — même retrait que la version lien (pl-1) : les titres des
        // notes sans projet s'alignaient 4 px plus à gauche.
        <div className={`${classeTexte} pl-1`}>{texte}</div>
      )}
    </div>
  );
}
