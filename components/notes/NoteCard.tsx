"use client";

import Link from "next/link";
import { IconeCoche } from "@/components/projet/icones";
import type { ImportanceNote, Note } from "@/types";

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

// Le point d'importance, en tokens : seul ce qui presse se signale.
const POINT_IMPORTANCE: Partial<Record<ImportanceNote, string>> = {
  rouge: "bg-signal-fonce dark:bg-signal-clair",
  orange: "bg-alerte-orange",
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const formatRappel = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function quandRappel(iso: string): string {
  return formatRappel.format(new Date(iso)).replace(":", " h ").replace(/ h 00$/, " h");
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
  const nomProjet = afficherProjet ? note.demandes?.nom_client : null;
  const point = POINT_IMPORTANCE[note.importance];
  const detail = [note.rappel_a ? quandRappel(note.rappel_a) : null, nomProjet].filter(Boolean).join(" · ");

  const texte = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {point && !estTerminee && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${point}`} />}
        <span className={`truncate text-base text-ink ${estTerminee ? "line-through" : ""}`}>{note.titre}</span>
      </span>
      {detail && <span className="block truncate text-sm text-steel">{detail}</span>}
      {note.description && <span className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-steel">{note.description}</span>}
    </>
  );
  const classeTexte = "flex min-h-14 min-w-0 flex-1 flex-col justify-center py-1.5 pr-3";

  return (
    <div className={`flex items-center gap-1 rounded-2xl bg-paper/70 ring-1 ring-ink/10 ${className}`}>
      {onTerminer ? (
        // Un rond de 24 px dans une cible de 48.
        <button
          type="button"
          onClick={() => {
            if (!estTerminee) navigator.vibrate?.(12);
            onTerminer(note.id, !estTerminee);
          }}
          aria-label={estTerminee ? `Pas fait : ${note.titre}` : `Fait : ${note.titre}`}
          className={`group grid h-12 w-12 shrink-0 place-items-center self-start rounded-full mt-1 ${FOCUS}`}
        >
          <span
            className={`grid h-6 w-6 place-items-center rounded-full border-2 motion-safe:transition-colors ${
              estTerminee
                ? "border-succes bg-succes text-white"
                : "border-ink/40 text-transparent group-active:border-succes group-active:text-succes sm:group-hover:border-succes sm:group-hover:text-succes"
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
          className={`${classeTexte} rounded-xl active:bg-ink/10 motion-safe:transition-colors sm:hover:bg-ink/5 ${FOCUS}`}
        >
          {texte}
        </Link>
      ) : (
        <div className={classeTexte}>{texte}</div>
      )}
    </div>
  );
}
