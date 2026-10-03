"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { EvenementPlanning, ImportanceNote, Note } from "@/types";
import type { Action, IdAction, ProchaineAction } from "./prochaineAction";
import { dateRdv } from "./prochaineAction";
import { IconeCalendrier, IconeChevron, IconeCoche, IconeCrayon, IconeDocument, IconeEtincelle, IconeMicro, IconePhoto } from "./icones";

// ============================================================
// Les blocs du « Point » (24/09) : Maintenant, À faire, À retenir, Dossier.
//
// Leur taille ne dépend pas de l'âge du chantier : une phrase et un
// bouton, les seules tâches encore ouvertes, un mémo court, deux ou trois
// lignes d'argent. Tout ce qui s'accumule avec le temps va dans le Carnet.
//
// Refonte (03/10, duel D lot 1) — le fichier passe sous les règles 3, 4, 9
// et 17 de docs/langage-interface.md : cinq tailles de texte au lieu de
// neuf, deux tons (encre et acier) au lieu des opacités, icônes en encre
// (le terracotta est réservé au « + » et au mot d'alerte), et plus aucune
// cible de 28 px (`min-h-0 py-1`) : tout ce qui se touche fait 48 px.
// ============================================================

/** Le focus se voit, en encre (règle 18). */
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
/** Bouton texte (règle 6). */
export const BOUTON_TEXTE = `inline-flex min-h-12 items-center justify-center gap-2 px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 disabled:opacity-60 ${FOCUS}`;
/** Bouton en contour (règle 6). */
export const BOUTON_CONTOUR = `inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold text-ink ring-1 ring-inset ring-ink/60 active:bg-ink/10 motion-safe:transition-colors disabled:opacity-60 ${FOCUS}`;
/** Le bloc (règle 8) : même fond, même filet, même rayon que la ligne,
 *  sans ombre. */
const BLOC = "rounded-2xl bg-surface p-5 ring-1 ring-ink/15 sm:p-6";

function Titre({ children, compte, action }: { children: ReactNode; compte?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold text-ink">
        {children}
        {compte !== undefined && compte > 0 && <span className="ml-2 font-sans text-sm font-normal tabular-nums text-steel">{compte}</span>}
      </h2>
      {action}
    </div>
  );
}

function Roue({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <span className={`${className} shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin`} aria-hidden />;
}

// ------------------------------------------------------------ La bande

/** Refonte (03/10, duel D lot 2) — Photo · Dicter · Note, sous
 *  « Maintenant », à mi-hauteur de l'écran, sous le pouce : trois gestes
 *  directs au lieu de « [+] puis choisir ». Elle remplace le « + Ajouter »
 *  du Carnet et l'« Ajouter » d'À faire ; le [+] de la barre du bas reste
 *  « Ajouter » (décision du 26/09).
 *
 *  « Photo » est une étiquette du champ de l'appareil, posé hors des
 *  feuilles (voir PhotosProjet.tsx) : un appui ouvre l'appareil arrière.
 *  Sur un chantier en cours, c'est l'action la plus probable : elle est le
 *  bouton plein de l'écran (et « Maintenant » n'en a pas). */
export function BandeAjout({
  idChampPhoto,
  photoPleine,
  envoiPhotos,
  surDicter,
  surNote,
}: {
  idChampPhoto: string;
  photoPleine: boolean;
  envoiPhotos: boolean;
  surDicter: () => void;
  surNote: () => void;
}) {
  const tuile = `flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-semibold motion-safe:transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-full sm:px-5 ${FOCUS}`;
  const contour = "bg-surface text-ink ring-1 ring-ink/15 active:bg-ink/10 sm:hover:bg-ink/5";
  const plein = "bg-ink text-paper active:bg-ink/80";
  return (
    <div role="group" aria-label="Ajouter au projet" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
      <label
        htmlFor={idChampPhoto}
        role="button"
        tabIndex={0}
        aria-disabled={envoiPhotos}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          document.getElementById(idChampPhoto)?.click();
        }}
        className={`${tuile} ${photoPleine ? plein : contour} cursor-pointer ${envoiPhotos ? "pointer-events-none opacity-60" : ""}`}
      >
        {envoiPhotos ? <Roue className="h-6 w-6 sm:h-5 sm:w-5" /> : <IconePhoto className="h-6 w-6 sm:h-5 sm:w-5" />}
        Photo
      </label>
      <button type="button" onClick={surDicter} className={`${tuile} ${contour}`}>
        <IconeMicro className="h-6 w-6 sm:h-5 sm:w-5" />
        Dicter
      </button>
      <button type="button" onClick={surNote} className={`${tuile} ${contour}`}>
        <IconeCrayon className="h-6 w-6 sm:h-5 sm:w-5" />
        Note
      </button>
    </div>
  );
}

// ------------------------------------------------------------ Maintenant

// Ce que fait l'IA, en une ligne, sous le bouton qui la lance : on sait
// qu'on relira avant que rien ne parte (règle 2 : une ligne suffit).
const CE_QUE_FAIT_L_IA: Partial<Record<IdAction, string>> = {
  generer_devis: "Vous relisez avant l'envoi.",
  mettre_a_jour_devis: "Vous relisez avant l'envoi.",
  relancer: "Vous relisez avant l'envoi.",
  analyser: "L'IA résume vos notes.",
};

/** Le libellé d'une action, avec l'étincelle quand c'est l'IA. */
function LibelleAction({ libelle, ia }: { libelle: string; ia?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {ia && <IconeEtincelle className="h-5 w-5 shrink-0" />}
      <span className="truncate">{libelle}</span>
    </span>
  );
}

/** Une action secondaire : en texte sous un bouton plein, en contour quand
 *  elle est seule. */
function BoutonAction({
  action,
  genre,
  chargement,
  surAction,
  className = "",
}: {
  action: Action;
  genre: "texte" | "contour";
  chargement?: boolean;
  surAction: (id: IdAction) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => surAction(action.id)}
      disabled={chargement}
      className={`${genre === "texte" ? BOUTON_TEXTE : BOUTON_CONTOUR} ${className}`}
    >
      {chargement && <Roue />}
      <LibelleAction libelle={action.libelle} ia={action.ia} />
    </button>
  );
}

export function Maintenant({
  point,
  surAction,
  chargement,
  erreur,
  propositions,
}: {
  point: ProchaineAction;
  surAction: (id: IdAction) => void;
  chargement: Partial<Record<IdAction, boolean>>;
  erreur: string | null;
  /** Ce que l'IA propose et qui attend une réponse (urgence, tâches). */
  propositions?: ReactNode;
}) {
  const { principale, secondaire, alerte } = point;
  return (
    <section aria-labelledby="titre-maintenant" className={BLOC}>
      <h2 id="titre-maintenant" className="sr-only">
        Maintenant
      </h2>
      <p className="truncate font-display text-xl font-semibold text-ink">{point.phrase}</p>
      {point.details.length > 0 && <p className="mt-1 truncate text-sm text-steel">{point.details.join(" · ")}</p>}

      {/* Refonte (03/10, duel D lot 3) — juste après une capture : « Bien
          reçu » en un appui, par SMS (plein) ou WhatsApp, au numéro du
          client ; le texte part dans la messagerie de l'artisan, qui
          envoie lui-même. */}
      {point.accuse && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => surAction("accuse_sms")}
            className={`min-h-14 rounded-2xl bg-ink text-base font-semibold text-paper active:bg-ink/80 ${FOCUS}`}
          >
            SMS
          </button>
          <button type="button" onClick={() => surAction("accuse_whatsapp")} className={`${BOUTON_CONTOUR} min-h-14`}>
            WhatsApp
          </button>
        </div>
      )}

      {/* Au plus un bouton plein, sur toute la largeur et sous le pouce,
          et un bouton texte dessous (règle 5). Le reste est dans « … ». */}
      {(principale || secondaire) && (
        <div className={`${point.accuse ? "mt-1" : "mt-4"} flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3`}>
          {principale && (
            <Button
              onClick={() => surAction(principale.id)}
              loading={chargement[principale.id]}
              className="min-h-14 w-full sm:w-auto"
            >
              <LibelleAction libelle={principale.libelle} ia={principale.ia} />
            </Button>
          )}
          {principale?.ia && CE_QUE_FAIT_L_IA[principale.id] && (
            <p className="truncate pt-1 text-center text-sm text-steel sm:order-last sm:w-full sm:pt-0 sm:text-left">
              {CE_QUE_FAIT_L_IA[principale.id]}
            </p>
          )}
          {secondaire && (
            <BoutonAction
              action={secondaire}
              genre={principale || point.accuse ? "texte" : "contour"}
              chargement={chargement[secondaire.id]}
              surAction={surAction}
              className={principale || point.accuse ? "self-center sm:self-auto" : "w-full sm:w-auto"}
            />
          )}
        </div>
      )}

      {/* Un point qui demande une décision : un point orange, une ligne, et
          son action en bouton texte. */}
      {alerte && (
        <div className="mt-4 border-t border-ink/15 pt-3">
          <p className="flex items-center gap-2 text-sm text-ink">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-alerte-orange" />
            <span className="truncate">{alerte.texte}</span>
          </p>
          <BoutonAction
            action={alerte.action}
            genre="texte"
            chargement={chargement[alerte.action.id]}
            surAction={surAction}
            className="-ml-3"
          />
        </div>
      )}

      <div aria-live="polite">
        {erreur && <p className="mt-3 text-sm font-semibold text-signal-fonce dark:text-signal-clair">{erreur}</p>}
      </div>
      {propositions}
    </section>
  );
}

// ------------------------------------------------------------ À faire

const formatRappel = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Le point d'importance, en tokens (règle 10 : aucun hexadécimal). Une
// tâche ordinaire n'a pas de point : seul ce qui presse se signale.
const POINT_IMPORTANCE: Partial<Record<ImportanceNote, string>> = {
  rouge: "bg-signal-fonce dark:bg-signal-clair",
  orange: "bg-alerte-orange",
};

function LigneTache({ note, surCocher }: { note: Note; surCocher: () => void }) {
  const [ouverte, setOuverte] = useState(false);
  const enRetard = note.rappel_a ? new Date(note.rappel_a).getTime() < Date.now() : false;
  const point = POINT_IMPORTANCE[note.importance];
  const contenu = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {point && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${point}`} />}
        <span className="truncate text-base text-ink">{note.titre}</span>
      </span>
      {note.rappel_a && (
        <span className="block truncate text-sm text-steel">
          {enRetard ? <span className="font-semibold text-signal-fonce dark:text-signal-clair">Retard</span> : "Rappel"}
          {" · "}
          {formatRappel.format(new Date(note.rappel_a)).replace(":", " h ")}
        </span>
      )}
    </>
  );
  return (
    <li className="py-1">
      <div className="flex items-center gap-1">
        {/* Un rond de 24 px dans une cible de 48 (règle 17). */}
        <button
          type="button"
          onClick={surCocher}
          aria-label={`Fait : ${note.titre}`}
          className={`group -ml-3 grid h-12 w-12 shrink-0 place-items-center rounded-full ${FOCUS}`}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-ink/40 text-transparent motion-safe:transition-colors group-active:border-succes group-active:text-succes sm:group-hover:border-succes sm:group-hover:text-succes">
            <IconeCoche className="h-3.5 w-3.5" />
          </span>
        </button>
        {note.description ? (
          <button
            type="button"
            onClick={() => setOuverte((v) => !v)}
            aria-expanded={ouverte}
            className={`flex min-h-12 min-w-0 flex-1 flex-col justify-center rounded-xl text-left ${FOCUS}`}
          >
            {contenu}
          </button>
        ) : (
          <div className="flex min-h-12 min-w-0 flex-1 flex-col justify-center">{contenu}</div>
        )}
      </div>
      {ouverte && note.description && <p className="pb-2 pl-11 whitespace-pre-line text-sm text-steel">{note.description}</p>}
    </li>
  );
}

export function AFaire({
  rdvAVenir,
  taches,
  surTerminer,
  aVerifier,
  proposition,
}: {
  rdvAVenir: EvenementPlanning[];
  taches: Note[];
  surTerminer: (id: string, terminee: boolean) => void;
  /** Avant le devis seulement : « À vérifier avant de chiffrer · N », une
   *  ligne qui ouvre la feuille (la demande, puis les trois listes). */
  aVerifier: { nombre: number; surOuvrir: () => void } | null;
  proposition?: ReactNode;
}) {
  // La dernière tâche cochée, le temps de pouvoir revenir en arrière : un
  // doigt qui glisse sur le téléphone ne doit rien faire disparaître.
  // Refonte (03/10) — règle 16 : la trace « Fait : … · Annuler » reste
  // jusqu'à ce qu'on coche autre chose ou qu'on quitte l'écran, sans
  // minuteur (6 s ne suffisaient pas à lire, avec des gants).
  const [cochee, setCochee] = useState<{ id: string; titre: string } | null>(null);
  const cocher = (note: Note) => {
    surTerminer(note.id, true);
    setCochee({ id: note.id, titre: note.titre });
  };
  const annuler = () => {
    if (!cochee) return;
    surTerminer(cochee.id, false);
    setCochee(null);
  };
  const total = rdvAVenir.length + taches.length;
  const nbConseils = aVerifier?.nombre ?? 0;

  // Refonte (03/10, duel D lot 2) — un bloc vide ne s'affiche pas (règle
  // 12), sur ordinateur non plus : son « Ajouter » est parti, on ajoute par
  // la bande Photo · Dicter · Note ou par le [+].
  if (total === 0 && nbConseils === 0 && !cochee && !proposition) return null;

  return (
    <section aria-label="À faire" className={BLOC}>
      {(total > 0 || proposition || cochee) && <Titre compte={total}>À faire</Titre>}

      {proposition}

      {total > 0 && (
        <ul className="mt-1 divide-y divide-ink/15">
          {rdvAVenir.map((r) => (
            <li key={r.id} className="py-1">
              <Link
                href={`/dashboard/planning/nouveau?eventId=${r.id}`}
                className={`flex min-h-12 items-center gap-1 rounded-xl active:bg-ink/10 sm:hover:bg-ink/5 ${FOCUS}`}
              >
                <span className="-ml-3 grid h-12 w-12 shrink-0 place-items-center">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/10 text-ink">
                    <IconeCalendrier className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base text-ink">{r.titre}</span>
                  <span className="block truncate text-sm text-steel">{dateRdv(r.date_heure)}</span>
                </span>
              </Link>
            </li>
          ))}
          {taches.map((n) => (
            <LigneTache key={n.id} note={n} surCocher={() => cocher(n)} />
          ))}
        </ul>
      )}

      <div aria-live="polite">
        {cochee && (
          <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl bg-succes/10 pl-4 text-sm text-ink">
            <IconeCoche className="h-4 w-4 shrink-0 text-succes" />
            <p className="min-w-0 flex-1 truncate">Fait : {cochee.titre}</p>
            <button type="button" onClick={annuler} className={`shrink-0 ${BOUTON_TEXTE}`}>
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Greffe C (duel D, lot 3) — « Avant de chiffrer » tient en une
          ligne ; la feuille montre la demande puis les trois listes. */}
      {aVerifier && nbConseils > 0 && (
        <button
          type="button"
          onClick={aVerifier.surOuvrir}
          className={`${total > 0 || cochee ? "mt-2 border-t border-ink/15" : "mt-1"} -mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left active:bg-ink/10 sm:hover:bg-ink/5 ${FOCUS}`}
        >
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
            À vérifier avant de chiffrer <span className="font-normal tabular-nums text-steel">· {nbConseils}</span>
          </span>
          <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
        </button>
      )}
    </section>
  );
}

/** Une des trois listes « avant de chiffrer ». */
export function ListeConseils({ titre, lignes }: { titre: string; lignes: string[] }) {
  return (
    <div>
      <p className="text-sm text-steel">{titre}</p>
      <ul className="mt-1 space-y-1 text-base text-ink">
        {lignes.map((l) => (
          <li key={l}>· {l}</li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------ À retenir

function ajusterHauteur(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  // scrollHeight ne compte pas les bordures : sans elles, la dernière
  // ligne serait rognée.
  el.style.height = `${Math.max(el.scrollHeight + el.offsetHeight - el.clientHeight, 72)}px`;
}

export function ARetenir({
  memo,
  surChangerMemo,
  surEnregistrerMemo,
  enregistre,
  erreur,
  focusAuMontage = false,
}: {
  memo: string;
  surChangerMemo: (v: string) => void;
  surEnregistrerMemo: () => void;
  enregistre: boolean;
  erreur: ReactNode;
  /** Ouvert par « … › Écrire à retenir » : le champ prend le focus. */
  focusAuMontage?: boolean;
}) {
  const zone = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusAuMontage) zone.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Le mémo grandit avec son texte, sans barre de défilement. La hauteur
  // se recalcule aussi quand la colonne change de largeur et quand la
  // police finit de charger : le texte ne passe plus à la ligne au même
  // endroit.
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    ajusterHauteur(el);
    let largeur = el.clientWidth;
    const obs = new ResizeObserver(() => {
      if (el.clientWidth === largeur) return;
      largeur = el.clientWidth;
      ajusterHauteur(el);
    });
    obs.observe(el);
    document.fonts?.ready.then(() => ajusterHauteur(el));
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (zone.current) ajusterHauteur(zone.current);
  }, [memo]);

  return (
    <section aria-label="À retenir" className={BLOC}>
      {/* Un succès s'écrit en encre, à côté d'une coche verte (règle 10). */}
      <Titre
        action={
          enregistre ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-ink" aria-live="polite">
              <IconeCoche className="h-4 w-4 text-succes" /> Enregistré
            </span>
          ) : undefined
        }
      >
        À retenir
      </Titre>
      <label className="mt-2 block">
        <span className="sr-only">À retenir sur ce chantier</span>
        <textarea
          ref={zone}
          value={memo}
          onChange={(e) => surChangerMemo(e.target.value)}
          onBlur={surEnregistrerMemo}
          rows={2}
          placeholder="Code du portail, mesures, choix du client…"
          className="w-full resize-none rounded-2xl bg-paper-warm px-3 py-2.5 text-base text-ink ring-1 ring-inset ring-ink/15 placeholder:text-steel focus:bg-paper focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>
      {erreur}

    </section>
  );
}

// ------------------------------------------------------------ Argent

/** Refonte (03/10, duel D lot 3) — le Dossier devient « Argent », le même
 *  mot que la 5e case (duel B) : la ligne du devis, puis la facturation
 *  entière (payée, avoir, CSV, acompte), sous l'ancre #facturation que
 *  visent « Facturer » et « Facturer un acompte ». Les photos sont dans le
 *  Carnet (« Photos · N »), le client dans « Infos du client ». Sans devis,
 *  le bloc ne s'affiche pas. */
export function Argent({
  devis,
  surOuvrirDevis,
  factures,
}: {
  devis: { numero: string; montant: string; detail: string; alerte: string | null };
  surOuvrirDevis: () => void;
  factures: ReactNode;
}) {
  return (
    <section id="facturation" aria-label="Argent" className={`${BLOC} scroll-mt-20`}>
      <Titre>Argent</Titre>
      <button
        type="button"
        onClick={surOuvrirDevis}
        className={`-mx-2 mt-1 flex min-h-16 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-ink/10 sm:hover:bg-ink/5 ${FOCUS}`}
      >
        <IconeDocument className="h-5 w-5 shrink-0 text-ink" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">Devis {devis.numero}</span>
          {devis.alerte ? (
            <span className="flex items-center gap-2 text-sm text-ink">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-alerte-orange" />
              <span className="truncate">{devis.alerte}</span>
            </span>
          ) : (
            <span className="block truncate text-sm text-steel">
              <span className="font-mono tabular-nums">{devis.montant}</span> · {devis.detail}
            </span>
          )}
        </span>
        <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
      </button>
      {factures}
    </section>
  );
}
