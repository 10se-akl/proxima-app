"use client";

import { useState } from "react";
import Link from "next/link";
import { TYPES_CHANTIER_METEO_SENSIBLES, type RisqueMeteoJour } from "@/lib/meteo";
import { FeuilleMessageClient } from "@/components/projet/FeuilleMessageClient";
import { IconeChevron, IconeCoche, IconePlus } from "@/components/projet/icones";
import { ActionsRendezVous } from "./ActionsRendezVous";
import type { EvenementAvecProjet } from "./actionsEvenement";
import {
  aujourdhuiCle,
  ajouterJours,
  cleParis,
  grouperParJour,
  heureEnLettres,
  jourCourt,
  jourEnLettres,
  libelleFenetre,
  numeroDuJour,
  quoiDuRendezVous,
  type CleJour,
} from "./semaine";

// ============================================================
// Le planning sur téléphone : la semaine en sept lignes (refonte 03/10,
// duel G, lot 2).
//
// Avant : une bande de sept jours, un jour choisi, la liste de ce jour-là.
// Pour savoir « où je vais cette semaine » ou « mardi est-il libre ? », il
// fallait ouvrir les jours un par un. Maintenant : sept jours glissants à
// partir d'aujourd'hui (heure de Paris), une ligne par rendez-vous, et tout
// tient sur un écran. Un jour sans rien dit « Rien de prévu » et propose un
// « + » ; un samedi et un dimanche vides se fondent en une ligne. Les
// flèches avancent de sept jours.
//
// La météo à risque reste sur la ligne : « Météo à risque », et « Prévenir »
// prend la colonne de fin (règle 7). Pas de pourcentage : le résumé de la
// météo est un texte libre, la ligne n'en cite aucun chiffre.
//
// Pas de glisser-déposer : avec des gants, dans une liste qui défile, le
// lâcher est raté, et il n'a pas d'alternative accessible. Déplacer passe
// par la feuille d'un rendez-vous.
//
// Les props sont celles de l'ancienne version, pour que la page et le banc
// d'aperçu ne changent pas. `jours` : les sept jours à montrer (de minuit à
// minuit, heure de Paris) ; `offset` : de combien de fois sept jours on
// s'est éloigné d'aujourd'hui.
// ============================================================

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

function alerteMeteo(e: EvenementAvecProjet, meteo?: RisqueMeteoJour) {
  const type = e.demandes?.type_chantier;
  return !!meteo?.risque && !!type && TYPES_CHANTIER_METEO_SENSIBLES.includes(type);
}

const capitale = (m: string) => `${m[0].toUpperCase()}${m.slice(1)}`;

export function AgendaMobile({
  jours,
  evenements,
  meteoParJour,
  offset,
}: {
  jours: Date[];
  evenements: EvenementAvecProjet[];
  meteoParJour?: Record<string, RisqueMeteoJour>;
  /** De combien de fois sept jours on s'est éloigné d'aujourd'hui (0, -1, +1…). */
  offset: number;
}) {
  const cles = jours.map((j) => cleParis(j));
  const aujourdhui = aujourdhuiCle();
  const demain = ajouterJours(aujourdhui, 1);
  const groupes = grouperParJour(
    cles,
    evenements.filter((e) => e.statut !== "annule")
  );
  const [ouvert, setOuvert] = useState<EvenementAvecProjet | null>(null);
  const [aPrevenir, setAPrevenir] = useState<EvenementAvecProjet | null>(null);

  const meteoDe = (e: EvenementAvecProjet) => {
    const m = meteoParJour?.[cleParis(e.date_heure)];
    return alerteMeteo(e, m) ? m : undefined;
  };

  return (
    <div>
      {/* Les sept jours d'avant, les sept jours d'après, et le retour à aujourd'hui. */}
      <div className="flex items-center gap-1">
        <Link
          href={`/dashboard/planning?semaine=${offset - 1}`}
          aria-label="Les sept jours précédents"
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink active:bg-ink/10 ${FOCUS}`}
        >
          <IconeChevron className="h-5 w-5 rotate-180" />
        </Link>
        <p className="min-w-0 flex-1 text-center text-base font-semibold text-ink">
          {libelleFenetre(cles[0], cles[cles.length - 1])}
        </p>
        <Link
          href={`/dashboard/planning?semaine=${offset + 1}`}
          aria-label="Les sept jours suivants"
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink active:bg-ink/10 ${FOCUS}`}
        >
          <IconeChevron className="h-5 w-5" />
        </Link>
      </div>

      {offset !== 0 && (
        <Link
          href="/dashboard/planning"
          className="inline-flex min-h-12 items-center text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
        >
          Revenir à aujourd&apos;hui
        </Link>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {groupes.map((g) => {
          const premier = g.cles[0];
          const vide = g.evenements.length === 0;
          const estAujourdhui = g.cles.includes(aujourdhui);
          const fondu = g.cles.length === 2;
          const mot = fondu
            ? `${jourCourt(g.cles[0]).replace(".", "")}–${jourCourt(g.cles[1]).replace(".", "")}`
            : premier === aujourdhui
            ? "Auj."
            : premier === demain
            ? "Dem."
            : capitale(jourCourt(premier));
          const numero = fondu ? `${numeroDuJour(g.cles[0])}–${numeroDuJour(g.cles[1])}` : String(numeroDuJour(premier));
          const libelle = fondu
            ? `${jourEnLettres(g.cles[0])} et ${jourEnLettres(g.cles[1])}`
            : `${premier === aujourdhui ? "Aujourd'hui, " : ""}${jourEnLettres(premier)}`;

          return (
            <section key={premier} aria-label={libelle} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
              {/* Le repère du jour, à hauteur de la première ligne. */}
              <div className={`flex flex-col items-center justify-center ${vide ? "min-h-14" : "min-h-16"}`}>
                <span className="text-sm font-semibold text-steel">{mot}</span>
                <span
                  className={`font-display font-semibold tabular-nums ${fondu ? "text-base" : "text-xl"} ${
                    estAujourdhui ? "rounded-xl bg-ink px-2 py-0.5 text-paper" : "text-ink"
                  }`}
                >
                  {numero}
                </span>
              </div>

              {vide ? (
                <LigneVide jour={g.cles[0]} libelle={libelle} />
              ) : (
                <ul className="flex min-w-0 flex-col gap-2">
                  {g.evenements.map((e) => (
                    <li key={e.id}>
                      <LigneRendezVous
                        evenement={e}
                        meteo={meteoDe(e)}
                        surOuvrir={() => setOuvert(e)}
                        surPrevenir={() => setAPrevenir(e)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {ouvert && <ActionsRendezVous evenement={ouvert} meteo={meteoDe(ouvert)} surFermer={() => setOuvert(null)} />}

      {aPrevenir?.demande_id && (
        <FeuilleMessageClient
          ouverte
          surFermer={() => setAPrevenir(null)}
          demandeId={aPrevenir.demande_id}
          meteo={{ dateRdv: aPrevenir.date_heure, resume: meteoDe(aPrevenir)?.resume ?? null }}
        />
      )}
    </div>
  );
}

/** Un jour sans rien : une phrase et un « + ». Toute la ligne est la cible. */
function LigneVide({ jour, libelle }: { jour: CleJour; libelle: string }) {
  return (
    <Link
      href={`/dashboard/planning/nouveau?date=${jour}`}
      aria-label={`Planifier le ${libelle}`}
      className={`flex min-h-14 items-stretch overflow-hidden rounded-2xl ring-1 ring-ink/15 active:bg-ink/10 ${FOCUS}`}
    >
      <span className="flex min-w-0 flex-1 items-center px-4 text-base text-steel">Rien de prévu</span>
      <span className="grid w-14 shrink-0 place-items-center border-l border-ink/15 text-ink">
        <IconePlus className="h-5 w-5" />
      </span>
    </Link>
  );
}

/** Une ligne : le client, puis l'heure, le quoi, le où. Toute la ligne ouvre
 *  le rendez-vous ; la météo à risque met « Prévenir » dans la colonne de fin. */
function LigneRendezVous({
  evenement: e,
  meteo,
  surOuvrir,
  surPrevenir,
}: {
  evenement: EvenementAvecProjet;
  meteo?: RisqueMeteoJour;
  surOuvrir: () => void;
  surPrevenir: () => void;
}) {
  const fait = e.statut === "termine";
  const qui = e.demandes?.nom_client;
  const risque = !!meteo && !fait;
  // Le quoi, sans répéter le client que la ligne porte déjà.
  const quoi = qui ? quoiDuRendezVous(e.titre, qui) : e.type === "tache" ? "Rappel" : "Rendez-vous";
  const detail = [quoi, e.demandes?.adresse_client].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-16 items-stretch overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/15">
      <button
        type="button"
        onClick={surOuvrir}
        className={`flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left active:bg-ink/10 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ${
          risque ? "pr-2" : "pr-4"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-base font-semibold text-ink ${fait ? "line-through" : ""}`}>{qui ?? e.titre}</span>
          <span className="block truncate text-sm text-steel">
            <span className="font-mono tabular-nums text-ink">{heureEnLettres(e.date_heure)}</span>
            {fait && " · Fait"}
            {risque && (
              <>
                {" · "}
                <span className="font-semibold text-signal-fonce dark:text-signal-clair">Météo à risque</span>
              </>
            )}
            {detail && ` · ${detail}`}
          </span>
        </span>
        {fait ? (
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-succes/10 text-succes">
            <IconeCoche className="h-4 w-4" />
          </span>
        ) : (
          !risque && <IconeChevron className="h-4 w-4 shrink-0 text-ink" />
        )}
      </button>
      {risque && e.demande_id && (
        <button
          type="button"
          onClick={surPrevenir}
          aria-label={`Prévenir ${qui ?? "le client"} : météo à risque`}
          className="grid w-[4.5rem] shrink-0 place-items-center border-l border-ink/15 text-sm font-semibold text-ink active:bg-ink/10 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
        >
          Prévenir
        </button>
      )}
    </div>
  );
}
