"use client";

import Link from "next/link";
import { COULEUR_POINT_IMPORTANCE } from "@/lib/notes";
import { Card } from "@/components/ui/Card";
import type { Note } from "@/types";

// ============================================================
// Carte de note — le composant central du point 5 du brief ("je ne veux
// PAS une simple liste. Chaque note est une vraie carte."). RÉUTILISÉE
// telle quelle sur les 3 endroits qui affichent des notes (page Notes,
// section Notes de la fiche projet, section Rappels d'Aujourd'hui) —
// c'est la garantie visuelle que "aucun doublon" (point 8) ne dérive pas
// en plusieurs présentations différentes de la même donnée au fil du
// temps.
//
// Couleurs volontairement sobres : un point coloré discret (voir
// COULEUR_POINT_IMPORTANCE, lib/notes/index.ts), fond clair uniforme,
// jamais de grande carte rouge flashy — demande explicite d'Axel,
// "Compyo doit rester élégant".
//
// `afficherProjet` masque la ligne "Projet : X" quand la carte est déjà
// affichée DANS la fiche du projet concerné (redondant à cet endroit
// précis) — l'affiche partout ailleurs (page Notes, Aujourd'hui, centre
// de notifications).
// ============================================================

function formaterRappel(rappelA: string): { texte: string; enRetard: boolean } {
  const date = new Date(rappelA);
  const maintenant = new Date();
  const enRetard = date.getTime() < maintenant.getTime();

  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);
  const debutDemain = new Date(debutAujourdhui);
  debutDemain.setDate(debutDemain.getDate() + 1);
  const debutApresDemain = new Date(debutDemain);
  debutApresDemain.setDate(debutApresDemain.getDate() + 1);

  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (date >= debutAujourdhui && date < debutDemain) {
    return { texte: `Rappel aujourd'hui ${heure}`, enRetard };
  }
  if (date >= debutDemain && date < debutApresDemain) {
    return { texte: `Rappel demain ${heure}`, enRetard };
  }
  return {
    texte: `Rappel ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${heure}`,
    enRetard,
  };
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
  const rappel = note.rappel_a ? formaterRappel(note.rappel_a) : null;
  const estTerminee = note.statut === "terminee";
  const nomProjet = note.demandes?.nom_client;

  const contenu = (
    <>
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${COULEUR_POINT_IMPORTANCE[note.importance]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium text-ink ${estTerminee ? "line-through text-ink/40" : ""}`}
          >
            {note.titre}
          </p>
          {(afficherProjet && nomProjet) || rappel || estTerminee ? (
            <p className="mt-0.5 text-xs text-ink/45 flex flex-wrap items-center gap-x-1.5">
              {afficherProjet && (
                <span>{nomProjet ? `Projet ${nomProjet}` : "Note générale"}</span>
              )}
              {afficherProjet && rappel && <span aria-hidden="true">·</span>}
              {rappel && (
                <span className={rappel.enRetard && !estTerminee ? "text-signal font-medium" : ""}>
                  {rappel.enRetard && !estTerminee ? "En retard — " : ""}
                  {rappel.texte}
                </span>
              )}
              {estTerminee && (
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium text-ink/50">
                  Terminée
                </span>
              )}
            </p>
          ) : null}
        </div>
      </div>

      {note.description && (
        <>
          <div className="my-2.5 border-t border-ink/[0.06]" />
          <p className="text-xs text-ink/60 leading-relaxed whitespace-pre-wrap">
            {note.description}
          </p>
        </>
      )}
    </>
  );

  return (
    <Card className={`p-4 ${className}`}>
      {contenu}
      <div className="mt-3 flex items-center gap-3">
        {onTerminer && (
          <button
            type="button"
            onClick={() => onTerminer(note.id, !estTerminee)}
            className="text-xs font-medium text-ink/50 hover:text-ink transition-colors"
          >
            {estTerminee ? "↺ Réactiver" : "✓ Marquer comme terminé"}
          </button>
        )}
        {note.demande_id && (
          <Link
            href={`/dashboard/demandes/${note.demande_id}`}
            className="text-xs text-ink/40 hover:text-ink underline underline-offset-2 transition-colors"
          >
            Voir le projet
          </Link>
        )}
      </div>
    </Card>
  );
}
