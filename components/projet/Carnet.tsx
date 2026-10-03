"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FILTRES,
  cleJour,
  filtrerCarnet,
  grouperParPeriode,
  normaliser,
  resumePeriode,
  type EntreeCarnet,
  type FiltreCarnet,
} from "./entreesCarnet";
import {
  IconeCalendrier,
  IconeChevron,
  IconeCoche,
  IconeDocument,
  IconeEtincelle,
  IconeEuro,
  IconeLoupe,
  IconeMessage,
  IconeMicro,
  IconePhoto,
  IconePoint,
} from "./icones";

// ============================================================
// Le Carnet (24/09) — voir entreesCarnet.ts pour la logique.
//
// Ce que l'artisan voit : la semaine en cours, dépliée ; chaque mois plus
// ancien replié en une seule ligne (« Juin · 8 notes vocales · 23
// photos »). Une recherche qui ignore les accents et surligne ce qu'elle
// trouve, et quatre filtres. Un chantier d'un an tient ainsi dans le même
// écran qu'un chantier d'une semaine.
//
// Refonte (03/10, duel D lot 3) — en tête, « Photos · 12 › » ouvre la
// feuille des photos (galerie, ✕) ; la demande du client est la plus
// ancienne entrée. Règles 3, 4, 9 et 17 : tailles, encre, 48 px.
// ============================================================

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const formatHeure = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "2-digit" });
const formatJourSemaine = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
const formatJourMois = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

function heure(iso: string) {
  return formatHeure.format(new Date(iso)).replace(":", " h ");
}

function quand(iso: string, maintenant: Date): string {
  const cle = cleJour(iso);
  const aujourdhui = cleJour(maintenant.toISOString());
  if (cle === aujourdhui) return heure(iso);
  const ecart = (Date.parse(aujourdhui) - Date.parse(cle)) / 86400000;
  if (ecart < 7) return `${formatJourSemaine.format(new Date(iso))} ${heure(iso)}`;
  const annee = cle.slice(0, 4) !== aujourdhui.slice(0, 4) ? ` ${cle.slice(0, 4)}` : "";
  return `${formatJourMois.format(new Date(iso))}${annee}`;
}

/** Surligne les mots cherchés, sans tenir compte des accents ni de la
 *  casse. La correspondance se fait caractère par caractère, pour que les
 *  positions trouvées dans le texte normalisé soient les mêmes que dans
 *  le texte d'origine. */
function surligner(texte: string, mots: string[]): ReactNode {
  if (mots.length === 0) return texte;
  const plat = [...texte].map((c) => {
    const n = normaliser(c);
    return n.length === 1 ? n : c.toLowerCase().slice(0, 1) || " ";
  });
  const marque = new Array(plat.length).fill(false);
  const chaine = plat.join("");
  for (const mot of mots) {
    let i = chaine.indexOf(mot);
    while (i !== -1) {
      for (let k = i; k < i + mot.length; k++) marque[k] = true;
      i = chaine.indexOf(mot, i + mot.length);
    }
  }
  const caracteres = [...texte];
  const morceaux: ReactNode[] = [];
  let debut = 0;
  for (let i = 1; i <= caracteres.length; i++) {
    if (i === caracteres.length || marque[i] !== marque[debut]) {
      const bout = caracteres.slice(debut, i).join("");
      morceaux.push(
        marque[debut] ? (
          <mark key={debut} className="rounded-sm bg-signal/25 px-0.5 text-inherit">
            {bout}
          </mark>
        ) : (
          bout
        )
      );
      debut = i;
    }
  }
  return morceaux;
}

// Les icônes sont en encre (règle 9) ; seule la coche d'une tâche faite
// garde sa pastille verte (règle 10).
function IconeEntree({ e }: { e: EntreeCarnet }) {
  const base = "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-paper";
  const neutre = `${base} bg-ink/10 text-ink`;
  if (e.type === "vocal") return <span className={neutre}><IconeMicro className="h-4 w-4" /></span>;
  if (e.type === "photos") return <span className={neutre}><IconePhoto className="h-4 w-4" /></span>;
  if (e.type === "fait") return <span className={`${base} bg-succes/10 text-succes`}><IconeCoche className="h-4 w-4" /></span>;
  if (e.type === "rdv") return <span className={neutre}><IconeCalendrier className="h-4 w-4" /></span>;
  if (e.type === "demande") return <span className={neutre}><IconeMessage className="h-4 w-4" /></span>;
  const t = e.typeEvenement ?? "";
  if (t.startsWith("devis") || t === "analyse_ia") return <span className={neutre}><IconeDocument className="h-4 w-4" /></span>;
  if (t === "message_prepare") return <span className={neutre}><IconeMessage className="h-4 w-4" /></span>;
  if (t.startsWith("facture") || t === "avoir_cree") return <span className={neutre}><IconeEuro className="h-4 w-4" /></span>;
  return <span className={`${base} bg-paper text-steel`}><IconePoint className="h-4 w-4" /></span>;
}

const LONGUEUR_APERCU = 180;

function Entree({
  e,
  mots,
  maintenant,
  urlsPhotos,
  surOuvrirPhoto,
}: {
  e: EntreeCarnet;
  mots: string[];
  maintenant: Date;
  urlsPhotos: Record<string, string>;
  surOuvrirPhoto: (chemins: string[], index: number) => void;
}) {
  const [deplie, setDeplie] = useState(false);
  const discret = e.type === "evenement";
  const long = (e.texte?.length ?? 0) + (e.complement?.texte.length ?? 0) > LONGUEUR_APERCU;
  // Une recherche qui trouve un mot au milieu d'une longue note la montre
  // en entier : sinon, le mot trouvé serait caché derrière « Lire la suite ».
  const complet = deplie || !long || mots.length > 0;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-1">
      <IconeEntree e={e} />
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`min-w-0 truncate ${discret ? "text-sm text-steel" : "text-base font-semibold text-ink"}`}>
            {surligner(e.titre, mots)}
          </p>
          <time dateTime={e.date} className="shrink-0 font-mono text-sm tabular-nums text-steel">
            {quand(e.date, maintenant)}
          </time>
        </div>

        {e.texte && (
          <div className={`mt-1 ${discret ? "text-sm text-steel" : "text-base text-ink"}`}>
            <p className={`whitespace-pre-line ${complet ? "" : "line-clamp-3"}`}>{surligner(e.texte, mots)}</p>
          </div>
        )}
        {e.complement && complet && (
          <div className="mt-2 border-l-2 border-ink/15 pl-3">
            <p className="inline-flex items-center gap-1.5 text-sm text-steel">
              <IconeEtincelle className="h-4 w-4 text-ink" />
              {e.complement.titre}
            </p>
            <p className="mt-0.5 whitespace-pre-line text-base text-ink">{surligner(e.complement.texte, mots)}</p>
          </div>
        )}
        {long && mots.length === 0 && (
          <button
            type="button"
            onClick={() => setDeplie((v) => !v)}
            className={`-ml-3 inline-flex min-h-12 items-center px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4 ${FOCUS}`}
          >
            {deplie ? "Réduire" : "Lire la suite"}
          </button>
        )}

        {e.photos && e.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.photos.slice(0, e.photos.length > 6 ? 5 : 6).map((chemin, i) => (
              <button
                key={chemin}
                type="button"
                onClick={() => surOuvrirPhoto(e.photos!, i)}
                aria-label={`Voir la photo ${i + 1} sur ${e.photos!.length}`}
                className={`h-16 w-16 overflow-hidden rounded-2xl bg-ink/10 ring-1 ring-ink/15 active:opacity-80 sm:h-[4.5rem] sm:w-[4.5rem] ${FOCUS}`}
              >
                {urlsPhotos[chemin] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlsPhotos[chemin]} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : null}
              </button>
            ))}
            {e.photos.length > 6 && (
              <button
                type="button"
                onClick={() => surOuvrirPhoto(e.photos!, 5)}
                className={`grid h-16 w-16 place-items-center rounded-2xl bg-ink/10 text-sm font-semibold text-ink ring-1 ring-ink/15 sm:h-[4.5rem] sm:w-[4.5rem] ${FOCUS}`}
              >
                +{e.photos.length - 5}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export const ID_RECHERCHE_CARNET = "recherche-carnet";

export function Carnet({
  entrees,
  urlsPhotos,
  surOuvrirPhoto,
  maintenant,
  photos,
}: {
  entrees: EntreeCarnet[];
  urlsPhotos: Record<string, string>;
  surOuvrirPhoto: (chemins: string[], index: number) => void;
  maintenant: Date;
  /** La ligne « Photos · N › », qui ouvre la feuille des photos. */
  photos?: { nombre: number; vignettes: string[]; surOuvrir: () => void };
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreCarnet>("tout");

  const visibles = useMemo(() => filtrerCarnet(entrees, filtre, recherche), [entrees, filtre, recherche]);
  const periodes = useMemo(() => grouperParPeriode(visibles, maintenant), [visibles, maintenant]);
  const mots = useMemo(() => normaliser(recherche).split(/\s+/).filter(Boolean), [recherche]);

  // 27/09 — Demande d'Axel : tout replié à l'ouverture, pour que la fiche
  // reste propre ; chaque période s'ouvre d'un appui et montre son
  // résumé (« 3 notes vocales · 12 photos ») en attendant. Exceptions : ce
  // qu'on vient d'ajouter (note dictée, photos) s'ouvre, pour qu'on le
  // voie arriver ; et (refonte 03/10, duel D) un projet neuf, qui n'a
  // qu'une période, la montre ouverte.
  const [ouvertes, setOuvertes] = useState<Set<string>>(() => {
    const toutes = grouperParPeriode(entrees, maintenant);
    return new Set(toutes.length === 1 ? [toutes[0].cle] : []);
  });
  const nbAuDepart = useRef(entrees.length);
  useEffect(() => {
    if (entrees.length <= nbAuDepart.current) return;
    nbAuDepart.current = entrees.length;
    const premiere = grouperParPeriode(entrees, maintenant)[0];
    if (premiere) setOuvertes((o) => (o.has(premiere.cle) ? o : new Set(o).add(premiere.cle)));
  }, [entrees, maintenant]);

  // « Photos » compte les photos, pas les envois : le même nombre que la
  // ligne « Photos · N ».
  const compte = (f: FiltreCarnet) => {
    const liste = filtrerCarnet(entrees, f, "");
    return f === "photos" ? liste.reduce((n, e) => n + (e.photos?.length ?? 0), 0) : liste.length;
  };
  const cherche = mots.length > 0;

  const basculer = (cle: string) =>
    setOuvertes((o) => {
      const n = new Set(o);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  return (
    <section aria-labelledby="titre-carnet">
      <h2 id="titre-carnet" className="font-display text-xl font-semibold text-ink">
        Carnet <span className="ml-2 font-sans text-sm font-normal tabular-nums text-steel">{entrees.length}</span>
      </h2>

      {photos && photos.nombre > 0 && (
        <button
          type="button"
          onClick={photos.surOuvrir}
          className={`mt-3 flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-2 text-left ring-1 ring-ink/15 active:bg-ink/10 motion-safe:transition-colors sm:hover:bg-ink/5 ${FOCUS}`}
        >
          <IconePhoto className="h-5 w-5 shrink-0 text-ink" />
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
            Photos <span className="font-normal tabular-nums text-steel">· {photos.nombre}</span>
          </span>
          {photos.vignettes.length > 0 && (
            <span className="flex -space-x-2" aria-hidden>
              {photos.vignettes.slice(0, 3).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="h-9 w-9 rounded-xl object-cover ring-2 ring-surface" />
              ))}
            </span>
          )}
          <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
        </button>
      )}

      {entrees.length > 0 && (
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Chercher dans le carnet</span>
            <IconeLoupe className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel" />
            <input
              id={ID_RECHERCHE_CARNET}
              type="search"
              value={recherche}
              onChange={(ev) => setRecherche(ev.target.value)}
              placeholder="Chercher : mesure, code, fenêtre…"
              className="min-h-12 w-full rounded-2xl bg-surface pl-10 pr-3 text-base text-ink ring-1 ring-inset ring-ink/15 placeholder:text-steel focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </label>
          <div role="group" aria-label="Filtrer le carnet" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTRES.map((f) => {
              const n = compte(f.cle);
              const actif = filtre === f.cle;
              return (
                <button
                  key={f.cle}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => setFiltre(f.cle)}
                  disabled={n === 0 && f.cle !== "tout"}
                  className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${FOCUS} ${
                    actif ? "bg-ink text-paper" : "text-ink active:bg-ink/10 sm:hover:bg-ink/5"
                  }`}
                >
                  {f.libelle}
                  <span className={`ml-1.5 font-normal tabular-nums ${actif ? "text-paper" : "text-steel"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        {entrees.length === 0 && <p className="py-4 text-base text-steel">Rien encore.</p>}
        {entrees.length > 0 && visibles.length === 0 && (
          <p className="truncate py-6 text-center text-base text-steel">Rien ne correspond{cherche ? ` à « ${recherche.trim()} »` : ""}.</p>
        )}

        {periodes.map((p) => {
          const ouverte = cherche || ouvertes.has(p.cle);
          return (
            <div key={p.cle} className="border-t border-ink/15 first:border-t-0">
              <button
                type="button"
                onClick={() => basculer(p.cle)}
                aria-expanded={ouverte}
                disabled={cherche}
                className="group flex min-h-12 w-full items-center gap-2 py-3 text-left focus-visible:outline-none"
              >
                <IconeChevron className={`h-5 w-5 shrink-0 text-steel motion-safe:transition-transform ${ouverte ? "rotate-90" : ""} ${cherche ? "opacity-0" : ""}`} />
                <span className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-ink group-focus-visible:underline">{p.libelle}</span>
                <span className="min-w-0 truncate text-sm text-steel">{ouverte ? `${p.entrees.length}` : resumePeriode(p.entrees)}</span>
              </button>
              {ouverte && (
                <ol className="relative pb-3 pl-0">
                  <span aria-hidden className="absolute bottom-4 left-4 top-2 w-px bg-ink/15" />
                  {p.entrees.map((e) => (
                    <Entree key={e.id} e={e} mots={mots} maintenant={maintenant} urlsPhotos={urlsPhotos} surOuvrirPhoto={surOuvrirPhoto} />
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
