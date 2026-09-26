"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { COULEUR_POINT_IMPORTANCE } from "@/lib/notes";
import type { EvenementPlanning, Note } from "@/types";
import type { IdAction, ProchaineAction } from "./prochaineAction";
import { dateRdv } from "./prochaineAction";
import { IconeCalendrier, IconeChevron, IconeCoche, IconeDocument, IconeEtincelle, IconePhoto, IconePlus } from "./icones";

// ============================================================
// Les blocs du « Point » (24/09) : Maintenant, À faire, À retenir, Dossier.
//
// Leur taille ne dépend pas de l'âge du chantier : une phrase et un
// bouton, les seules tâches encore ouvertes, un mémo court, deux ou trois
// lignes d'argent. Tout ce qui s'accumule avec le temps va dans le Carnet.
// ============================================================

function Titre({ children, compte, action }: { children: ReactNode; compte?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-[15px] font-semibold text-ink">
        {children}
        {compte !== undefined && compte > 0 && <span className="ml-1.5 font-sans text-[13px] font-normal text-steel">{compte}</span>}
      </h2>
      {action}
    </div>
  );
}

// ------------------------------------------------------------ Maintenant

// Ce que fait l'IA, en une ligne, sous le bouton principal quand c'est
// elle qui travaille : on sait avant d'appuyer, et on sait qu'on relira.
const CE_QUE_FAIT_L_IA: Partial<Record<IdAction, string>> = {
  generer_devis: "L'IA chiffre avec vos notes, vos photos et vos tarifs. Vous relisez tout avant l'envoi.",
  mettre_a_jour_devis: "L'IA reprend le devis avec les nouvelles notes. Vous relisez avant l'envoi.",
  relancer: "L'IA rédige la relance. Vous la relisez avant de l'envoyer.",
  analyser: "L'IA résume vos notes et liste ce qu'il manque pour chiffrer.",
};

/** Le libellé d'une action, avec l'étincelle quand c'est l'IA. */
function LibelleAction({ libelle, ia }: { libelle: string; ia?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {ia && <IconeEtincelle className="h-4 w-4 shrink-0" />}
      {libelle}
    </span>
  );
}

const TONS: Record<ProchaineAction["ton"], string> = {
  neutre: "before:bg-ink/60",
  attente: "before:bg-steel",
  succes: "before:bg-succes",
  attention: "before:bg-signal",
};

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
  return (
    <section
      aria-labelledby="titre-maintenant"
      className={`relative overflow-hidden rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink/[0.08] before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-6 ${TONS[point.ton]}`}
    >
      <p id="titre-maintenant" className="font-mono text-[11px] uppercase tracking-[0.18em] text-steel">
        Maintenant
      </p>
      <p className="mt-2 text-balance font-display text-[1.3rem] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[1.45rem]">
        {point.phrase}
      </p>
      {point.details.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-ink/60">
          {point.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}

      {/* Sur téléphone : le bouton principal sur toute la largeur, sous le
          pouce ; les autres en dessous, plus discrets. */}
      {(point.principale || point.secondaires.length > 0) && (
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {point.principale && (
            <Button
              onClick={() => surAction(point.principale!.id)}
              loading={chargement[point.principale.id]}
              className="min-h-12 w-full justify-center sm:w-auto"
            >
              <LibelleAction libelle={point.principale.libelle} ia={point.principale.ia} />
            </Button>
          )}
          {/* Ce que va faire l'IA, juste sous le bouton qui la lance. */}
          {point.principale?.ia && CE_QUE_FAIT_L_IA[point.principale.id] && (
            <p className="-mt-1 text-[13.5px] leading-snug text-ink/65 sm:order-last sm:mt-0 sm:w-full">
              {CE_QUE_FAIT_L_IA[point.principale.id]}
            </p>
          )}
          {point.secondaires.map((a) => (
            <Button
              key={a.id}
              variant="ghost"
              onClick={() => surAction(a.id)}
              loading={chargement[a.id]}
              className="min-h-12 w-full justify-center sm:w-auto"
            >
              <LibelleAction libelle={a.libelle} ia={a.ia} />
            </Button>
          ))}
        </div>
      )}


      {point.alerte && (
        <div className="mt-4 flex flex-col items-start gap-1 rounded-xl bg-alerte-orange/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-[14px] text-ink/80">{point.alerte.texte}</p>
          <button
            type="button"
            onClick={() => surAction(point.alerte!.action.id)}
            className="-my-1 min-h-0 py-1 text-left text-[14px] font-medium text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
          >
            <LibelleAction libelle={point.alerte.action.libelle} ia={point.alerte.action.ia} />
          </button>
        </div>
      )}

      {erreur && <p className="mt-3 text-[14px] text-signal">{erreur}</p>}
      {propositions}
    </section>
  );
}

// ------------------------------------------------------------ À faire

const formatRappel = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function LigneTache({ note, surCocher }: { note: Note; surCocher: () => void }) {
  const [ouverte, setOuverte] = useState(false);
  const enRetard = note.rappel_a ? new Date(note.rappel_a).getTime() < Date.now() : false;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <button
        type="button"
        onClick={surCocher}
        aria-label={`Marquer comme fait : ${note.titre}`}
        // Zone de toucher de 44 px autour d'un cercle de 24 : les marges
        // négatives gardent la ligne à la taille du cercle.
        className="group -m-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-ink/25 text-transparent transition group-hover:border-succes group-hover:text-succes group-focus-visible:ring-2 group-focus-visible:ring-signal/50">
          <IconeCoche className="h-3.5 w-3.5" />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span aria-hidden className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${COULEUR_POINT_IMPORTANCE[note.importance]}`} />
          {note.description ? (
            <button type="button" onClick={() => setOuverte((v) => !v)} aria-expanded={ouverte} className="min-w-0 text-left text-[14.5px] leading-snug text-ink hover:underline">
              {note.titre}
            </button>
          ) : (
            <p className="min-w-0 text-[14.5px] leading-snug text-ink">{note.titre}</p>
          )}
        </div>
        {note.rappel_a && (
          <p className={`ml-3.5 mt-0.5 text-[12.5px] ${enRetard ? "font-medium text-signal" : "text-steel"}`}>
            {enRetard ? "En retard · " : "Rappel · "}
            {formatRappel.format(new Date(note.rappel_a)).replace(":", " h ")}
          </p>
        )}
        {ouverte && note.description && (
          <p className="ml-3.5 mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink/65">{note.description}</p>
        )}
      </div>
    </li>
  );
}

export function AFaire({
  rdvAVenir,
  taches,
  surTerminer,
  surAjouter,
  avantDeChiffrer,
  proposition,
}: {
  rdvAVenir: EvenementPlanning[];
  taches: Note[];
  surTerminer: (id: string, terminee: boolean) => void;
  surAjouter: () => void;
  /** Avant le devis seulement : ce que l'analyse et le métier conseillent
   *  de vérifier. Replié. */
  avantDeChiffrer: { infos: string[]; questions: string[]; checklist: string[] } | null;
  proposition?: ReactNode;
}) {
  // Ouvert d'office quand « Maintenant » annonce des points à vérifier :
  // l'artisan doit les trouver sans chercher.
  const [conseilsOuverts, setConseilsOuverts] = useState(() => (avantDeChiffrer?.infos.length ?? 0) > 0);
  // La dernière tâche cochée, le temps de pouvoir revenir en arrière : un
  // doigt qui glisse sur le téléphone ne doit rien faire disparaître.
  const [cochee, setCochee] = useState<{ id: string; titre: string } | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(minuteur.current), []);
  const cocher = (note: Note) => {
    surTerminer(note.id, true);
    setCochee({ id: note.id, titre: note.titre });
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setCochee(null), 6000);
  };
  const annuler = () => {
    if (!cochee) return;
    surTerminer(cochee.id, false);
    clearTimeout(minuteur.current);
    setCochee(null);
  };
  const total = rdvAVenir.length + taches.length;
  const nbConseils = avantDeChiffrer ? avantDeChiffrer.infos.length + avantDeChiffrer.questions.length + avantDeChiffrer.checklist.length : 0;

  return (
    // 27/09 — Vide, le bloc ne disait que « Rien en attente » : sur
    // téléphone, il laisse la place au reste (ajouter passe par le « + »).
    <section
      aria-label="À faire"
      className={`rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink/[0.08] sm:p-6 ${total === 0 && nbConseils === 0 ? "hidden sm:block" : ""}`}
    >
      <Titre
        compte={total}
        action={
          <button
            type="button"
            onClick={surAjouter}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium text-ink/60 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 [@media(pointer:coarse)]:min-h-11"
          >
            <IconePlus className="h-3.5 w-3.5" /> Ajouter
          </button>
        }
      >
        À faire
      </Titre>

      {proposition}

      {total === 0 && !proposition && !cochee && (
        <p className="mt-2 text-[14px] text-ink/45">Rien en attente sur ce chantier.</p>
      )}

      {total > 0 && (
        <ul className="mt-1 divide-y divide-ink/[0.06]">
          {rdvAVenir.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-signal/10 text-signal">
                <IconeCalendrier className="h-3.5 w-3.5" />
              </span>
              <Link href={`/dashboard/planning/nouveau?eventId=${r.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="text-[14.5px] leading-snug text-ink">{r.titre}</p>
                <p className="mt-0.5 text-[12.5px] text-steel">{dateRdv(r.date_heure)}</p>
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
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-succes/10 px-3 py-2 text-[13.5px]">
            <IconeCoche className="h-4 w-4 shrink-0 text-succes" />
            <p className="min-w-0 flex-1 truncate text-ink/80">
              Fait : {cochee.titre}
            </p>
            <button type="button" onClick={annuler} className="-my-1 min-h-0 shrink-0 py-1 font-medium text-ink underline decoration-ink/30 underline-offset-2 hover:decoration-ink">
              Annuler
            </button>
          </div>
        )}
      </div>

      {avantDeChiffrer && nbConseils > 0 && (
        <div className="mt-3 border-t border-ink/[0.07] pt-3">
          <button
            type="button"
            onClick={() => setConseilsOuverts((v) => !v)}
            aria-expanded={conseilsOuverts}
            className="flex w-full items-center gap-2 text-left text-[13.5px] font-medium text-ink/70 hover:text-ink"
          >
            <IconeChevron className={`h-4 w-4 transition-transform ${conseilsOuverts ? "rotate-90" : ""}`} />
            Avant de chiffrer
            <span className="font-normal text-steel">{nbConseils}</span>
          </button>
          {conseilsOuverts && (
            <div className="mt-2 space-y-3 pl-6 text-[14px] text-ink/75">
              {avantDeChiffrer.infos.length > 0 && (
                <div>
                  <p className="text-[12px] text-steel">Ce qui manque peut-être</p>
                  <ul className="mt-1 space-y-1">
                    {avantDeChiffrer.infos.map((i) => (
                      <li key={i}>· {i}</li>
                    ))}
                  </ul>
                </div>
              )}
              {avantDeChiffrer.questions.length > 0 && (
                <div>
                  <p className="text-[12px] text-steel">À demander au client</p>
                  <ul className="mt-1 space-y-1">
                    {avantDeChiffrer.questions.map((q) => (
                      <li key={q}>· {q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {avantDeChiffrer.checklist.length > 0 && (
                <div>
                  <p className="text-[12px] text-steel">À vérifier sur place (votre métier)</p>
                  <ul className="mt-1 space-y-1">
                    {avantDeChiffrer.checklist.map((c) => (
                      <li key={c}>· {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
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
  description,
  resumeIA,
  dateResume,
}: {
  memo: string;
  surChangerMemo: (v: string) => void;
  surEnregistrerMemo: () => void;
  enregistre: boolean;
  erreur: ReactNode;
  description: string;
  resumeIA: string | null;
  dateResume: string | null;
}) {
  const zone = useRef<HTMLTextAreaElement>(null);
  const [demandeOuverte, setDemandeOuverte] = useState(false);
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
    <section aria-label="À retenir" className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink/[0.08] sm:p-6">
      <Titre action={enregistre ? <span className="text-[12.5px] text-succes">Enregistré</span> : undefined}>À retenir</Titre>
      <label className="mt-2 block">
        <span className="sr-only">À retenir sur ce chantier</span>
        <textarea
          ref={zone}
          value={memo}
          onChange={(e) => surChangerMemo(e.target.value)}
          onBlur={surEnregistrerMemo}
          rows={2}
          placeholder="Code du portail, choix du client, mesures clés… Ce que vous voulez retrouver en un coup d'œil."
          className="w-full resize-none rounded-xl border border-transparent bg-paper-warm/60 px-3 py-2.5 text-[14.5px] leading-relaxed text-ink placeholder:text-ink/35 focus:border-signal focus:bg-paper focus:outline-none focus:ring-2 focus:ring-signal/15"
        />
      </label>
      {erreur}

      <div className="mt-4 border-t border-ink/[0.07] pt-3">
        <p className="text-[12px] text-steel">La demande</p>
        <p className={`mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink/75 ${demandeOuverte ? "" : "line-clamp-3"}`}>{description}</p>
        {description.length > 160 && (
          <button type="button" onClick={() => setDemandeOuverte((v) => !v)} className="mt-0.5 min-h-0 py-1 text-[12.5px] font-medium text-ink/55 underline decoration-ink/20 underline-offset-2 hover:text-ink">
            {demandeOuverte ? "Réduire" : "Lire tout"}
          </button>
        )}
      </div>

      {resumeIA && (
        <div className="mt-4 border-t border-ink/[0.07] pt-3">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-steel">
            <IconeEtincelle className="h-3.5 w-3.5 text-signal" />
            Résumé de vos notes{dateResume ? ` · ${new Date(dateResume).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink/75">{resumeIA}</p>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------ Dossier

export function Dossier({
  devis,
  surOuvrirDevis,
  nbPhotos,
  vignettes,
  surOuvrirPhotos,
  client,
  surModifierClient,
}: {
  devis: { numero: string; statut: { texte: string; classe: string }; montant: string; date: string | null } | null;
  surOuvrirDevis: () => void;
  nbPhotos: number;
  vignettes: string[];
  surOuvrirPhotos: () => void;
  client: { lignes: string[]; autresChantiers: number | null };
  surModifierClient: () => void;
}) {
  const ligne =
    "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50";
  return (
    <section aria-label="Dossier" className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink/[0.08] sm:p-6">
      <Titre>Dossier</Titre>
      <div className="mt-2 space-y-0.5">
        <button type="button" onClick={surOuvrirDevis} disabled={!devis} className={`${ligne} disabled:cursor-default disabled:hover:bg-transparent`}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/[0.06] text-ink/70">
            <IconeDocument className="h-4 w-4" />
          </span>
          {devis ? (
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[14.5px] font-medium text-ink">Devis {devis.numero}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${devis.statut.classe}`}>{devis.statut.texte}</span>
              </span>
              <span className="block text-[13px] text-ink/55">
                {devis.montant} TTC{devis.date ? ` · ${devis.date}` : ""}
              </span>
            </span>
          ) : (
            <span className="flex-1 text-[14px] text-ink/45">Pas encore de devis</span>
          )}
          {devis && <IconeChevron className="h-4 w-4 shrink-0 text-ink/30" />}
        </button>

        <button type="button" onClick={surOuvrirPhotos} className={ligne}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/[0.06] text-ink/70">
            <IconePhoto className="h-4 w-4" />
          </span>
          <span className="flex-1 text-[14.5px] text-ink">
            Photos <span className="text-ink/45">{nbPhotos}</span>
          </span>
          {vignettes.length > 0 && (
            <span className="flex -space-x-2" aria-hidden>
              {vignettes.slice(0, 3).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="h-7 w-7 rounded-md object-cover ring-2 ring-surface" />
              ))}
            </span>
          )}
          <IconeChevron className="h-4 w-4 shrink-0 text-ink/30" />
        </button>

        <button type="button" onClick={surModifierClient} className={ligne}>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-steel">Client</span>
            {client.lignes.length > 0 ? (
              client.lignes.map((l) => (
                <span key={l} className="block truncate text-[14px] text-ink/80">
                  {l}
                </span>
              ))
            ) : (
              <span className="block text-[14px] text-ink/45">Ajouter un téléphone, une adresse…</span>
            )}
            {client.autresChantiers !== null && client.autresChantiers > 0 && (
              <span className="mt-0.5 block text-[12.5px] text-steel">
                Déjà {client.autresChantiers} autre{client.autresChantiers > 1 ? "s" : ""} chantier{client.autresChantiers > 1 ? "s" : ""} ensemble
              </span>
            )}
          </span>
          <span className="shrink-0 text-[13px] font-medium text-ink/50">Modifier</span>
        </button>
      </div>
    </section>
  );
}
