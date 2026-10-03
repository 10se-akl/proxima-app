"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RisqueMeteoJour } from "@/lib/meteo";
import { Feuille } from "@/components/projet/Feuille";
import { FeuilleMessageClient } from "@/components/projet/FeuilleMessageClient";
import { IconeChevron, IconeLieu, IconeMessage, IconeTelephone } from "@/components/projet/icones";
import { useChangerRendezVous } from "./ChangerRendezVous";
import { changerStatutEvenement, type EvenementAvecProjet } from "./actionsEvenement";
import { heureEnLettres } from "./semaine";

// ============================================================
// Ce qu'on peut faire d'un rendez-vous, sur téléphone (refonte 03/10, duel
// G). Sortie d'AgendaMobile quand la semaine est devenue sept lignes : la
// feuille s'ouvre d'un appui sur une ligne.
//
// Appeler, prévenir, y aller ; « C'est fait » ; « Ouvrir le projet » ;
// « Déplacer » (jour et heure, puis le message au client) ; « Modifier »
// (le formulaire : titre, durée, notes), « Annuler le rendez-vous »
// (une question, puis le message). « Supprimer » n'est plus sur le
// téléphone : sur le terrain « Annuler » suffit, rien n'est effacé et le
// créneau est libéré. Il reste au menu de la grille de l'ordinateur.
// ============================================================

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/** Un titre de feuille tient sur une ligne à 360 px (règle 2). */
function abreger(texte: string, max: number) {
  return texte.length <= max ? texte : `${texte.slice(0, max - 1).trimEnd()}…`;
}

export function ActionsRendezVous({
  evenement,
  meteo,
  surFermer,
}: {
  evenement: EvenementAvecProjet;
  /** Présent seulement quand l'alerte météo concerne ce chantier. */
  meteo?: RisqueMeteoJour;
  surFermer: () => void;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [messageOuvert, setMessageOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);
  // Plus aucun rendez-vous client déplacé ou annulé sans proposer de
  // prévenir : « Déplacer » et « Annuler » passent par la même logique que
  // la grille de l'ordinateur (voir ChangerRendezVous.tsx).
  const changer = useChangerRendezVous(evenement, surFermer);

  const fait = evenement.statut === "termine";
  const telephone = evenement.demandes?.telephone_client;
  const adresse = evenement.demandes?.adresse_client;
  const titre = `${heureEnLettres(evenement.date_heure)} · ${abreger(evenement.demandes?.nom_client ?? evenement.titre, 26)}`;

  async function basculerFait() {
    setEnCours(true);
    setErreur(false);
    const ok = await changerStatutEvenement(supabase, evenement.id, fait ? "a_faire" : "termine");
    setEnCours(false);
    if (!ok) {
      setErreur(true);
      return;
    }
    surFermer();
    router.refresh();
  }

  const tuile = `flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface text-base font-semibold text-ink ring-1 ring-ink/15 active:bg-ink/10 ${FOCUS}`;
  const tuileInactive =
    "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface text-base font-semibold text-steel ring-1 ring-ink/15";
  const ligne = `flex w-full min-h-14 items-center justify-between gap-3 border-b border-ink/15 text-left text-base font-semibold text-ink last:border-b-0 active:bg-ink/10 ${FOCUS}`;

  return (
    <>
      <Feuille ouverte={!messageOuvert && !changer.occupe} titre={titre} surFermer={surFermer}>
        {evenement.demande_id && (
          <div className="grid grid-cols-3 gap-2">
            {telephone ? (
              <a href={`tel:${telephone.replace(/\s/g, "")}`} className={tuile}>
                <IconeTelephone className="h-5 w-5 text-ink" /> Appeler
              </a>
            ) : (
              <span className={tuileInactive} aria-disabled>
                <IconeTelephone className="h-5 w-5" /> Appeler
              </span>
            )}
            <button type="button" onClick={() => setMessageOuvert(true)} className={tuile}>
              <IconeMessage className="h-5 w-5 text-ink" />
              {meteo ? "Prévenir" : "Message"}
            </button>
            {adresse ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={tuile}
              >
                <IconeLieu className="h-5 w-5 text-ink" /> Itinéraire
              </a>
            ) : (
              <span className={tuileInactive} aria-disabled>
                <IconeLieu className="h-5 w-5" /> Itinéraire
              </span>
            )}
          </div>
        )}

        <div className={evenement.demande_id ? "mt-3" : ""}>
          <button type="button" disabled={enCours} onClick={() => void basculerFait()} className={ligne}>
            {fait ? "Remettre à faire" : "C'est fait"}
            <IconeChevron className="h-4 w-4 text-ink" />
          </button>
          {evenement.demande_id && (
            <Link href={`/dashboard/demandes/${evenement.demande_id}`} className={ligne}>
              Ouvrir le projet
              <IconeChevron className="h-4 w-4 text-ink" />
            </Link>
          )}
          {evenement.statut !== "annule" && (
            <button type="button" disabled={enCours} onClick={changer.ouvrirDeplacer} className={ligne}>
              Déplacer
              <IconeChevron className="h-4 w-4 text-ink" />
            </button>
          )}
        </div>

        {/* Les gestes rares, à l'écart. « Modifier » (le formulaire : titre,
            durée, notes) n'est plus une ligne mais un lien, à côté d'« Annuler ». */}
        <div className="mt-4 flex flex-wrap gap-x-6">
          <Link
            href={`/dashboard/planning/nouveau?eventId=${evenement.id}`}
            className="inline-flex min-h-12 items-center text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
          >
            Modifier
          </Link>
          {evenement.statut !== "annule" && (
            <button
              type="button"
              disabled={enCours}
              onClick={changer.ouvrirAnnuler}
              className="inline-flex min-h-12 items-center text-base font-semibold text-signal-fonce underline decoration-signal-fonce/30 underline-offset-4 dark:text-signal-clair dark:decoration-signal-clair/30"
            >
              Annuler le rendez-vous
            </button>
          )}
        </div>
        <p aria-live="polite" className="mt-1 min-h-5 text-sm font-semibold text-signal-fonce dark:text-signal-clair">
          {erreur ? "Pas enregistré. Réessayez." : ""}
        </p>
      </Feuille>

      {changer.feuilles}

      {evenement.demande_id && (
        <FeuilleMessageClient
          ouverte={messageOuvert}
          surFermer={() => {
            setMessageOuvert(false);
            surFermer();
          }}
          demandeId={evenement.demande_id}
          meteo={meteo ? { dateRdv: evenement.date_heure, resume: meteo.resume ?? null } : null}
        />
      )}
    </>
  );
}
