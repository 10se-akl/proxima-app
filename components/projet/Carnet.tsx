"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FILTRES,
  cleJour,
  filtrerCarnet,
  grouperParPeriode,
  normaliser,
  periodesOuvertesParDefaut,
  resumePeriode,
  type EntreeCarnet,
  type FiltreCarnet,
} from "./entreesCarnet";
import { IconeCalendrier, IconeChevron, IconeCoche, IconeDocument, IconeEuro, IconeLoupe, IconeMessage, IconeMicro, IconePhoto, IconePoint } from "./icones";

// ============================================================
// Le Carnet (24/09) — voir entreesCarnet.ts pour la logique.
//
// Ce que l'artisan voit : la semaine en cours, dépliée ; chaque mois plus
// ancien replié en une seule ligne (« Juin · 8 notes vocales · 23
// photos »). Une recherche qui ignore les accents et surligne ce qu'elle
// trouve, et quatre filtres. Un chantier d'un an tient ainsi dans le même
// écran qu'un chantier d'une semaine.
// ============================================================

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

function IconeEntree({ e }: { e: EntreeCarnet }) {
  const base = "grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-paper";
  if (e.type === "vocal") return <span className={`${base} bg-signal/10 text-signal`}><IconeMicro className="h-4 w-4" /></span>;
  if (e.type === "photos") return <span className={`${base} bg-ink/[0.07] text-ink/70`}><IconePhoto className="h-4 w-4" /></span>;
  if (e.type === "fait") return <span className={`${base} bg-succes/10 text-succes`}><IconeCoche className="h-4 w-4" /></span>;
  if (e.type === "rdv") return <span className={`${base} bg-ink/[0.07] text-ink/70`}><IconeCalendrier className="h-4 w-4" /></span>;
  const t = e.typeEvenement ?? "";
  if (t.startsWith("devis") || t === "analyse_ia") return <span className={`${base} bg-ink/[0.07] text-ink/70`}><IconeDocument className="h-4 w-4" /></span>;
  if (t === "message_prepare") return <span className={`${base} bg-ink/[0.07] text-ink/70`}><IconeMessage className="h-4 w-4" /></span>;
  if (t.startsWith("facture") || t === "avoir_cree") return <span className={`${base} bg-ink/[0.07] text-ink/70`}><IconeEuro className="h-4 w-4" /></span>;
  return <span className={`${base} bg-paper text-ink/35`}><IconePoint className="h-4 w-4" /></span>;
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
  const long = (e.texte?.length ?? 0) > LONGUEUR_APERCU;
  // Une recherche qui trouve un mot au milieu d'une longue note la montre
  // en entier : sinon, le mot trouvé serait caché derrière « Lire la suite ».
  const complet = deplie || !long || mots.length > 0;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-1">
      <IconeEntree e={e} />
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`min-w-0 ${discret ? "text-[13.5px] text-ink/65" : "text-[14px] font-medium text-ink"}`}>
            {surligner(e.titre, mots)}
          </p>
          <time dateTime={e.date} className="shrink-0 font-mono text-[11.5px] tabular-nums text-steel">
            {quand(e.date, maintenant)}
          </time>
        </div>

        {e.texte && (
          <div className={`mt-1 ${discret ? "text-[13px] text-ink/50" : "text-[14px] leading-relaxed text-ink/75"}`}>
            <p className={`whitespace-pre-line ${complet ? "" : "line-clamp-3"}`}>{surligner(e.texte, mots)}</p>
            {long && mots.length === 0 && (
              <button
                type="button"
                onClick={() => setDeplie((v) => !v)}
                className="mt-0.5 min-h-0 py-1 text-[12.5px] font-medium text-ink/55 underline decoration-ink/20 underline-offset-2 hover:text-ink"
              >
                {deplie ? "Réduire" : "Lire la suite"}
              </button>
            )}
          </div>
        )}

        {e.photos && e.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.photos.slice(0, e.photos.length > 6 ? 5 : 6).map((chemin, i) => (
              <button
                key={chemin}
                type="button"
                onClick={() => surOuvrirPhoto(e.photos!, i)}
                aria-label={`Voir la photo ${i + 1} sur ${e.photos!.length}`}
                className="h-16 w-16 overflow-hidden rounded-lg bg-ink/[0.06] ring-1 ring-ink/10 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 sm:h-[4.5rem] sm:w-[4.5rem]"
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
                className="grid h-16 w-16 place-items-center rounded-lg bg-ink/[0.06] text-[13px] font-medium text-ink/70 ring-1 ring-ink/10 hover:bg-ink/10 sm:h-[4.5rem] sm:w-[4.5rem]"
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

export function Carnet({
  entrees,
  urlsPhotos,
  surOuvrirPhoto,
  maintenant,
  barreAjout,
}: {
  entrees: EntreeCarnet[];
  urlsPhotos: Record<string, string>;
  surOuvrirPhoto: (chemins: string[], index: number) => void;
  maintenant: Date;
  /** Les boutons d'ajout (ordinateur) : posés en tête du Carnet. */
  barreAjout?: ReactNode;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreCarnet>("tout");

  const visibles = useMemo(() => filtrerCarnet(entrees, filtre, recherche), [entrees, filtre, recherche]);
  const periodes = useMemo(() => grouperParPeriode(visibles, maintenant), [visibles, maintenant]);
  const mots = useMemo(() => normaliser(recherche).split(/\s+/).filter(Boolean), [recherche]);

  const [ouvertes, setOuvertes] = useState<Set<string>>(() => periodesOuvertesParDefaut(grouperParPeriode(entrees, maintenant)));
  // Un nouveau contenu (note dictée, photos) doit se voir tout de suite :
  // la période la plus récente est toujours ouverte.
  useEffect(() => {
    const premiere = grouperParPeriode(entrees, maintenant)[0];
    if (premiere) setOuvertes((o) => (o.has(premiere.cle) ? o : new Set(o).add(premiere.cle)));
  }, [entrees, maintenant]);

  // « Photos » compte les photos, pas les envois : le même nombre que le
  // Dossier.
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titre-carnet" className="font-display text-lg font-semibold text-ink">
          Carnet <span className="ml-1 font-sans text-[13px] font-normal text-steel">{entrees.length}</span>
        </h2>
        {barreAjout}
      </div>

      {entrees.length > 0 && (
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Chercher dans le carnet</span>
            <IconeLoupe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <input
              type="search"
              value={recherche}
              onChange={(ev) => setRecherche(ev.target.value)}
              placeholder="Chercher : mesure, code, fenêtre…"
              className="w-full rounded-xl border border-ink/10 bg-surface py-2.5 pl-9 pr-3 text-[15px] text-ink placeholder:text-ink/35 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/15"
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
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 ${
                    actif ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {f.libelle}
                  <span className={`ml-1.5 tabular-nums ${actif ? "text-paper/60" : "text-ink/35"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        {entrees.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ink/15 px-5 py-8 text-center text-[14px] text-ink/50">
            Le carnet se remplit tout seul : notes dictées, photos, devis, rendez-vous.
          </p>
        )}
        {entrees.length > 0 && visibles.length === 0 && (
          <p className="py-6 text-center text-[14px] text-ink/50">Rien ne correspond{cherche ? ` à « ${recherche.trim()} »` : ""}.</p>
        )}

        {periodes.map((p) => {
          const ouverte = cherche || ouvertes.has(p.cle);
          return (
            <div key={p.cle} className="border-t border-ink/[0.07] first:border-t-0">
              <button
                type="button"
                onClick={() => basculer(p.cle)}
                aria-expanded={ouverte}
                disabled={cherche}
                className="group flex w-full items-center gap-2 py-3 text-left focus-visible:outline-none"
              >
                <IconeChevron className={`h-4 w-4 shrink-0 text-ink/40 transition-transform duration-200 ${ouverte ? "rotate-90" : ""} ${cherche ? "opacity-0" : ""}`} />
                <span className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-ink/70 group-focus-visible:underline">{p.libelle}</span>
                <span className="min-w-0 truncate text-[12.5px] text-steel">
                  {ouverte ? `${p.entrees.length}` : resumePeriode(p.entrees)}
                </span>
              </button>
              {ouverte && (
                <ol className="relative pb-3 pl-0">
                  <span aria-hidden className="absolute bottom-4 left-4 top-2 w-px bg-ink/10" />
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
