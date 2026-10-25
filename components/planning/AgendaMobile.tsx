"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TYPES_CHANTIER_METEO_SENSIBLES, type RisqueMeteoJour } from "@/lib/meteo";
import { FeuilleMessageClient } from "@/components/projet/FeuilleMessageClient";
import { IconeCalendrier, IconeChevron, IconeCloche, IconeCoche, IconePlus } from "@/components/projet/icones";
import { BOUTON_CREUX, BOUTON_ICONE, BOUTON_TEXTE, CARTE, FOCUS, TUILE_ICONE } from "@/components/ui/recettes";
import { ActionsRendezVous } from "./ActionsRendezVous";
import { ChoisirChantier } from "./ChoisirChantier";
import { FeuillePlanifier, TracePlanifie, type ProjetAPlanifier } from "./FeuillePlanifier";
import type { EvenementAvecProjet } from "./actionsEvenement";
import {
  aujourdhuiCle,
  ajouterJours,
  cleParis,
  grouperParJour,
  jourCourt,
  jourEnLettres,
  libelleFenetre,
  numeroDuJour,
  quoiDuRendezVous,
  type CleJour,
} from "./semaine";
import { heure } from "@/lib/heure";

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
// La météo à risque reste sur la ligne : « Météo à risque », et « Prévenir
// le client » en pastille creuse sous le texte (design v3, 24/10). Pas de pourcentage : le résumé de la
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

function alerteMeteo(e: EvenementAvecProjet, meteo?: RisqueMeteoJour) {
  const type = e.demandes?.type_chantier;
  return !!meteo?.risque && !!type && TYPES_CHANTIER_METEO_SENSIBLES.includes(type);
}

const capitale = (m: string) => `${m[0].toUpperCase()}${m.slice(1)}`;

// Design v3 (25/10) : « Bernard-Lefèvre » ne se coupe plus au trait d'union
// (trait d'union insécable, U+2011) ; le nom passe à la ligne entre les mots.
const sansCoupureAuTrait = (t: string) => t.replace(/-/g, "\u2011");

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
  // Le « + » d'un jour vide : le chantier, puis « Planifier » déjà remplie
  // pour ce jour (components/planning/FeuillePlanifier.tsx).
  const router = useRouter();
  const [jourAPlanifier, setJourAPlanifier] = useState<CleJour | null>(null);
  const [projetChoisi, setProjetChoisi] = useState<ProjetAPlanifier | null>(null);
  const [trace, setTrace] = useState<string | null>(null);

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
          className={BOUTON_ICONE}
        >
          <IconeChevron className="h-5 w-5 rotate-180" />
        </Link>
        <p className="min-w-0 flex-1 text-center text-[17px] font-semibold text-ink">
          {libelleFenetre(cles[0], cles[cles.length - 1])}
        </p>
        <Link
          href={`/dashboard/planning?semaine=${offset + 1}`}
          aria-label="Les sept jours suivants"
          className={BOUTON_ICONE}
        >
          <IconeChevron className="h-5 w-5" />
        </Link>
      </div>

      {offset !== 0 && (
        <Link href="/dashboard/planning" className={`-ml-3 ${BOUTON_TEXTE}`}>
          Revenir à aujourd&apos;hui
        </Link>
      )}

      <TracePlanifie texte={trace} />

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
            ? // 22/10 (panel) — « Dem. » se lisait « dimanche ».
              "Demain"
            : capitale(jourCourt(premier));
          const numero = fondu ? `${numeroDuJour(g.cles[0])}–${numeroDuJour(g.cles[1])}` : String(numeroDuJour(premier));
          const libelle = fondu
            ? `${jourEnLettres(g.cles[0])} et ${jourEnLettres(g.cles[1])}`
            : `${premier === aujourdhui ? "Aujourd'hui, " : ""}${jourEnLettres(premier)}`;

          return (
            // Design v3 (24/10) : la colonne du jour passe à 56 px, pour que
            // « Demain » et « sam–dim » tiennent en 13 px (plus de 12 px).
            <section key={premier} aria-label={libelle} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2">
              {/* Le repère du jour, à hauteur de la première ligne.
                  Design v3 (25/10) : calé en haut (self-start) ; centré sur
                  toute la hauteur, « Mar. 27 » flottait au milieu d'une
                  carte haute, à l'écart des autres jours. */}
              <div className={`flex flex-col items-center justify-center self-start ${vide ? "min-h-14" : "min-h-16"}`}>
                <span className={`font-semibold text-steel ${mot.length > 4 ? "text-[13px]" : "text-sm"}`}>{mot}</span>
                {/* Design v3 (25/10) : aujourd'hui, un rond à l'encre, la même
                    forme que sur la grille de l'ordinateur (plus un carré
                    arrondi ici et un rond là-bas). */}
                <span
                  className={`font-display font-semibold tabular-nums ${fondu ? "text-base" : "text-xl"} ${
                    estAujourdhui ? "mt-0.5 inline-grid h-9 min-w-[2.25rem] place-items-center rounded-full bg-ink px-2 text-paper" : "text-ink"
                  }`}
                >
                  {numero}
                </span>
              </div>

              {vide ? (
                <LigneVide libelle={libelle} surPlanifier={() => setJourAPlanifier(g.cles[0])} />
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

      <ChoisirChantier
        jour={projetChoisi ? null : jourAPlanifier}
        surFermer={() => setJourAPlanifier(null)}
        surChoisir={setProjetChoisi}
      />
      <FeuillePlanifier
        projet={projetChoisi}
        jourInitial={jourAPlanifier}
        surFermer={() => {
          setProjetChoisi(null);
          setJourAPlanifier(null);
        }}
        surPlanifie={(t) => {
          setTrace(t);
          setProjetChoisi(null);
          setJourAPlanifier(null);
          router.refresh();
        }}
      />

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
function LigneVide({ libelle, surPlanifier }: { libelle: string; surPlanifier: () => void }) {
  return (
    <button
      type="button"
      onClick={surPlanifier}
      aria-label={`Planifier le ${libelle}`}
      // Design v3 : un jour libre se fait discret (une ligne légère, pas une
      // carte) ; les vrais rendez-vous ressortent.
      className={`flex min-h-12 w-full items-center gap-3 rounded-[14px] pl-4 pr-2 text-left active:bg-ink/[0.06] ${FOCUS}`}
    >
      <span className="min-w-0 flex-1 text-[15px] text-steel">Libre</span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-warm text-ink">
        <IconePlus className="h-5 w-5" />
      </span>
    </button>
  );
}

/** Une ligne : le client, puis l'heure, le quoi, le où. Toute la ligne ouvre
 *  le rendez-vous ; la météo à risque ajoute « Prévenir le client » dessous. */
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
    <div className={`flex min-h-16 flex-col overflow-hidden ${CARTE}`}>
      <button
        type="button"
        onClick={surOuvrir}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-ink/[0.06] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        {/* Design v3 (24/10) : la tuile d'icône neutre ; la couleur reste
            pour ce qui a un sens (la météo). */}
        <span aria-hidden className={TUILE_ICONE}>
          {e.type === "rendez_vous" ? <IconeCalendrier className="h-5 w-5" /> : <IconeCloche className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`line-clamp-2 break-words text-[17px] font-semibold leading-snug text-ink [hyphens:none] ${fait ? "line-through" : ""}`}>
            {sansCoupureAuTrait(qui ?? e.titre)}
          </span>
          {/* Design v3 (24/10) : le quoi et le où sur deux lignes au plus,
              plutôt qu'une ligne coupée (« Chantier toit… »). */}
          <span className="line-clamp-2 text-[15px] text-steel">
            <span className="tabular-nums text-ink">{heure(e.date_heure)}</span>
            {fait && " · Fait"}
            {detail && ` · ${detail}`}
          </span>
          {/* 22/10 (panel) — sur sa propre ligne : à côté de l'heure, il
              finissait coupé (« Météo à risqu… »). */}
          {risque && <span className="block text-[15px] font-semibold text-signal-fonce">Météo à risque</span>}
        </span>
        {fait ? (
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-succes-fond text-succes">
            <IconeCoche className="h-4 w-4" />
          </span>
        ) : (
          <IconeChevron className="h-4 w-4 shrink-0 text-steel" />
        )}
      </button>
      {/* Design v3 (24/10) : « Prévenir le client » n'est plus une colonne à
          filet vertical mais une pastille creuse sous le texte, alignée sur
          lui. Deux cibles distinctes, jamais imbriquées. */}
      {risque && e.demande_id && (
        <div className="pb-3 pl-[4.25rem] pr-4">
          <button
            type="button"
            onClick={surPrevenir}
            aria-label={`Prévenir le client${qui ? ` ${qui}` : ""} : météo à risque`}
            className={BOUTON_CREUX}
          >
            Prévenir le client
          </button>
        </div>
      )}
    </div>
  );
}
