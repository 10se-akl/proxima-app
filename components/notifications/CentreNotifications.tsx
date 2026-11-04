"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation, marquerNoteTerminee } from "@/lib/notes";
import { listerAnnonces, marquerAnnoncesLues, LIBELLE_GENRE, type Annonce } from "@/lib/annonces";
import { badgeCloche, libelleCloche } from "@/lib/notifications/badgeCloche";
import { aujourdhuiParis, minuitParis } from "@/lib/moisParis";
import { IconeCloche } from "@/components/ui/Icones";
import { IconeCoche } from "@/components/projet/icones";
import { BOUTON_CREUX, BOUTON_TEXTE, CARTE, ERREUR, FOCUS } from "@/components/ui/recettes";
import type { ImportanceNote, Note } from "@/types";
import { dateEtHeure, heure } from "@/lib/heure";

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
const formatJour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

/** Un rendez-vous ou une tâche du planning, aujourd'hui, encore à faire. */
type ChantierDuJour = {
  id: string;
  type: string;
  titre: string | null;
  demande_id: string | null;
  date_heure: string;
  demandes: { nom_client: string | null } | null;
};

const LIEN_TITRE = "px-4 pb-1 pt-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-steel";
const LIGNE_LIEN =
  "flex min-h-[3.75rem] min-w-0 flex-1 flex-col justify-center py-2 pr-4 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink";

// ============================================================
// Centre de notifications (point du brief "Notifications intelligentes") :
// "Même si l'utilisateur ignore une notification téléphone, elle reste
// visible dans l'application." Les notes actives AVEC rappel de
// l'organisation — même donnée, même fonction de lecture que la section
// Rappels d'Aujourd'hui (lib/notes/index.ts), jamais une requête séparée.
//
// 04/11/2026 (Axel) — la cloche porte trois choses, et le badge suit la
// règle de lib/notifications/badgeCloche.ts :
//   - les messages de Compyo (nouveauté, offre, message ; Module 54) :
//     chaque message non lu compte dans le chiffre. Ouvrir la cloche vaut
//     lecture ;
//   - les rappels : ceux dont l'heure est passée comptent dans le chiffre
//     (l'artisan a demandé qu'on le lui rappelle) ;
//   - les chantiers du jour (planning, encore à faire) : un point rouge
//     seulement, sans chiffre.
// Aucun appel IA : de simples lectures, au montage, à l'ouverture et quand
// on revient sur l'onglet.
// ============================================================
/** `vers="bas"` : dans la barre du haut sur téléphone (26/09) et dans le
 *  bandeau du site (04/11), le panneau s'ouvre vers le bas et se cale sur
 *  le bord droit. Par défaut, vers le haut, depuis le bas de la barre
 *  latérale. */
export function CentreNotifications({ vers = "haut" }: { vers?: "haut" | "bas" } = {}) {
  const supabase = createClient();
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [chantiers, setChantiers] = useState<ChantierDuJour[]>([]);
  // Les messages qui étaient nouveaux à l'ouverture : ils gardent leur
  // marque « Nouveau » tant que le panneau reste ouvert.
  const [nouveaux, setNouveaux] = useState<Set<string>>(new Set());
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

  /** Recharge tout ; à l'ouverture (`ouverture`), marque les messages
   *  non lus comme lus. */
  async function charger(ouverture = false) {
    setErreurChargement(false);
    setChargement(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const organisationId = user ? await getOrganisationId(supabase, user.id) : null;
      if (!user || !organisationId) throw new Error("Session ou organisation introuvable");
      const jour = aujourdhuiParis();
      const [donnees, lesAnnonces, planning] = await Promise.all([
        listerNotesActivesOrganisation(supabase, organisationId, { avecRappelUniquement: true }),
        listerAnnonces(supabase, user.id),
        supabase
          .from("evenements_planning")
          .select("id, type, titre, demande_id, date_heure, demandes(nom_client)")
          .eq("organisation_id", organisationId)
          .eq("statut", "a_faire")
          .gte("date_heure", minuitParis(jour.annee, jour.mois, jour.jour).toISOString())
          .lt("date_heure", minuitParis(jour.annee, jour.mois, jour.jour + 1).toISOString())
          .order("date_heure", { ascending: true }),
      ]);
      setNotes(donnees);
      // Le planning manque (réseau) : la cloche marche quand même.
      setChantiers(planning.error ? [] : ((planning.data ?? []) as unknown as ChantierDuJour[]));
      if (ouverture) {
        const nonLues = lesAnnonces.filter((a) => !a.lue).map((a) => a.id);
        setNouveaux(new Set(nonLues));
        setAnnonces(lesAnnonces.map((a) => ({ ...a, lue: true })));
        void marquerAnnoncesLues(supabase, user.id, nonLues);
      } else {
        setAnnonces(lesAnnonces);
      }
    } catch {
      setErreurChargement(true);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // Revenir sur l'onglet (ou rallumer le téléphone) remet le badge à jour.
    function surRetour() {
      if (document.visibilityState === "visible") charger();
    }
    document.addEventListener("visibilitychange", surRetour);
    return () => document.removeEventListener("visibilitychange", surRetour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClicExterieur);
      document.removeEventListener("keydown", surTouche);
    };
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
    // Sprint Robustesse (30/08) — sur échec (réseau, session expirée), on
    // remet la note dans la liste : elle reste active en base.
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
  const badge = badgeCloche({
    rappelsDus: enRetard.length,
    messagesNonLus: annonces.filter((a) => !a.lue).length,
    chantiersDuJour: chantiers.length,
  });
  const fermer = () => setOuvert(false);

  // Les messages de Compyo passent en tête quand il y en a de nouveaux,
  // sinon ils vont en bas : ce qui presse d'abord.
  const blocAnnonces = annonces.length > 0 && (
    <section aria-label="De la part de Compyo">
      <p className={LIEN_TITRE}>De la part de Compyo</p>
      <ul className="divide-y divide-gris-clair border-t border-gris-clair">
        {annonces.slice(0, 5).map((a) => {
          const nouveau = nouveaux.has(a.id);
          const contenu = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                {nouveau && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-signal" />}
                <span className="line-clamp-2 text-base font-semibold leading-snug text-ink">{a.titre}</span>
              </span>
              {a.texte && <span className="mt-0.5 line-clamp-3 text-[15px] leading-snug text-steel">{a.texte}</span>}
              <span className="mt-0.5 block text-sm text-steel">
                {nouveau && <span className="font-semibold text-signal-fonce">Nouveau · </span>}
                {LIBELLE_GENRE[a.genre]} · {formatJour.format(new Date(a.publiee_le))}
              </span>
            </>
          );
          return (
            <li key={a.id} className="flex">
              {a.lien ? (
                a.lien.startsWith("/") ? (
                  <Link href={a.lien} onClick={fermer} className={`pl-4 ${LIGNE_LIEN}`}>
                    {contenu}
                  </Link>
                ) : (
                  <a href={a.lien} target="_blank" rel="noopener noreferrer" onClick={fermer} className={`pl-4 ${LIGNE_LIEN}`}>
                    {contenu}
                  </a>
                )
              ) : (
                <div className="flex min-h-[3.75rem] min-w-0 flex-1 flex-col justify-center py-2 pl-4 pr-4">{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
  const annoncesEnTete = nouveaux.size > 0;

  return (
    <div ref={conteneurRef} className="relative">
      <button
        onClick={() => {
          // 13/10 — un rappel créé il y a une minute doit y être.
          if (!ouvert) charger(true);
          setOuvert((v) => !v);
        }}
        title="Notifications"
        aria-label={libelleCloche(badge)}
        aria-expanded={ouvert}
        className={`relative grid place-items-center rounded-full text-ink active:bg-ink/10 sm:hover:bg-ink/[0.06] motion-safe:transition-colors ${FOCUS} ${
          vers === "bas" ? "h-12 w-12" : "h-11 w-11"
        }`}
      >
        <IconeCloche taille={20} />
        {badge?.genre === "chiffre" && (
          <span
            aria-hidden
            className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1 font-sans text-[11px] font-bold leading-none text-white tabular-nums ring-2 ring-paper"
          >
            {badge.texte}
          </span>
        )}
        {badge?.genre === "point" && (
          <span aria-hidden className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-paper" />
        )}
      </button>

      {ouvert && (
        // Bug remonté (10/09) : depuis le bas de la barre latérale, un
        // panneau en "right-0" sortait de l'écran : "left-0" l'ouvre vers
        // la zone de contenu. Vers le bas, il se cale sur le bord droit.
        //
        // Design v3 (24/10) : une carte posée sur l'ombre des feuilles,
        // lignes de 60 px séparées d'un filet fin, squelette immobile.
        <div
          className={`absolute z-50 rounded-[20px] ombre-feuille ${
            vers === "bas" ? "right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))]" : "left-0 bottom-full mb-2 w-[22rem]"
          }`}
        >
          <div className={`max-h-[min(32rem,calc(100dvh-6rem))] overflow-y-auto overscroll-contain ${CARTE}`}>
            {chargement && notes.length === 0 && annonces.length === 0 && chantiers.length === 0 ? (
              <div className="flex flex-col gap-3 px-4 pb-4 pt-5" aria-hidden>
                <div className="h-4 w-3/4 rounded-full bg-paper-warm" />
                <div className="h-4 w-1/2 rounded-full bg-paper-warm" />
              </div>
            ) : erreurChargement ? (
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <p className="min-w-0 text-[15px] text-steel">Notifications indisponibles.</p>
                <button type="button" onClick={() => charger(true)} className={`shrink-0 ${BOUTON_CREUX}`}>
                  Réessayer
                </button>
              </div>
            ) : (
              <>
                {annoncesEnTete && blocAnnonces}

                <section aria-label="Rappels">
                  <p className={LIEN_TITRE}>Vos rappels</p>
                  {notes.length === 0 && !cochee ? (
                    <p className="px-4 pb-3 pt-1 text-base text-steel">Rien en attente.</p>
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
                              onClick={fermer}
                              className={LIGNE_LIEN}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {point && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${point}`} />}
                                <span className="line-clamp-2 text-base font-semibold leading-snug text-ink">{note.titre}</span>
                              </span>
                              <span className="block text-sm text-steel">
                                {retard ? <span className="font-semibold text-signal-fonce">À faire maintenant</span> : "Rappel"}
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
                </section>

                {chantiers.length > 0 && (
                  <section aria-label="Aujourd'hui sur vos chantiers">
                    <p className={LIEN_TITRE}>Aujourd&apos;hui sur vos chantiers</p>
                    <ul className="divide-y divide-gris-clair border-t border-gris-clair">
                      {chantiers.map((c) => (
                        <li key={c.id} className="flex">
                          <Link
                            href={c.demande_id ? `/dashboard/demandes/${c.demande_id}` : "/dashboard/planning"}
                            onClick={fermer}
                            className={`pl-4 ${LIGNE_LIEN}`}
                          >
                            <span className="line-clamp-2 text-base font-semibold leading-snug text-ink">
                              {c.titre || c.demandes?.nom_client || (c.type === "tache" ? "Tâche" : "Rendez-vous")}
                            </span>
                            <span className="block text-sm text-steel">
                              <span className="tabular-nums">{heure(c.date_heure)}</span>
                              {` · ${c.type === "tache" ? "Tâche" : "Rendez-vous"}`}
                              {c.titre && c.demandes?.nom_client && ` · ${c.demandes.nom_client}`}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {!annoncesEnTete && blocAnnonces}
              </>
            )}
            {/* Refonte (03/10 — duel B, lot 3) : la porte de toutes les
                notes, une vraie cible de 48 px. */}
            <div className="grid grid-cols-2 border-t border-gris-clair">
              <Link
                href="/dashboard/notes"
                onClick={fermer}
                className="flex min-h-14 items-center px-4 text-base font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              >
                Toutes les notes
              </Link>
              <Link
                href="/dashboard/planning"
                onClick={fermer}
                className="flex min-h-14 items-center justify-end border-l border-gris-clair px-4 text-base font-semibold text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              >
                Planning
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
