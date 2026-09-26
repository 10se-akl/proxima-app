"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerRappelsAVoir, marquerNoteTerminee, marquerNoteVue, COULEUR_POINT_IMPORTANCE } from "@/lib/notes";
import type { Note } from "@/types";

// ============================================================
// Pop-up de rappel bloquante — canal complémentaire au push (29/08,
// suite retour d'Axel : "je veux les notifications push lorsque
// l'application est fermée ET une pop-up discrète lorsque Compyo est
// déjà ouvert"). Montée une seule fois, tout en haut de l'arbre du
// dashboard (voir app/dashboard/layout.tsx), donc active sur n'importe
// quelle page du dashboard sans dépendre de laquelle est ouverte.
//
// Vérifie les rappels dus toutes les 20s + à chaque retour sur l'onglet
// (visibilitychange) — une simple boucle côté client, pas de web-push ni
// de dépendance à un cron externe pour ce canal-là : si l'app est
// ouverte, elle sait déjà, en interne, l'heure qu'il est.
//
// "Plus tard" (l'ancien "Compris") écrit vu_le sur la note — jamais
// statut/termine_le : voir la note reste active, seule la pop-up ne la
// représentera plus (elle reste visible normalement dans "Aujourd'hui"
// sur l'accueil et le centre de notifications). "C'est fait" (27/09) la
// termine en plus, comme la coche de l'accueil.
// ============================================================
const INTERVALLE_VERIFICATION_MS = 20_000;

export function PopupRappel() {
  const supabase = createClient();
  const router = useRouter();
  const organisationIdRef = useRef<string | null>(null);
  const [file, setFile] = useState<Note[]>([]);
  const [enCours, setEnCours] = useState(false);

  const verifier = useCallback(async () => {
    if (!organisationIdRef.current) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      organisationIdRef.current = await getOrganisationId(supabase, user.id);
    }
    if (!organisationIdRef.current) return;

    const rappels = await listerRappelsAVoir(supabase, organisationIdRef.current);
    if (rappels.length > 0) {
      // Ne remplace jamais une file en cours de traitement par l'artisan
      // (il vient peut-être de cliquer "Compris" sur la première) — fusion
      // par id plutôt qu'écrasement pur.
      setFile((prev) => {
        const idsExistants = new Set(prev.map((n) => n.id));
        const nouveaux = rappels.filter((n) => !idsExistants.has(n.id));
        return [...prev, ...nouveaux];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    verifier();
    const intervalle = setInterval(verifier, INTERVALLE_VERIFICATION_MS);
    function surVisibilite() {
      if (document.visibilityState === "visible") verifier();
    }
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      clearInterval(intervalle);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [verifier]);

  // 27/09 — « C'est fait » règle le rappel d'un geste : avant, « Compris »
  // fermait la fenêtre mais la note restait due, et revenait en « Retard »
  // sur l'accueil — il fallait la retrouver pour la cocher. « Plus tard »
  // garde l'ancien comportement : la note reste dans la journée.
  async function fermer(note: Note, fait: boolean) {
    setEnCours(true);
    await Promise.all([marquerNoteVue(supabase, note.id), fait ? marquerNoteTerminee(supabase, note.id, true) : null]);
    setFile((prev) => prev.filter((n) => n.id !== note.id));
    setEnCours(false);
    router.refresh();
  }

  if (file.length === 0) return null;

  const note = file[0];

  return (
    <FenetreRappel
      note={note}
      reste={file.length - 1}
      enCours={enCours}
      surFait={() => fermer(note, true)}
      surPlusTard={() => fermer(note, false)}
    />
  );
}

/** L'affichage seul, sans requête. */
export function FenetreRappel({
  note,
  reste,
  enCours,
  surFait,
  surPlusTard,
}: {
  note: Note;
  /** Les autres rappels en attente après celui-ci. */
  reste: number;
  enCours: boolean;
  surFait: () => void;
  surPlusTard: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label="Rappel"
    >
      <div className="w-full sm:max-w-sm bg-paper rounded-t-3xl sm:rounded-3xl border border-ink/10 shadow-2xl p-6 [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))] sm:[padding-bottom:1.5rem]">
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${COULEUR_POINT_IMPORTANCE[note.importance]}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-1.5">Rappel</p>
            <p className="font-display text-lg font-semibold text-ink leading-snug">{note.titre}</p>
            {note.demandes?.nom_client && (
              <p className="mt-1 text-sm text-ink/50">Projet : {note.demandes.nom_client}</p>
            )}
            {note.description && (
              <p className="mt-2.5 text-sm text-ink/70 leading-relaxed whitespace-pre-wrap">
                {note.description}
              </p>
            )}
          </div>
        </div>

        {reste > 0 && (
          <p className="mt-4 text-xs text-ink/40">
            +{reste} autre{reste > 1 ? "s" : ""} rappel{reste > 1 ? "s" : ""} en
            attente.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={surFait}
            disabled={enCours}
            className="min-h-14 rounded-2xl bg-ink text-[16px] font-semibold text-paper transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
          >
            C&apos;est fait
          </button>
          <button
            type="button"
            onClick={surPlusTard}
            disabled={enCours}
            className="min-h-14 rounded-2xl text-[16px] font-medium text-ink ring-1 ring-ink/15 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
