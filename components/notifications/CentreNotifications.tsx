"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation, marquerNoteTerminee, COULEUR_POINT_IMPORTANCE } from "@/lib/notes";
import { IconeCloche } from "@/components/ui/Icones";
import type { Note } from "@/types";

// ============================================================
// Centre de notifications (point du brief "Notifications intelligentes") :
// "Même si l'utilisateur ignore une notification téléphone, elle reste
// visible dans l'application." Toujours les notes actives AVEC rappel de
// l'organisation — même donnée, même fonction de lecture que la section
// Rappels d'Aujourd'hui (lib/notes/index.ts), jamais une requête séparée.
// ============================================================
/** `vers="bas"` : dans la barre du haut sur téléphone (26/09), le panneau
 *  s'ouvre vers le bas et se cale sur le bord droit. Par défaut, vers le
 *  haut, depuis le bas de la barre latérale. */
export function CentreNotifications({ vers = "haut" }: { vers?: "haut" | "bas" } = {}) {
  const supabase = createClient();
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chargement, setChargement] = useState(true);
  // Sprint Robustesse (30/08) — voir `terminer()` ci-dessous.
  const [erreurTerminer, setErreurTerminer] = useState<string | null>(null);

  async function charger() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) return;
    const donnees = await listerNotesActivesOrganisation(supabase, organisationId, {
      avecRappelUniquement: true,
    });
    setNotes(donnees);
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  async function terminer(noteId: string) {
    // Optimiste : disparaît immédiatement de la liste, cohérent avec "Une
    // fois la note terminée : elle disparaît automatiquement" (point 6).
    const noteRetiree = notes.find((n) => n.id === noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setErreurTerminer(null);
    // Sprint Robustesse (30/08) — le retrait optimiste ci-dessus n'attendait
    // jamais le résultat de `marquerNoteTerminee` : sur échec (réseau,
    // session expirée), la note disparaissait de l'écran alors qu'elle
    // restait active en base — l'artisan croyait l'avoir traitée alors que
    // le rappel pouvait ressurgir plus tard. On remet la note dans la liste
    // si l'appel échoue.
    const reussi = await marquerNoteTerminee(supabase, noteId, true);
    if (!reussi) {
      if (noteRetiree) {
        setNotes((prev) => [...prev, noteRetiree]);
      }
      setErreurTerminer("Impossible de marquer cette note comme terminée. Réessayez.");
    }
  }

  const maintenant = Date.now();
  const enRetard = notes.filter((n) => n.rappel_a && new Date(n.rappel_a).getTime() < maintenant);
  const aVenir = notes.filter((n) => !n.rappel_a || new Date(n.rappel_a).getTime() >= maintenant);

  return (
    <div ref={conteneurRef} className="relative">
      <button
        onClick={() => setOuvert((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
        className={`relative grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors ${
          vers === "bas" ? "w-12 h-12" : "w-8 h-8"
        }`}
      >
        <IconeCloche taille={17} />
        {enRetard.length > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-signal" />
        )}
      </button>

      {ouvert && (
        // Bug remonté (10/09) : le bouton vit tout en bas à gauche de la
        // sidebar (voir Sidebar.tsx, BlocCompteSidebar) — un panneau ancré
        // en "right-0" s'ouvre donc vers la GAUCHE du bouton, c'est-à-dire
        // hors de l'écran, puisque le bouton est déjà collé au bord gauche.
        // "left-0" ouvre vers la droite, dans la zone de contenu visible.
        <div
          className={`absolute z-30 max-h-96 overflow-y-auto rounded-xl border border-ink/10 bg-surface shadow-lg shadow-ink/10 ${
            vers === "bas" ? "right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))]" : "left-0 bottom-full mb-2 w-80"
          }`}
        >
          <p className="px-4 pt-3.5 pb-2 font-mono text-[10px] tracking-[0.2em] uppercase text-steel">
            Notifications
          </p>
          {erreurTerminer && (
            <p className="px-4 pb-2 text-xs text-signal">{erreurTerminer}</p>
          )}
          {chargement ? (
            <p className="px-4 pb-4 text-xs text-ink/40">Chargement…</p>
          ) : notes.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-ink/40">Rien en attente. 👍</p>
          ) : (
            <div className="pb-2">
              {[...enRetard, ...aVenir].map((note) => (
                <div
                  key={note.id}
                  className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-ink/[0.03] transition-colors"
                >
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${COULEUR_POINT_IMPORTANCE[note.importance]}`}
                  />
                  <Link
                    href={note.demande_id ? `/dashboard/demandes/${note.demande_id}` : "/dashboard/notes"}
                    onClick={() => setOuvert(false)}
                    className="min-w-0 flex-1"
                  >
                    <p className="text-xs text-ink/80 leading-snug">{note.titre}</p>
                    {note.demandes?.nom_client && (
                      <p className="text-[11px] text-ink/40">{note.demandes.nom_client}</p>
                    )}
                  </Link>
                  <button
                    onClick={() => terminer(note.id)}
                    title="Marquer comme terminé"
                    aria-label="Marquer comme terminé"
                    className="text-ink/30 hover:text-ink transition-colors text-xs shrink-0"
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/notes"
            onClick={() => setOuvert(false)}
            className="block px-4 py-2.5 text-xs text-ink/50 hover:text-ink border-t border-ink/5 transition-colors"
          >
            Voir toutes les notes →
          </Link>
        </div>
      )}
    </div>
  );
}
