"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerRappelsAVoir, marquerNoteTerminee, marquerNoteVue } from "@/lib/notes";
import { BOUTON_CREUX_LARGE, BOUTON_PLEIN_LARGE, ERREUR, ETIQUETTE, FORME_ETIQUETTE } from "@/components/ui/recettes";
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
  const [erreur, setErreur] = useState(false);

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
    setErreur(false);
    const [vue, terminee] = await Promise.all([
      marquerNoteVue(supabase, note.id),
      fait ? marquerNoteTerminee(supabase, note.id, true) : Promise.resolve(true),
    ]);
    setEnCours(false);
    // 13/10 — sans réseau, la fenêtre se fermait puis le même rappel
    // revenait vingt secondes plus tard, sans explication.
    if (vue === false || terminee === false) {
      navigator.vibrate?.([12, 60, 12]);
      setErreur(true);
      return;
    }
    setFile((prev) => prev.filter((n) => n.id !== note.id));
    router.refresh();
  }

  if (file.length === 0) return null;

  const note = file[0];

  return (
    <FenetreRappel
      note={note}
      reste={file.length - 1}
      enCours={enCours}
      erreur={erreur}
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
  erreur = false,
  surFait,
  surPlusTard,
}: {
  note: Note;
  /** Les autres rappels en attente après celui-ci. */
  reste: number;
  enCours: boolean;
  /** Le dernier geste n'a pas été enregistré. */
  erreur?: boolean;
  surFait: () => void;
  surPlusTard: () => void;
}) {
  const etiquette =
    note.importance === "rouge" ? ETIQUETTE.urgent : note.importance === "orange" ? ETIQUETTE.attention : null;
  return (
    // Design v3 (24/10) : voile sans flou (comme les feuilles), la fenêtre
    // en surface + ombre-feuille, coins de 28 px ; l'importance en étiquette
    // qui dit le mot (plus de point de couleur seul, vert compris) ; deux
    // gros boutons de 56 px, un seul plein.
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 dark:bg-black/60 sm:items-center sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label="Rappel"
    >
      <div className="w-full rounded-t-[28px] bg-surface p-6 ombre-feuille [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))] sm:max-w-sm sm:rounded-[28px] sm:[padding-bottom:1.5rem]">
        {/* 08/10 (passe de finition) — le langage de l'application : un
            surtitre en acier, le rappel en titre de feuille, le client
            en détail, sans « Projet : ». */}
        <p className="mb-1 flex flex-wrap items-center gap-2 text-[15px] text-steel">
          <span>Rappel{note.demandes?.nom_client ? ` · ${note.demandes.nom_client}` : ""}</span>
          {etiquette && <span className={`${FORME_ETIQUETTE} ${etiquette}`}>Important</span>}
        </p>
        <p className="break-words font-display text-xl font-semibold text-ink [text-wrap:balance]">{note.titre}</p>
        {note.description && <p className="mt-2 whitespace-pre-wrap text-base text-ink [text-wrap:pretty]">{note.description}</p>}

        {reste > 0 && (
          <p className="mt-4 text-[15px] text-steel">
            Puis {reste} autre{reste > 1 ? "s" : ""} rappel{reste > 1 ? "s" : ""}.
          </p>
        )}

        {erreur && (
          <p aria-live="polite" className={`mt-4 ${ERREUR}`}>
            Pas enregistré. Réessayez.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.vibrate?.(12);
              surFait();
            }}
            disabled={enCours}
            className={BOUTON_PLEIN_LARGE}
          >
            C&apos;est fait
          </button>
          <button type="button" onClick={surPlusTard} disabled={enCours} className={BOUTON_CREUX_LARGE}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
