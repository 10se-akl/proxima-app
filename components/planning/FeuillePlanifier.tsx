"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import { vibrer, vibrerEchec } from "@/lib/retour";
import { IconeCoche } from "@/components/projet/icones";
import { Feuille } from "@/components/projet/Feuille";
import { ChoisirJour } from "./ChoisirJour";
import { chargerCreneauParDefaut, titreParDefaut } from "./creneau";
import {
  aujourdhuiCle,
  creneauParDefaut,
  dureeEnLettres,
  heureEnLettres,
  instantParis,
  jourEnLettres,
  quandEnLettres,
  type CleJour,
} from "./semaine";

// ============================================================
// Planifier un rendez-vous en trois appuis (refonte 03/10, duel G, lot 3).
//
// Avant : un formulaire de huit champs, une dizaine d'appuis depuis la
// fiche. Ici, la feuille arrive déjà remplie : demain, à l'heure du dernier
// rendez-vous du projet (sinon 8 h), pour 1 h. « Planifier » (fiche ou « + »
// d'un jour), un jour s'il faut changer, « Planifier » : trois appuis, deux
// si demain convient. « À l'heure… » ouvre l'heure exacte et la durée : une
// visite de devis se fait à 12 h ou à 17 h 30, et « Journée » bloque toute la
// journée pour toute l'entreprise (la contrainte de la base est celle de
// l'entreprise entière) : ce n'est donc jamais le choix par défaut.
//
// Rien ne s'affiche comme réussi avant d'avoir lu le résultat de l'écriture
// (règle 13). Un créneau pris dit « Déjà pris à cette heure. ». Le titre, la
// durée exacte et les notes se changent ensuite, par « Modifier ».
// ============================================================

export type ProjetAPlanifier = { id: string; nom_client: string; type_chantier?: string | null };

type Plage = "matin" | "apres" | "journee" | "heure";

const PLAGES: Record<Exclude<Plage, "heure">, { libelle: string; heure: string; duree: number }> = {
  matin: { libelle: "Matin", heure: "08:00", duree: 240 },
  apres: { libelle: "Après-midi", heure: "13:00", duree: 240 },
  journee: { libelle: "Journée", heure: "08:00", duree: 540 },
};

const DUREES = [30, 60, 90, 120, 180, 240];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/** La trace d'un rendez-vous planifié, qui reste jusqu'à ce qu'on quitte l'écran (règle 16). */
export function TracePlanifie({ texte }: { texte: string | null }) {
  return (
    <div aria-live="polite">
      {texte && (
        <p className="mb-3 flex min-h-12 items-center gap-3 rounded-2xl bg-succes/10 px-4 text-sm text-ink">
          <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-succes/10 text-succes">
            <IconeCoche className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">{texte}</span>
        </p>
      )}
    </div>
  );
}

export function FeuillePlanifier({
  projet,
  jourInitial,
  surFermer,
  surPlanifie,
}: {
  /** null : feuille fermée. */
  projet: ProjetAPlanifier | null;
  /** Le jour touché (« + » d'un jour) ; sinon demain. */
  jourInitial?: CleJour | null;
  surFermer: () => void;
  /** Appelé une fois l'écriture lue : la phrase de la trace, et l'instant
   *  du rendez-vous (pour proposer de prévenir le client, depuis la fiche). */
  surPlanifie: (trace: string, debut: string) => void;
}) {
  const [supabase] = useState(() => createClient());
  const defaut = creneauParDefaut(null);
  const [jour, setJour] = useState<CleJour>(defaut.jour);
  const [plage, setPlage] = useState<Plage | null>(null);
  const [heure, setHeure] = useState(defaut.heure);
  const [duree, setDuree] = useState(defaut.duree);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Dès que l'artisan touche à l'heure ou à la durée, la proposition lue
  // dans la base ne vient plus rien écraser.
  const touche = useRef(false);
  const idProjet = projet?.id;

  useEffect(() => {
    if (!idProjet) return;
    const c = creneauParDefaut(null);
    touche.current = false;
    setJour(jourInitial ?? c.jour);
    setPlage(null);
    setHeure(c.heure);
    setDuree(c.duree);
    setErreur(null);
    let vivant = true;
    chargerCreneauParDefaut(supabase, idProjet).then((lu) => {
      if (!vivant || touche.current) return;
      setHeure(lu.heure);
      setDuree(lu.duree);
    });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idProjet, jourInitial]);

  function choisirPlage(p: Plage) {
    touche.current = true;
    setPlage(p);
    setErreur(null);
    if (p !== "heure") {
      setHeure(PLAGES[p].heure);
      setDuree(PLAGES[p].duree);
    }
  }

  const aujourdhui = aujourdhuiCle();
  const quand = quandEnLettres(jour, aujourdhui);
  const resume = plage && plage !== "heure" ? PLAGES[plage].libelle.toLowerCase() : `à ${heureEnLettres(instantParis(jour, heure))}`;

  async function planifier() {
    if (!projet || enCours) return;
    setErreur(null);
    const debut = instantParis(jour, heure);
    if (debut.getTime() < Date.now()) {
      vibrerEchec();
      setErreur("Cette heure est déjà passée.");
      return;
    }
    setEnCours(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const organisationId = user ? await getOrganisationId(supabase, user.id) : null;
      if (!user || !organisationId) {
        vibrerEchec();
        setErreur("Pas enregistré. Réessayez.");
        return;
      }
      // Lire le résultat : une ligne rendue, sinon rien n'a été écrit.
      const { data, error } = await supabase
        .from("evenements_planning")
        .insert({
          demande_id: projet.id,
          titre: titreParDefaut(projet.nom_client, projet.type_chantier),
          type: "rendez_vous",
          date_heure: debut.toISOString(),
          duree_minutes: duree,
          notes: null,
          artisan_id: user.id,
          organisation_id: organisationId,
        })
        .select("id");
      if (error || !data || data.length === 0) {
        vibrerEchec();
        setErreur(error?.code === "23P01" ? "Déjà pris à cette heure." : "Pas enregistré. Réessayez.");
        return;
      }
      vibrer();
      // Le carnet du projet : jamais bloquant, le rendez-vous est déjà écrit.
      await enregistrerEvenement(supabase, {
        demandeId: projet.id,
        artisanId: user.id,
        organisationId,
        type: "rdv_planifie",
        titre: "Rendez-vous planifié",
        detail: `${jourEnLettres(jour)} à ${heureEnLettres(debut)}`,
      });
      surPlanifie(`Planifié : ${projet.nom_client}, ${quand} ${resume}`, debut.toISOString());
    } catch {
      vibrerEchec();
      setErreur("Pas enregistré. Réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  const puce = (actif: boolean) =>
    `min-h-12 rounded-full px-4 text-base font-semibold motion-safe:transition-colors active:bg-ink/10 ${FOCUS} ${
      actif ? "bg-ink text-paper active:bg-ink/80" : "text-ink ring-1 ring-inset ring-ink/60"
    }`;
  const champ =
    "mt-1.5 w-full min-h-12 rounded-xl border border-ink/15 bg-paper px-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20";

  return (
    <Feuille ouverte={!!projet} titre="Quand ?" surFermer={surFermer}>
      <div className="flex flex-col gap-3">
        <p className="truncate text-base text-steel">{projet?.nom_client}</p>

        <ChoisirJour
          jour={jour}
          surChoisir={(j) => {
            setJour(j);
            setErreur(null);
          }}
          creneau={{ heure, duree }}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Heure">
          {(Object.keys(PLAGES) as (keyof typeof PLAGES)[]).map((p) => (
            <button key={p} type="button" aria-pressed={plage === p} onClick={() => choisirPlage(p)} className={puce(plage === p)}>
              {PLAGES[p].libelle}
            </button>
          ))}
          <button type="button" aria-pressed={plage === "heure"} onClick={() => choisirPlage("heure")} className={puce(plage === "heure")}>
            À l&apos;heure…
          </button>
        </div>

        {plage === "heure" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-ink">
              Heure
              <input
                type="time"
                required
                value={heure}
                onChange={(e) => {
                  touche.current = true;
                  setHeure(e.target.value);
                }}
                className={champ}
              />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Durée
              <select
                value={duree}
                onChange={(e) => {
                  touche.current = true;
                  setDuree(Number(e.target.value));
                }}
                className={champ}
              >
                {[...new Set([...DUREES, duree])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {dureeEnLettres(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* « Planifier » reste sous le pouce même si la liste des jours fait
            défiler la feuille (360 × 640). */}
        <div className="sticky bottom-[calc(-1.25rem_-_env(safe-area-inset-bottom))] -mx-5 -mb-[calc(1.25rem_+_env(safe-area-inset-bottom))] border-t border-ink/15 bg-paper px-5 pt-3 [padding-bottom:calc(1.25rem+env(safe-area-inset-bottom))]">
          <p aria-live="polite" className="min-h-5 text-sm font-semibold text-signal-fonce dark:text-signal-clair">
            {erreur}
          </p>
          <button
            type="button"
            disabled={enCours || !heure}
            onClick={() => void planifier()}
            className={`mt-1 min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 disabled:opacity-60 ${FOCUS}`}
          >
            <span className="block truncate">{enCours ? "…" : `Planifier ${quand} ${resume}`}</span>
          </button>
        </div>
      </div>
    </Feuille>
  );
}
