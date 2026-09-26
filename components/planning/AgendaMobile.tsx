"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES_CHANTIER_METEO_SENSIBLES, type RisqueMeteoJour } from "@/lib/meteo";
import { Feuille } from "@/components/projet/Feuille";
import { FeuilleMessageClient } from "@/components/projet/FeuilleMessageClient";
import { IconeChevron, IconeLieu, IconeMessage, IconeTelephone } from "@/components/projet/icones";
import {
  changerStatutEvenement,
  cleDateLocale,
  estMemeJour,
  supprimerEvenement,
  type EvenementAvecProjet,
} from "./actionsEvenement";

// ============================================================
// Le planning sur téléphone (27/09).
//
// La grille de la semaine (GrilleAgenda) faisait 700 px de large : sur un
// téléphone, on ouvrait le planning un samedi et on voyait lundi, mardi,
// mercredi — vides — avec les rendez-vous du jour hors de l'écran, en
// texte blanc de 11 px. Ici : les sept jours en une bande, la journée
// choisie en liste (l'heure en gros, le client, le quoi), et un appui sur
// un rendez-vous ouvre ce qu'on peut en faire — appeler, prévenir,
// y aller en premier. L'ordinateur garde la grille.
// ============================================================

const HEURE = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit" });
const heure = (iso: string) => HEURE.format(new Date(iso)).replace(":", "h");

function alerteMeteo(e: EvenementAvecProjet, meteo?: RisqueMeteoJour) {
  const type = e.demandes?.type_chantier;
  return !!meteo?.risque && !!type && TYPES_CHANTIER_METEO_SENSIBLES.includes(type);
}

export function AgendaMobile({
  jours,
  evenements,
  meteoParJour,
  offset,
}: {
  jours: Date[];
  evenements: EvenementAvecProjet[];
  meteoParJour?: Record<string, RisqueMeteoJour>;
  /** La semaine affichée, relative à celle d'aujourd'hui (0, -1, +1…). */
  offset: number;
}) {
  const aujourdhui = new Date();
  const [choisi, setChoisi] = useState<number>(() => {
    const i = jours.findIndex((j) => estMemeJour(j, aujourdhui));
    if (i >= 0) return i;
    const avecRdv = jours.findIndex((j) => evenements.some((e) => estMemeJour(new Date(e.date_heure), j)));
    return avecRdv >= 0 ? avecRdv : 0;
  });
  const [ouvert, setOuvert] = useState<EvenementAvecProjet | null>(null);

  const jour = jours[choisi];
  const duJour = evenements
    .filter((e) => estMemeJour(new Date(e.date_heure), jour))
    .sort((a, b) => Date.parse(a.date_heure) - Date.parse(b.date_heure));
  const meteo = meteoParJour?.[cleDateLocale(jour)];

  const moisDebut = jours[0].toLocaleDateString("fr-FR", { month: "long" });
  const moisFin = jours[6].toLocaleDateString("fr-FR", { month: "long" });
  const libelleSemaine =
    moisDebut === moisFin
      ? `${jours[0].getDate()} – ${jours[6].getDate()} ${moisFin}`
      : `${jours[0].getDate()} ${moisDebut} – ${jours[6].getDate()} ${moisFin}`;

  return (
    <div>
      {/* La semaine : précédente, suivante, et le retour à aujourd'hui. */}
      <div className="flex items-center gap-1">
        <Link
          href={`/dashboard/planning?semaine=${offset - 1}`}
          aria-label="Semaine précédente"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink/60 transition hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
        >
          <IconeChevron className="h-5 w-5 rotate-180" />
        </Link>
        <p className="min-w-0 flex-1 text-center text-[15px] font-medium text-ink">{libelleSemaine}</p>
        <Link
          href={`/dashboard/planning?semaine=${offset + 1}`}
          aria-label="Semaine suivante"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink/60 transition hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
        >
          <IconeChevron className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 min-[400px]:gap-1" role="tablist" aria-label="Jours de la semaine">
        {jours.map((j, i) => {
          const actif = i === choisi;
          const estAujourdhui = estMemeJour(j, aujourdhui);
          const nb = evenements.filter((e) => estMemeJour(new Date(e.date_heure), j) && e.statut !== "termine").length;
          return (
            <button
              key={j.toISOString()}
              type="button"
              role="tab"
              aria-selected={actif}
              aria-label={`${j.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${nb ? `, ${nb} prévu${nb > 1 ? "s" : ""}` : ""}`}
              onClick={() => setChoisi(i)}
              className={`flex min-h-[3.75rem] flex-col items-center justify-center rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                actif ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
              }`}
            >
              <span className={`text-[11px] uppercase tracking-wide ${actif ? "text-paper/70" : "text-steel"}`}>
                {j.toLocaleDateString("fr-FR", { weekday: "narrow" })}
              </span>
              <span
                className={`text-[17px] font-semibold tabular-nums ${
                  !actif && estAujourdhui ? "text-signal-fonce dark:text-signal-clair" : ""
                }`}
              >
                {j.getDate()}
              </span>
              <span
                aria-hidden
                className={`mt-0.5 h-1 w-1 rounded-full ${nb ? (actif ? "bg-paper" : "bg-signal") : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>

      {offset !== 0 && (
        <Link
          href="/dashboard/planning"
          className="mt-2 inline-flex min-h-11 items-center text-[14px] font-medium text-ink/70 underline underline-offset-4"
        >
          Revenir à aujourd&apos;hui
        </Link>
      )}

      <h2 className="mt-5 font-display text-[17px] font-semibold text-ink first-letter:uppercase">
        {estMemeJour(jour, aujourdhui)
          ? "Aujourd'hui"
          : jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </h2>

      {duJour.length === 0 ? (
        <p className="mt-3 text-[15px] text-ink/60">Rien de prévu.</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-2">
          {duJour.map((e) => {
            const fait = e.statut === "termine";
            const qui = e.demandes?.nom_client;
            const meteoRisque = alerteMeteo(e, meteo);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOuvert(e)}
                  className={`flex w-full min-h-16 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-ink/[0.07] transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                    fait ? "opacity-55" : ""
                  }`}
                >
                  <span className="w-14 shrink-0 font-mono text-[15px] font-medium tabular-nums text-ink">{heure(e.date_heure)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[16px] font-semibold text-ink ${fait ? "line-through" : ""}`}>
                      {qui ?? e.titre}
                    </span>
                    <span className="block truncate text-[14px] text-ink/65">
                      {/* Le quoi, puis le où : ce qu'il faut savoir en partant. */}
                      {[fait ? "Fait" : null, qui ? e.titre : e.type === "tache" ? "Rappel" : "Rendez-vous", e.demandes?.adresse_client]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {meteoRisque && !fait && (
                      <span className="mt-0.5 block truncate text-[13px] font-medium text-signal-fonce dark:text-signal-clair">
                        Météo à risque{meteo?.resume ? ` · ${meteo.resume}` : ""}
                      </span>
                    )}
                  </span>
                  <IconeChevron className="h-4 w-4 shrink-0 text-ink/35" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {ouvert && (
        <ActionsEvenement
          evenement={ouvert}
          meteo={alerteMeteo(ouvert, meteoParJour?.[cleDateLocale(new Date(ouvert.date_heure))]) ? meteoParJour?.[cleDateLocale(new Date(ouvert.date_heure))] : undefined}
          surFermer={() => setOuvert(null)}
        />
      )}
    </div>
  );
}

function ActionsEvenement({
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

  const fait = evenement.statut === "termine";
  const telephone = evenement.demandes?.telephone_client;
  const adresse = evenement.demandes?.adresse_client;
  const titre = `${heure(evenement.date_heure)} · ${evenement.demandes?.nom_client ?? evenement.titre}`;

  async function agir(action: () => Promise<boolean>) {
    setEnCours(true);
    setErreur(false);
    const ok = await action();
    setEnCours(false);
    if (!ok) {
      setErreur(true);
      return;
    }
    surFermer();
    router.refresh();
  }

  const grandBouton =
    "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface text-[14px] font-medium text-ink ring-1 ring-ink/10 transition hover:ring-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50";
  const ligne =
    "flex w-full min-h-14 items-center justify-between gap-3 border-b border-ink/[0.07] text-left text-[16px] text-ink transition-colors last:border-b-0 hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/50";

  return (
    <>
      <Feuille ouverte={!messageOuvert} titre={titre} surFermer={surFermer}>
        {evenement.demande_id && (
          <div className="grid grid-cols-3 gap-2">
            {telephone ? (
              <a href={`tel:${telephone.replace(/\s/g, "")}`} className={grandBouton}>
                <IconeTelephone className="h-5 w-5 text-signal" /> Appeler
              </a>
            ) : (
              <span className={`${grandBouton} opacity-40`} aria-disabled>
                <IconeTelephone className="h-5 w-5" /> Appeler
              </span>
            )}
            <button type="button" onClick={() => setMessageOuvert(true)} className={grandBouton}>
              <IconeMessage className="h-5 w-5 text-signal" />
              {meteo ? "Prévenir" : "Message"}
            </button>
            {adresse ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={grandBouton}
              >
                <IconeLieu className="h-5 w-5 text-signal" /> Itinéraire
              </a>
            ) : (
              <span className={`${grandBouton} opacity-40`} aria-disabled>
                <IconeLieu className="h-5 w-5" /> Itinéraire
              </span>
            )}
          </div>
        )}
        {meteo && (
          <p className="mt-3 text-[14px] text-signal-fonce dark:text-signal-clair">
            Météo à risque ce jour-là{meteo.resume ? ` : ${meteo.resume}` : ""}.
          </p>
        )}

        <div className="mt-3">
          <button
            type="button"
            disabled={enCours}
            onClick={() => agir(() => changerStatutEvenement(supabase, evenement.id, fait ? "a_faire" : "termine"))}
            className={ligne}
          >
            {fait ? "Remettre à faire" : "C'est fait"}
            <IconeChevron className="h-4 w-4 text-ink/30" />
          </button>
          {evenement.demande_id && (
            <Link href={`/dashboard/demandes/${evenement.demande_id}`} className={ligne}>
              Ouvrir le projet
              <IconeChevron className="h-4 w-4 text-ink/30" />
            </Link>
          )}
          <Link href={`/dashboard/planning/nouveau?eventId=${evenement.id}`} className={ligne}>
            Modifier ou déplacer
            <IconeChevron className="h-4 w-4 text-ink/30" />
          </Link>
        </div>

        {/* Les gestes rares et définitifs, à l'écart. */}
        <div className="mt-4 flex flex-wrap gap-x-6">
          {evenement.statut !== "annule" && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => agir(() => changerStatutEvenement(supabase, evenement.id, "annule"))}
              className="inline-flex min-h-12 items-center text-[14px] text-ink/60 underline underline-offset-4"
            >
              Annuler le rendez-vous
            </button>
          )}
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (window.confirm(`Supprimer « ${evenement.titre} » ?`)) agir(() => supprimerEvenement(supabase, evenement.id));
            }}
            className="inline-flex min-h-12 items-center text-[14px] text-signal-fonce underline underline-offset-4 dark:text-signal-clair"
          >
            Supprimer
          </button>
        </div>
        {erreur && <p className="mt-2 text-[14px] text-signal-fonce dark:text-signal-clair">Pas enregistré. Réessayez.</p>}
      </Feuille>

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
