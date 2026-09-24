"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useScene } from "../Journee";
import { Carte, Etiquette } from "./outils";

// ============================================================
// 17:20 — la semaine se remplit.
//
// Le chantier Garnier part de « À planifier » et se pose mercredi matin.
// Puis la scène montre la règle qui compte : un créneau pris ne peut pas
// l'être deux fois (contrainte d'exclusion en base, dans l'app — pas une
// simple alerte). Le visiteur peut ensuite déplacer le rendez-vous
// lui-même : un créneau libre l'accepte, un créneau pris tremble.
//
// Semaine du lundi 8 juin 2026 : la même journée que tout le reste de la
// page (mardi 9 juin).
// ============================================================

const JOURS = [
  { cle: "lun", nom: "Lun", date: 8 },
  { cle: "mar", nom: "Mar", date: 9 },
  { cle: "mer", nom: "Mer", date: 10 },
  { cle: "jeu", nom: "Jeu", date: 11 },
  { cle: "ven", nom: "Ven", date: 12 },
];
const PERIODES = [
  { cle: "matin", heure: "8 h" },
  { cle: "aprem", heure: "13 h" },
];

type Creneau = `${string}-${string}`;

const OCCUPES: { creneaux: Creneau[]; titre: string; detail: string; style: string }[] = [
  { creneaux: ["lun-matin", "lun-aprem"], titre: "Lefèvre", detail: "Salle de bains", style: "bg-ink/[0.07] text-ink" },
  { creneaux: ["mar-matin", "mar-aprem"], titre: "Lefèvre", detail: "Salle de bains", style: "bg-ink/[0.07] text-ink" },
  { creneaux: ["jeu-matin"], titre: "Durand", detail: "Chauffe-eau", style: "bg-steel/15 text-ink" },
  { creneaux: ["ven-aprem"], titre: "Mme Roux", detail: "Visite devis", style: "border border-dashed border-ink/25 text-ink/75" },
];

const occupant = (c: Creneau) => OCCUPES.find((o) => o.creneaux.includes(c));

/** Colonne de la grille (la première porte les heures) : sur ordinateur,
 *  lundi → vendredi ; sur téléphone, mercredi → vendredi seulement (cinq
 *  colonnes dans 340 px ne laissent plus lire un nom). */
function placement(creneaux: Creneau[]): CSSProperties {
  const [jour, periode] = creneaux[0].split("-");
  const indice = JOURS.findIndex((j) => j.cle === jour);
  const ligne = PERIODES.findIndex((p) => p.cle === periode) + 2;
  return {
    "--col": String(indice + 2),
    "--col-m": String(indice),
    gridRow: `${ligne} / span ${creneaux.length}`,
  } as CSSProperties;
}

// Deux animations identiques, en alternance : c'est ce qui permet de
// relancer le tremblement sans recréer le bouton (qui perdrait le focus
// clavier).
const secousse = (fois: number) => (fois % 2 ? "v-secoue" : "v-secoue-b");

export function ScenePlanning() {
  const { ref, tour, reduit } = useScene<HTMLDivElement>();
  const [garnier, setGarnier] = useState<Creneau | null>("mer-matin");
  const [refus, setRefus] = useState<{ creneau: Creneau; fois: number } | null>(null);
  const [aide, setAide] = useState(false);
  const minuteurs = useRef<number[]>([]);

  const vider = () => {
    minuteurs.current.forEach(window.clearTimeout);
    minuteurs.current = [];
  };
  const plus_tard = (ms: number, f: () => void) => minuteurs.current.push(window.setTimeout(f, ms));

  const refuser = (c: Creneau) => {
    setRefus((r) => ({ creneau: c, fois: (r?.fois ?? 0) + 1 }));
    plus_tard(2200, () => setRefus((r) => (r?.creneau === c ? null : r)));
  };

  useEffect(() => {
    if (tour === 0) return;
    vider();
    setRefus(null);
    if (reduit) {
      setGarnier("mer-matin");
      setAide(true);
      return;
    }
    setGarnier(null);
    setAide(false);
    plus_tard(1300, () => setGarnier("mer-matin"));
    // La règle, montrée une fois : on essaie jeudi matin, déjà pris.
    plus_tard(2900, () => refuser("jeu-matin"));
    plus_tard(4400, () => setAide(true));
    return vider;
  }, [tour, reduit]);

  const choisir = (c: Creneau) => {
    if (occupant(c)) {
      refuser(c);
      return;
    }
    setRefus(null);
    setGarnier(c);
    setAide(true);
  };

  const occupantRefuse = refus ? occupant(refus.creneau) : null;

  return (
    <div ref={ref} className="px-4 pb-20 pt-8 max-md:px-3 max-md:pb-5 max-md:pt-4 sm:px-10 sm:pb-24 sm:pt-12 lg:px-14 lg:py-16">
      <Carte className="mx-auto max-w-3xl p-4 sm:p-6">
        {/* À planifier */}
        <div className="flex min-h-[2.75rem] flex-wrap items-center justify-between gap-3 border-b border-ink/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <Etiquette>À planifier</Etiquette>
            {/* Le rendez-vous à placer, et à sa place une fois posé : les
                deux occupent la même case, rien ne saute. */}
            <span className="grid items-center [&>*]:[grid-area:1/1]">
              <span
                className={`inline-flex items-center gap-2 rounded-full bg-signal px-3 py-1.5 text-[12.5px] font-medium text-white shadow-[0_6px_16px_-8px_rgb(201_107_74/0.9)] transition-all duration-500 ${
                  garnier ? "pointer-events-none scale-90 opacity-0" : "opacity-100"
                }`}
              >
                Garnier · fuite évier · ½ j
              </span>
              <span className={`text-[12.5px] text-steel transition-opacity duration-500 ${garnier ? "opacity-100" : "opacity-0"}`}>
                Rien en attente
              </span>
            </span>
          </div>
          {/* Le refus, en toutes lettres, à la place de la date */}
          <p className="relative font-mono text-[11px] text-steel">
            <span className={`transition-opacity duration-300 ${occupantRefuse ? "opacity-0" : "opacity-100"}`}>Semaine du 8 juin</span>
            <span
              role="status"
              className={`absolute right-0 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-signal px-3 py-1 font-sans text-[12px] font-medium text-white transition-all duration-300 ${
                occupantRefuse ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {occupantRefuse ? `Déjà pris · ${occupantRefuse.titre}` : ""}
            </span>
          </p>
        </div>

        {/* La semaine */}
        <div className="relative mt-4">
          <div className="grid grid-cols-[2.2rem_repeat(3,minmax(0,1fr))] grid-rows-[auto_5.5rem_5.5rem] gap-1.5 sm:grid-cols-[2.6rem_repeat(5,minmax(0,1fr))] sm:grid-rows-[auto_6rem_6rem] sm:gap-2">
            <span />
            {JOURS.map((j, i) => (
              <p
                key={j.cle}
                className={`pb-1 text-center text-[12px] text-ink/60 ${i < 2 ? "hidden sm:block" : ""} ${j.cle === "mar" ? "font-semibold text-ink" : ""}`}
              >
                {j.nom} <span className="tabular-nums">{j.date}</span>
              </p>
            ))}
            {PERIODES.map((p, pi) => (
              <p key={p.cle} className="pt-1 text-right font-mono text-[10px] text-steel" style={{ gridColumn: 1, gridRow: pi + 2 }}>
                {p.heure}
              </p>
            ))}

            {/* Les créneaux eux-mêmes : ce sont eux qu'on touche. */}
            {JOURS.flatMap((j, ji) =>
              PERIODES.map((p) => {
                const c: Creneau = `${j.cle}-${p.cle}`;
                const pris = occupant(c);
                const secoue = refus?.creneau === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => choisir(c)}
                    aria-label={`${j.nom} ${j.date} ${p.cle === "matin" ? "matin" : "après-midi"}${pris ? ` : pris (${pris.titre})` : " : libre"}`}
                    className={`rounded-lg transition-colors [grid-column:var(--col-m)] sm:[grid-column:var(--col)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 ${
                      ji < 2 ? "hidden sm:block" : ""
                    } ${pris ? "cursor-not-allowed" : "bg-ink/[0.025] hover:bg-signal/10"} ${secoue && refus ? `${secousse(refus.fois)} ring-2 ring-signal` : ""}`}
                    style={placement([c])}
                  />
                );
              })
            )}

            {/* Ce qui est déjà pris */}
            {OCCUPES.map((o) => (
              <div
                key={o.creneaux[0]}
                aria-hidden
                className={`pointer-events-none rounded-lg p-2 [grid-column:var(--col-m)] sm:[grid-column:var(--col)] ${o.style} ${
                  o.creneaux[0].startsWith("lun") || o.creneaux[0].startsWith("mar") ? "hidden sm:block" : ""
                } ${refus && occupant(refus.creneau) === o ? secousse(refus.fois) : ""}`}
                style={placement(o.creneaux)}
              >
                <p className="truncate text-[12px] font-semibold">{o.titre}</p>
                <p className="truncate text-[11px] opacity-70">{o.detail}</p>
              </div>
            ))}

            {/* Le rendez-vous Garnier */}
            {garnier && (
              <div
                key={garnier}
                aria-hidden
                className="pointer-events-none animate-[v-pop_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-lg bg-signal p-2 text-white shadow-[0_10px_24px_-10px_rgb(201_107_74/0.9)] [grid-column:var(--col-m)] sm:[grid-column:var(--col)]"
                style={placement([garnier])}
              >
                <p className="truncate text-[12px] font-semibold">Garnier</p>
                <p className="truncate text-[11px] text-white/80">Fuite évier</p>
              </div>
            )}
          </div>

        </div>
      </Carte>

      <p
        className={`mx-auto mt-6 max-w-3xl text-center text-[13.5px] text-steel transition-opacity duration-700 max-md:mt-4 ${aide ? "opacity-100" : "opacity-0"}`}
      >
        Touchez un créneau pour déplacer le rendez-vous de Mme Garnier.
      </p>
    </div>
  );
}
