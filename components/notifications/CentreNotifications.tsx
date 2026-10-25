"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation, marquerNoteTerminee } from "@/lib/notes";
import { IconeCloche } from "@/components/ui/Icones";
import { IconeCoche } from "@/components/projet/icones";
import { BOUTON_CREUX, BOUTON_TEXTE, CARTE, ERREUR, FOCUS, TITRE_SECTION } from "@/components/ui/recettes";
import type { ImportanceNote, Note } from "@/types";
import { dateEtHeure } from "@/lib/heure";

// Le point d'importance, en tokens : seul ce qui presse se signale (comme
// « À faire » sur la fiche projet). Design v3 (24/10) : deux points sobres,
// l'orange « maintenant » et l'ambre « à faire ».
const POINT_IMPORTANCE: Partial<Record<ImportanceNote, string>> = {
  rouge: "bg-signal",
  orange: "bg-alerte-orange",
};

const formatRappel = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const quandRappel = (iso: string) => dateEtHeure(iso, formatRappel);

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
  // 08/10 — la dernière note cochée, le temps de pouvoir revenir en
  // arrière (la trace « Fait : … · Annuler », sans minuteur).
  const [cochee, setCochee] = useState<Note | null>(null);

  // 27/09 — Sans réseau (ou session à renouveler), la lecture s'arrêtait en
  // silence : le panneau restait sur « Chargement… » pour toujours. On le
  // dit, avec de quoi réessayer.
  const [erreurChargement, setErreurChargement] = useState(false);

  async function charger() {
    setErreurChargement(false);
    setChargement(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const organisationId = user ? await getOrganisationId(supabase, user.id) : null;
      if (!organisationId) throw new Error("Session ou organisation introuvable");
      const donnees = await listerNotesActivesOrganisation(supabase, organisationId, {
        avecRappelUniquement: true,
      });
      setNotes(donnees);
    } catch {
      setErreurChargement(true);
    } finally {
      setChargement(false);
    }
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

  async function terminer(note: Note) {
    const noteId = note.id;
    // Optimiste : disparaît immédiatement de la liste, cohérent avec "Une
    // fois la note terminée : elle disparaît automatiquement" (point 6).
    const noteRetiree = notes.find((n) => n.id === noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setErreurTerminer(null);
    setCochee(note);
    navigator.vibrate?.(12);
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
      setCochee(null);
      navigator.vibrate?.([12, 60, 12]);
      setErreurTerminer("Pas enregistré. Réessayez.");
    }
  }

  async function annuler() {
    if (!cochee) return;
    const note = cochee;
    setCochee(null);
    setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
    const reussi = await marquerNoteTerminee(supabase, note.id, false);
    if (!reussi) {
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      setErreurTerminer("Pas enregistré. Réessayez.");
    }
  }

  const maintenant = Date.now();
  const enRetard = notes.filter((n) => n.rappel_a && new Date(n.rappel_a).getTime() < maintenant);
  const aVenir = notes.filter((n) => !n.rappel_a || new Date(n.rappel_a).getTime() >= maintenant);

  return (
    <div ref={conteneurRef} className="relative">
      <button
        onClick={() => {
          // 13/10 — un rappel créé il y a une minute doit y être.
          if (!ouvert) charger();
          setOuvert((v) => !v);
        }}
        title="Notifications"
        aria-label="Notifications"
        className={`relative grid place-items-center rounded-full text-ink active:bg-ink/10 sm:hover:bg-ink/[0.06] motion-safe:transition-colors ${FOCUS} ${
          vers === "bas" ? "h-12 w-12" : "h-11 w-11"
        }`}
      >
        <IconeCloche taille={20} />
        {enRetard.length > 0 && (
          <span aria-hidden className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-signal ring-2 ring-paper" />
        )}
      </button>

      {ouvert && (
        // Bug remonté (10/09) : le bouton vit tout en bas à gauche de la
        // sidebar (voir Sidebar.tsx, BlocCompteSidebar) — un panneau ancré
        // en "right-0" s'ouvre donc vers la GAUCHE du bouton, c'est-à-dire
        // hors de l'écran, puisque le bouton est déjà collé au bord gauche.
        // "left-0" ouvre vers la droite, dans la zone de contenu visible.
        //
        // 08/10 (passe de finition) — le panneau suit le langage : 16 px
        // pour ce qu'on lit, l'heure du rappel sous chaque ligne, une
        // coche de 48 px avec la trace « Fait : … · Annuler », un squelette
        // au lieu de « Chargement… », et plus d'emoji.
        //
        // Design v3 (24/10) : le panneau est une carte (surface, ombre douce)
        // posée sur l'ombre des feuilles — deux couches, pour garder les
        // deux ombres sans ombre arbitraire. Lignes de 60 px séparées d'un
        // filet fin, squelette immobile, secondaire en creux.
        <div
          className={`absolute z-30 rounded-[20px] ombre-feuille ${
            vers === "bas" ? "right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))]" : "left-0 bottom-full mb-2 w-[22rem]"
          }`}
        >
        <div className={`max-h-[28rem] overflow-y-auto ${CARTE}`}>
          <p className={`px-4 pb-2 pt-4 ${TITRE_SECTION}`}>Rappels</p>
          {chargement ? (
            <div className="flex flex-col gap-3 px-4 pb-4 pt-2" aria-hidden>
              <div className="h-4 w-3/4 rounded-full bg-paper-warm" />
              <div className="h-4 w-1/2 rounded-full bg-paper-warm" />
            </div>
          ) : erreurChargement ? (
            <div className="flex items-center justify-between gap-3 px-4 pb-4">
              <p className="min-w-0 text-[15px] text-steel">Rappels indisponibles.</p>
              <button type="button" onClick={charger} className={`shrink-0 ${BOUTON_CREUX}`}>
                Réessayer
              </button>
            </div>
          ) : notes.length === 0 && !cochee ? (
            <p className="px-4 pb-4 pt-1 text-base text-steel">Rien en attente.</p>
          ) : (
            <ul className="divide-y divide-gris-clair border-t border-gris-clair">
              {[...enRetard, ...aVenir].map((note) => {
                const retard = Boolean(note.rappel_a && new Date(note.rappel_a).getTime() < maintenant);
                const point = POINT_IMPORTANCE[note.importance];
                return (
                  <li key={note.id} className="flex min-h-[3.75rem] items-center gap-1 pl-1">
                    {/* Un rond de 24 px dans une cible de 48. */}
                    <button
                      type="button"
                      onClick={() => terminer(note)}
                      aria-label={`Fait : ${note.titre}`}
                      className="group grid h-12 w-12 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-steel text-transparent motion-safe:transition-colors group-active:border-succes group-active:text-succes sm:group-hover:border-succes sm:group-hover:text-succes">
                        <IconeCoche className="h-3.5 w-3.5" />
                      </span>
                    </button>
                    <Link
                      href={note.demande_id ? `/dashboard/demandes/${note.demande_id}` : "/dashboard/notes"}
                      onClick={() => setOuvert(false)}
                      className="flex min-h-[3.75rem] min-w-0 flex-1 flex-col justify-center py-2 pr-4 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {point && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${point}`} />}
                        <span className="line-clamp-2 text-base font-semibold leading-snug text-ink">{note.titre}</span>
                      </span>
                      <span className="block text-sm text-steel">
                        {retard ? <span className="font-semibold text-signal-fonce">Retard</span> : "Rappel"}
                        {note.rappel_a && ` · ${quandRappel(note.rappel_a)}`}
                        {note.demandes?.nom_client && ` · ${note.demandes.nom_client}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div aria-live="polite">
            {cochee && (
              <div className="mx-3 my-3 flex min-h-12 items-center gap-3 rounded-[14px] bg-succes-fond pl-4 text-[15px] text-ink">
                <IconeCoche className="h-4 w-4 shrink-0 text-succes" />
                <p className="min-w-0 flex-1 truncate">Fait : {cochee.titre}</p>
                <button type="button" onClick={annuler} className={`shrink-0 ${BOUTON_TEXTE}`}>
                  Annuler
                </button>
              </div>
            )}
            {erreurTerminer && <p className={`px-4 pb-3 ${ERREUR}`}>{erreurTerminer}</p>}
          </div>
          {/* Refonte (03/10 — duel B, lot 3) : sans « Plus », c'est la porte
              de toutes les notes. Elle passe de 12 px de texte pâle à une
              vraie cible de 48 px. */}
          <Link
            href="/dashboard/notes"
            onClick={() => setOuvert(false)}
            className="flex min-h-14 items-center border-t border-gris-clair px-4 text-base font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
          >
            Voir toutes les notes
          </Link>
        </div>
        </div>
      )}
    </div>
  );
}
