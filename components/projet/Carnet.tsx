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
  IconeCrayon,
  IconeDocument,
  IconeEtincelle,
  IconeEuro,
  IconeLoupe,
  IconeMessage,
  IconeMicro,
  IconePhoto,
  IconePoint,
} from "./icones";
import { BOUTON_TEXTE, CARTE, CHAMP, COMPTEUR, FOCUS, SECONDAIRE, TITRE_CARTE, TUILE_ICONE, puce } from "@/components/ui/recettes";
import { heure as ecrireHeure } from "@/lib/heure";

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



const formatJourSemaine = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
const formatJourMois = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

function heure(iso: string) {
  return ecrireHeure(iso);
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
          <mark key={debut} className="rounded-sm bg-alerte-fond px-0.5 text-inherit">
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

// Les icônes sont en encre (règle 9). Design v3 (24/10) : toutes dans la
// même tuile neutre en creux (40 × 40, rayon 12) — plus de pastille de
// couleur, même pour une tâche faite (la coche suffit à la dire).
function IconeEntree({ e }: { e: EntreeCarnet }) {
  const tuile = TUILE_ICONE;
  if (e.type === "vocal") return <span className={tuile}><IconeMicro className="h-5 w-5" /></span>;
  if (e.type === "photos") return <span className={tuile}><IconePhoto className="h-5 w-5" /></span>;
  if (e.type === "fait") return <span className={tuile}><IconeCoche className="h-5 w-5" /></span>;
  if (e.type === "rdv") return <span className={tuile}><IconeCalendrier className="h-5 w-5" /></span>;
  if (e.type === "demande") return <span className={tuile}><IconeMessage className="h-5 w-5" /></span>;
  const t = e.typeEvenement ?? "";
  if (t.startsWith("devis") || t === "analyse_ia") return <span className={tuile}><IconeDocument className="h-5 w-5" /></span>;
  if (t === "message_prepare") return <span className={tuile}><IconeMessage className="h-5 w-5" /></span>;
  if (t.startsWith("facture") || t === "avoir_cree") return <span className={tuile}><IconeEuro className="h-5 w-5" /></span>;
  return <span className={`${tuile} text-steel`}><IconePoint className="h-5 w-5" /></span>;
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
    // Design v3 (24/10) : des lignes aérées (tuile 40 px, titre en 17,
    // date en secondaire), sans fil vertical.
    <li className="flex gap-3 py-3">
      <IconeEntree e={e} />
      <div className="min-w-0 flex-1 pt-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`min-w-0 line-clamp-2 leading-snug ${discret ? "text-[15px] text-steel" : "text-[17px] font-semibold text-ink"}`}>
            {e.auteur ? (
              <>
                <span className="font-semibold text-ink">{surligner(e.auteur, mots)}</span>
                {" · "}
                {surligner(e.titre.charAt(0).toLowerCase() + e.titre.slice(1), mots)}
              </>
            ) : (
              surligner(e.titre, mots)
            )}
          </p>
          <time dateTime={e.date} className={`shrink-0 whitespace-nowrap tabular-nums ${SECONDAIRE}`}>
            {quand(e.date, maintenant)}
          </time>
        </div>

        {e.texte && (
          <div className={`mt-1 ${discret ? SECONDAIRE : "text-base leading-relaxed text-ink"}`}>
            <p className={`whitespace-pre-line ${complet ? "" : "line-clamp-3"}`}>{surligner(e.texte, mots)}</p>
          </div>
        )}
        {e.complement && complet && (
          <div className="mt-2 border-l-2 border-gris-clair pl-3">
            <p className={`inline-flex items-center gap-1.5 ${SECONDAIRE}`}>
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
            className={`-ml-3 ${BOUTON_TEXTE}`}
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
                className={`h-16 w-16 overflow-hidden rounded-[12px] bg-paper-warm active:opacity-80 sm:h-[4.5rem] sm:w-[4.5rem] ${FOCUS}`}
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
                className={`grid h-16 w-16 place-items-center rounded-[12px] bg-paper-warm text-[15px] font-semibold tabular-nums text-ink sm:h-[4.5rem] sm:w-[4.5rem] ${FOCUS}`}
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

/** 08/10 (passe de finition) — en dessous, la recherche et les filtres
 *  n'apparaissent pas : cinq entrées se lisent d'un coup d'œil. C'est aussi
 *  le seuil de la loupe de l'en-tête (VueProjet). */
export const SEUIL_RECHERCHE_CARNET = 6;

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
  const [choixFiltre, setFiltre] = useState<FiltreCarnet>("tout");

  // « Photos » compte les photos, pas les envois : le même nombre que la
  // ligne « Photos · N ».
  const compte = (f: FiltreCarnet) => {
    const liste = filtrerCarnet(entrees, f, "");
    return f === "photos" ? liste.reduce((n, e) => n + (e.photos?.length ?? 0), 0) : liste.length;
  };
  // Un filtre vide ne s'affiche pas ; « Photos » non plus quand la ligne
  // « Photos · N », juste au-dessus, les montre déjà. Un filtre ou une
  // recherche qui n'est plus à l'écran ne s'applique plus.
  const avecRecherche = entrees.length >= SEUIL_RECHERCHE_CARNET;
  const filtres = FILTRES.map((f) => ({ ...f, n: compte(f.cle) })).filter(
    (f) => f.cle === "tout" || (f.n > 0 && !(f.cle === "photos" && photos && photos.nombre > 0))
  );
  const avecFiltres = avecRecherche && filtres.length > 2;
  const filtre = avecFiltres && filtres.some((f) => f.cle === choixFiltre) ? choixFiltre : "tout";
  const texteCherche = avecRecherche ? recherche : "";

  const visibles = useMemo(() => filtrerCarnet(entrees, filtre, texteCherche), [entrees, filtre, texteCherche]);
  const periodes = useMemo(() => grouperParPeriode(visibles, maintenant), [visibles, maintenant]);
  const mots = useMemo(() => normaliser(texteCherche).split(/\s+/).filter(Boolean), [texteCherche]);

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

  const cherche = mots.length > 0;

  const basculer = (cle: string) =>
    setOuvertes((o) => {
      const n = new Set(o);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  return (
    // Refonte visuelle (04/10) : le Carnet dans une carte, comme les blocs
    // de l'accueil.
    // Design v3 (24/10) : même carte, même titre et même compteur que les
    // blocs du Point (plus de pastille autour du nombre).
    <section aria-labelledby="titre-carnet" className={`${CARTE} p-5 sm:p-6`}>
      <h2 id="titre-carnet" className={`flex min-h-8 items-baseline gap-2 ${TITRE_CARTE}`}>
        Carnet
        <span className={COMPTEUR}>{entrees.length}</span>
      </h2>

      {/* 22/10 (panel) — « Photos · 24 » sans une seule image : « on ne
          voit rien du chantier ». Les quatre dernières en vraies vignettes,
          la dernière case dit combien il en reste ; un appui ouvre toutes
          les photos, comme avant. */}
      {photos && photos.nombre > 0 && (
        <button
          type="button"
          onClick={photos.surOuvrir}
          aria-label={photos.nombre > 1 ? `Voir les ${photos.nombre} photos` : "Voir la photo"}
          className={`mt-3 block w-full rounded-[20px] text-left active:opacity-90 ${FOCUS}`}
        >
          <span className="flex min-h-12 items-center gap-2">
            <IconePhoto className="h-5 w-5 shrink-0 text-ink" />
            <span className="flex min-w-0 flex-1 items-baseline gap-2 text-[17px] font-semibold text-ink">
              Photos <span className={COMPTEUR}>{photos.nombre}</span>
            </span>
            <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
          </span>
          {photos.vignettes.length > 0 && (
            <span className="mt-1 grid grid-cols-4 gap-2" aria-hidden>
              {photos.vignettes.slice(0, 4).map((u, i) => {
                const reste = photos.nombre - 4;
                const derniere = i === 3 && reste > 0;
                return (
                  // 25/10 — l'image est posée en absolu sur toute la case
                  // carrée (object-cover) : elle la remplit quelle que soit
                  // sa proportion, sans bande vide.
                  <span key={u} className="relative block aspect-square w-full overflow-hidden rounded-[12px] bg-paper-warm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    {derniere && (
                      <span className="absolute inset-0 grid place-items-center bg-black/55 font-display text-lg font-bold tabular-nums text-white">+{reste}</span>
                    )}
                  </span>
                );
              })}
            </span>
          )}
        </button>
      )}

      {avecRecherche && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Chercher dans le carnet</span>
            <IconeLoupe className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel" />
            <input
              id={ID_RECHERCHE_CARNET}
              type="search"
              value={recherche}
              onChange={(ev) => setRecherche(ev.target.value)}
              placeholder="Chercher dans le carnet"
              className={`${CHAMP} pl-11`}
            />
          </label>
          {avecFiltres && (
            <div role="group" aria-label="Filtrer le carnet" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filtres.map((f) => {
                const actif = filtre === f.cle;
                return (
                  <button
                    key={f.cle}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setFiltre(f.cle)}
                    className={`${puce(actif)} min-h-12`}
                  >
                    {f.libelle}
                    <span className={`ml-1.5 font-normal tabular-nums ${actif ? "text-paper" : "text-steel"}`}>{f.n}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {entrees.length === 0 && <p className="py-4 text-base text-steel">Rien encore.</p>}
        {entrees.length > 0 && visibles.length === 0 && (
          <p className="break-words py-6 text-center text-base text-steel">Rien ne correspond{cherche ? ` à « ${recherche.trim()} »` : ""}.</p>
        )}

        {periodes.map((p) => {
          const ouverte = cherche || ouvertes.has(p.cle);
          return (
            <div key={p.cle} className="border-t border-gris-clair first:border-t-0">
              {/* Design v3 (24/10) : la période en 17, son résumé dessous en
                  secondaire (deux lignes au plus) plutôt que coupé à droite. */}
              <button
                type="button"
                onClick={() => basculer(p.cle)}
                aria-expanded={ouverte}
                disabled={cherche}
                // 25/10 — le focus clavier entoure toute la ligne (il ne
                // soulignait que le titre).
                className="flex min-h-14 w-full items-center gap-3 rounded-[14px] py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold leading-snug text-ink">{p.libelle}</span>
                  <span className={`line-clamp-2 block ${SECONDAIRE}`}>
                    {ouverte ? `${p.entrees.length} entrée${p.entrees.length > 1 ? "s" : ""}` : resumePeriode(p.entrees)}
                  </span>
                </span>
                <IconeChevron className={`h-5 w-5 shrink-0 text-steel motion-safe:transition-transform ${ouverte ? "-rotate-90" : "rotate-90"} ${cherche ? "opacity-0" : ""}`} />
              </button>
              {ouverte && (
                <ol className="divide-y divide-gris-clair pb-2">
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
