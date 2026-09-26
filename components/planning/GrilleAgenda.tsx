"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Priorite } from "@/types";
import {
  changerStatutEvenement,
  cleDateLocale,
  estMemeJour,
  supprimerEvenement,
  type EvenementAvecProjet,
} from "./actionsEvenement";
import { TYPES_CHANTIER_METEO_SENSIBLES, type RisqueMeteoJour } from "@/lib/meteo";
import { FeuilleMessageClient } from "@/components/projet/FeuilleMessageClient";

// Plage par défaut : couvre une journée de travail classique sans obliger
// à scroller pour un artisan qui n'a jamais de rendez-vous hors de ces
// heures. Mais un couvreur, un plombier ou un chauffagiste peut avoir une
// urgence à 22h ou un départ de chantier à 5h — un rendez-vous en dehors de
// 7h-20h ne doit jamais devenir invisible. Le bug remonté : un rendez-vous
// à minuit ne s'affichait pas du tout, positionné hors de la grille. La
// grille s'élargit donc automatiquement pour toujours inclure tous les
// événements de la semaine affichée, quelle que soit l'heure.
const HEURE_DEBUT_DEFAUT = 7;
const HEURE_FIN_DEFAUT = 20;
const HAUTEUR_HEURE = 52; // px

const COULEUR_PRIORITE: Record<Priorite, string> = {
  urgent: "bg-[#C23B22] border-[#C23B22]",
  important: "bg-[#D9861A] border-[#D9861A]",
  normal: "bg-[#2F8F5B] border-[#2F8F5B]",
};

const COULEUR_TACHE_SANS_PROJET = "bg-ink/40 border-ink/40";

function estPasse(jour: Date) {
  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);
  return jour.getTime() < debutAujourdhui.getTime();
}

// Audit pré-bêta (09/09), point 🟠 n°12 — un rendez-vous et une tâche au
// même horaire se superposaient totalement (chaque bloc en `left-1
// right-1`, pleine largeur), celui rendu en dernier dans le DOM (z-10 sur
// les deux) rendait l'autre injoignable au clic, sans jamais être
// "annulé". Algorithme de calendrier classique : regrouper les événements
// d'une même journée par "cluster" de chevauchement en chaîne (A
// chevauche B, B chevauche C → même cluster même si A et C, eux, ne se
// touchent pas directement), puis attribuer une colonne à chacun dans son
// cluster — largeur et position calculées à partir du nombre de colonnes
// du cluster, jamais de la journée entière (un cluster de 2 ne doit pas
// rétrécir un événement isolé ailleurs dans la même journée).
type PlacementEvenement = { colonne: number; totalColonnes: number };

function disposerEvenementsDuJour(evenements: EvenementAvecProjet[]): Map<string, PlacementEvenement> {
  const bornes = evenements
    .map((e) => {
      const debut = new Date(e.date_heure).getTime();
      return { id: e.id, debut, fin: debut + (e.duree_minutes ?? 30) * 60000 };
    })
    .sort((a, b) => a.debut - b.debut || a.fin - b.fin);

  const placements = new Map<string, PlacementEvenement>();
  let clusterActuel: typeof bornes = [];
  let finMaxCluster = -Infinity;

  function clorreCluster() {
    if (clusterActuel.length === 0) return;
    const finColonnes: number[] = [];
    const colonneParId = new Map<string, number>();
    for (const ev of clusterActuel) {
      let colonne = finColonnes.findIndex((fin) => fin <= ev.debut);
      if (colonne === -1) {
        colonne = finColonnes.length;
        finColonnes.push(ev.fin);
      } else {
        finColonnes[colonne] = ev.fin;
      }
      colonneParId.set(ev.id, colonne);
    }
    const totalColonnes = finColonnes.length;
    for (const ev of clusterActuel) {
      placements.set(ev.id, { colonne: colonneParId.get(ev.id)!, totalColonnes });
    }
    clusterActuel = [];
    finMaxCluster = -Infinity;
  }

  for (const ev of bornes) {
    if (clusterActuel.length > 0 && ev.debut >= finMaxCluster) {
      clorreCluster();
    }
    clusterActuel.push(ev);
    finMaxCluster = Math.max(finMaxCluster, ev.fin);
  }
  clorreCluster();

  return placements;
}

function BlocEvenement({
  evenement,
  heureDebut,
  nombreHeures,
  meteo,
  placement,
  alignMenuADroite,
}: {
  evenement: EvenementAvecProjet;
  heureDebut: number;
  nombreHeures: number;
  meteo?: RisqueMeteoJour;
  placement: PlacementEvenement;
  alignMenuADroite: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [messageOuvert, setMessageOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  const date = new Date(evenement.date_heure);
  const minutesDepuisDebut = (date.getHours() - heureDebut) * 60 + date.getMinutes();
  const top = (minutesDepuisDebut / 60) * HAUTEUR_HEURE;
  // Même chasse que alignMenuADroite (10/09) : le menu contextuel ouvrait
  // toujours vers le BAS ("mt-1") — jusqu'à 6 actions possibles (météo,
  // ouvrir, modifier, terminé, annuler, supprimer), soit ~270px, qui peut
  // dépasser le bas de la grille visible pour un rendez-vous tard dans la
  // journée. On ouvre vers le haut à la place pour les 3 dernières heures
  // affichées, même geste de vérification que pour le bord droit.
  const alignMenuEnHaut = minutesDepuisDebut / 60 >= nombreHeures - 3;
  const dureeMin = evenement.duree_minutes ?? 30;
  // Audit pré-bêta (09/09), point 🟠 n°13 — un RDV de 15-25 min descendait à
  // ~22px de hauteur, bien sous les 44px recommandés (Apple/Google) pour
  // une cible tactile fiable au doigt, avec des gants, sur chantier. Le
  // bloc peut désormais visuellement déborder un peu sur le créneau
  // suivant pour un rendez-vous très court — préférable à un bloc
  // impossible à toucher précisément.
  // Audit "vérification systématique" (10/09) — trouvé par un agent de
  // recherche : aucun plafond ici (la validation à la saisie, ajoutée dans
  // app/dashboard/planning/nouveau/page.tsx, ne protège pas une valeur déjà
  // en base avant ce correctif, ni un futur chemin d'écriture qui la
  // contournerait). On plafonne la hauteur du bloc à l'espace RÉELLEMENT
  // disponible sous son point de départ dans la grille visible, plutôt
  // qu'à une valeur fixe — un rendez-vous démarrant tard dans la journée a
  // moins de marge qu'un qui démarre tôt.
  //
  // Relecture indépendante (10/09) — repéré à raison : le "Math.max(…, 44)"
  // ci-dessous replafonne l'espace disponible à 44px même quand il en
  // reste moins (un événement commençant dans les toutes dernières minutes
  // de la grille affichée). Ce n'est PAS un oubli : les deux contraintes
  // (jamais déborder / toujours au moins 44px, cible tactile) sont
  // mathématiquement incompatibles quand il reste moins de 44px sous le
  // point de départ — impossible de garantir les deux à la fois. Même
  // arbitrage déjà assumé juste au-dessus pour un rendez-vous très court
  // (déborde plutôt que d'être intouchable) : ici, le débordement résiduel
  // est borné à 44px maximum, dans le cas le plus rare possible (dernières
  // minutes de la grille), contre plusieurs centaines de px n'importe où
  // dans la journée avant ce correctif — net progrès, pas une élimination
  // totale du débordement.
  const hauteurMaxDisponible = Math.max(nombreHeures * HAUTEUR_HEURE - top, 44);
  const hauteur = Math.min(Math.max((dureeMin / 60) * HAUTEUR_HEURE, 44), hauteurMaxDisponible);

  const couleur = evenement.demandes?.priorite
    ? COULEUR_PRIORITE[evenement.demandes.priorite]
    : COULEUR_TACHE_SANS_PROJET;

  const typeChantier = evenement.demandes?.type_chantier;
  const alerteMeteo =
    !!meteo?.risque && !!typeChantier && TYPES_CHANTIER_METEO_SENSIBLES.includes(typeChantier);

  const termine = evenement.statut === "termine";
  // Audit Cycle 2 (Agent Artisan terrain) : le statut "annule" existe dans
  // le schéma et est déjà filtré partout (dashboard, résumé IA), mais rien
  // ne permettait de le poser depuis l'interface — seul "Supprimer" (perte
  // de trace) ou "Modifier" (confond report et annulation) existaient.
  const annule = evenement.statut === "annule";

  // 27/09 — les trois actions sont partagées avec l'agenda du téléphone
  // (voir actionsEvenement.ts).
  async function agir(action: () => Promise<boolean>) {
    setEnCours(true);
    setErreur(false);
    const ok = await action();
    setEnCours(false);
    if (!ok) {
      setErreur(true);
      return;
    }
    setMenuOuvert(false);
    router.refresh();
  }
  const basculerTermine = () => agir(() => changerStatutEvenement(supabase, evenement.id, termine ? "a_faire" : "termine"));
  const annuler = () => agir(() => changerStatutEvenement(supabase, evenement.id, "annule"));
  function supprimer() {
    if (!window.confirm(`Supprimer "${evenement.titre}" ?`)) return;
    agir(() => supprimerEvenement(supabase, evenement.id));
  }

  const { colonne, totalColonnes } = placement;
  const style =
    totalColonnes > 1
      ? {
          top,
          left: `calc(${(100 / totalColonnes) * colonne}% + 2px)`,
          width: `calc(${100 / totalColonnes}% - 4px)`,
        }
      : { top };

  return (
    <div
      className={totalColonnes > 1 ? "absolute z-10" : "absolute left-1 right-1 z-10"}
      style={style}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOuvert(!menuOuvert);
        }}
        style={{ height: hauteur }}
        className={`w-full text-left px-2 py-1 border-l-4 text-white text-[11px] leading-tight overflow-hidden rounded-md transition-all duration-150 hover:brightness-110 hover:shadow-sm ${couleur} ${
          termine ? "opacity-40 line-through" : ""
        } ${annule ? "opacity-35 line-through italic" : ""}`}
        title={
          alerteMeteo
            ? `⚠️ Météo à risque (${meteo?.resume}) — ${evenement.titre}`
            : evenement.titre
        }
      >
        <span className="font-mono opacity-80">
          {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>{" "}
        {alerteMeteo && <span aria-hidden>⚠️ </span>}
        {evenement.titre}
      </button>

      {menuOuvert && (
        <>
          {/* Fond transparent pour fermer le menu au clic ailleurs */}
          <div className="fixed inset-0 z-20" onClick={() => setMenuOuvert(false)} />
          {/* Sprint Robustesse (30/08) — la grille reste scrollable telle
              quelle (la refaire en liste empilée était trop risqué vu le
              positionnement absolu basé sur les heures, potentiel de
              régression visuelle élevé) mais ce menu contextuel, lui, est
              sans risque à agrandir : py-2 (~32px de haut) passe à min-h-11
              (44px, norme tactile Apple/Google) avec le texte centré
              verticalement via flex, pour absorber l'imprécision du doigt
              sur un écran de chantier. */}
          <div
            className={`absolute z-30 rounded-xl bg-surface border border-ink/15 shadow-lg overflow-hidden text-xs w-44 ${
              alignMenuADroite ? "right-0" : "left-0"
            } ${alignMenuEnHaut ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            {/* 26/09 (lot D) — plus seulement la météo : la feuille « Message
                au client » propose retard, rappel, décalage… et le message
                météo en premier quand l'alerte est active. */}
            {evenement.demande_id && (
              <button
                onClick={() => {
                  setMenuOuvert(false);
                  setMessageOuvert(true);
                }}
                className="w-full min-h-12 flex items-center text-left px-3 py-2 transition-colors hover:bg-paper text-ink font-medium border-b border-ink/5"
              >
                {alerteMeteo ? "⚠️ " : ""}Prévenir le client
              </button>
            )}
            {evenement.demande_id && (
              <button
                onClick={() => router.push(`/dashboard/demandes/${evenement.demande_id}`)}
                className="w-full min-h-11 flex items-center text-left px-3 py-2 transition-colors hover:bg-paper text-ink/80 border-b border-ink/5"
              >
                → Ouvrir le projet
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/planning/nouveau?eventId=${evenement.id}`)}
              className="w-full min-h-11 flex items-center text-left px-3 py-2 transition-colors hover:bg-paper text-ink/80 border-b border-ink/5"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={basculerTermine}
              disabled={enCours || annule}
              className="w-full min-h-11 flex items-center text-left px-3 py-2 transition-colors hover:bg-paper text-ink/80 border-b border-ink/5 disabled:opacity-40"
            >
              {termine ? "Marquer à faire" : "✓ Marquer terminé"}
            </button>
            {!annule && (
              <button
                onClick={annuler}
                disabled={enCours}
                className="w-full min-h-11 flex items-center text-left px-3 py-2 transition-colors hover:bg-paper text-ink/80 border-b border-ink/5"
              >
                ✕ Annuler ce rendez-vous
              </button>
            )}
            <button
              onClick={supprimer}
              disabled={enCours}
              className="w-full min-h-11 flex items-center text-left px-3 py-2 transition-colors hover:bg-signal/10 text-signal"
            >
              🗑 Supprimer
            </button>
            {erreur && (
              <p className="px-3 py-2 text-[10px] text-signal border-t border-ink/5">
                Échec de l&apos;action. Réessayez.
              </p>
            )}
          </div>
        </>
      )}

      {evenement.demande_id && (
        <FeuilleMessageClient
          ouverte={messageOuvert}
          surFermer={() => setMessageOuvert(false)}
          demandeId={evenement.demande_id}
          meteo={alerteMeteo ? { dateRdv: evenement.date_heure, resume: meteo?.resume ?? null } : null}
        />
      )}
    </div>
  );
}

export function GrilleAgenda({
  jours,
  evenements,
  meteoParJour,
}: {
  jours: Date[];
  evenements: EvenementAvecProjet[];
  meteoParJour?: Record<string, RisqueMeteoJour>;
}) {
  // On élargit la plage par défaut si un événement tombe avant 7h ou après
  // 20h, pour ne jamais rendre un rendez-vous invisible (voir commentaire
  // plus haut). Le cas normal (rien d'inhabituel dans la semaine) garde la
  // plage compacte 7h-20h, sans scroll superflu.
  const heureDebut = Math.min(
    HEURE_DEBUT_DEFAUT,
    ...evenements.map((e) => new Date(e.date_heure).getHours())
  );
  const heureFin = Math.max(
    HEURE_FIN_DEFAUT,
    ...evenements.map((e) => new Date(e.date_heure).getHours())
  );
  const heures = Array.from(
    { length: heureFin - heureDebut + 1 },
    (_, i) => heureDebut + i
  );

  return (
    <div className="rounded-2xl border border-ink/10 bg-surface overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-ink/10">
          <div />
          {jours.map((jour) => {
            const estAujourdhui = estMemeJour(jour, new Date());
            const passe = estPasse(jour);
            return (
              <div
                key={jour.toISOString()}
                className={`px-2 py-3 text-center border-l border-ink/10 ${
                  estAujourdhui ? "bg-paper" : ""
                } ${passe ? "opacity-45" : ""}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
                  {jour.toLocaleDateString("fr-FR", { weekday: "short" })}
                </p>
                <p
                  className={`mt-0.5 text-sm ${
                    estAujourdhui ? "font-semibold text-signal" : "text-ink/70"
                  }`}
                >
                  {jour.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
          <div>
            {heures.map((h) => (
              <div
                key={h}
                style={{ height: HAUTEUR_HEURE }}
                className="text-right pr-2 -translate-y-2"
              >
                <span className="font-mono text-[10px] text-ink/40">{h}h</span>
              </div>
            ))}
          </div>

          {jours.map((jour, indexJour) => {
            const evenementsJour = evenements.filter((e) => estMemeJour(new Date(e.date_heure), jour));
            const placements = disposerEvenementsDuJour(evenementsJour);
            // Trouvé pendant la chasse aux "frères" du bug CentreNotifications
            // (10/09) : le menu contextuel d'un bloc RDV (voir BlocEvenement,
            // menuOuvert) était toujours en flux normal ("relative"), donc
            // toujours ouvert vers la DROITE du bloc — invisible ou hors
            // écran pour un événement dans une des dernières colonnes du
            // planning (jeudi-dimanche selon la largeur de fenêtre). Pas
            // "toujours cassé" comme le bug notifications, juste pour les
            // colonnes proches du bord droit — ce qui explique qu'il soit
            // passé inaperçu. Les deux dernières colonnes ouvrent désormais
            // leur menu vers la gauche à la place (voir alignMenuADroite).
            const alignMenuADroite = indexJour >= jours.length - 2;
            return (
              <div
                key={jour.toISOString()}
                className={`relative border-l border-ink/10 ${
                  estPasse(jour) ? "bg-ink/[0.02]" : ""
                }`}
                style={{ height: HAUTEUR_HEURE * heures.length }}
              >
                {heures.map((h) => (
                  <div
                    key={h}
                    className="border-t border-ink/5"
                    style={{ height: HAUTEUR_HEURE }}
                  />
                ))}

                {evenementsJour.map((e) => (
                  <BlocEvenement
                    key={e.id}
                    evenement={e}
                    heureDebut={heureDebut}
                    nombreHeures={heures.length}
                    meteo={meteoParJour?.[cleDateLocale(jour)]}
                    placement={placements.get(e.id) ?? { colonne: 0, totalColonnes: 1 }}
                    alignMenuADroite={alignMenuADroite}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
