import type { CSSProperties, ReactNode } from "react";
import { d } from "./outils";
import { Taches } from "./Taches";

// ============================================================
// 18:40 — tout est rangé.
//
// Le projet Garnier au centre, et tout ce que la journée y a accroché :
// le message, la note, les photos, le devis signé, l'acompte, le
// rendez-vous. C'est la fiche projet de l'app, dessinée comme une carte
// pour qu'on la comprenne d'un coup d'œil. À côté, les tâches du jour qui
// se terminent.
//
// Deux dispositions : en étoile à partir de 640 px ; en dessous, le projet
// puis ce qui s’y rattache en grille (une étoile serrée dans 340 px
// devient illisible).
// ============================================================

type Noeud = {
  titre: string;
  detail: string;
  icone: ReactNode;
  /** Position dans l’étoile (à partir de 640 px), en % du cadre. */
  pos: [number, number];
};

const I = {
  message: <path d="M4 5h16v11H9l-5 4V5Z" />,
  note: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M8 6l1.5-2h5L16 6" />
    </>
  ),
  devis: (
    <>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M9 12h6M9 16h6M9 8h3" />
    </>
  ),
  euro: <path d="M17 6.5A7 7 0 1 0 17 17.5M4 10.5h9M4 13.5h9" />,
  calendrier: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    </>
  ),
};

const NOEUDS: Noeud[] = [
  { titre: "Message", detail: "07:46 · partagé", icone: I.message, pos: [19, 29] },
  { titre: "Note vocale", detail: "0:14 · transcrite", icone: I.note, pos: [50, 12] },
  { titre: "4 photos", detail: "Rangées", icone: I.photo, pos: [81, 29] },
  { titre: "Devis signé", detail: "387,20 € TTC", icone: I.devis, pos: [81, 71] },
  { titre: "Acompte", detail: "116,16 € TTC", icone: I.euro, pos: [50, 88] },
  { titre: "Mercredi 10", detail: "8:00 – 12:00", icone: I.calendrier, pos: [19, 71] },
];

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function SceneRange() {
  return (
    <div className="grid gap-10 px-4 pb-20 pt-8 max-md:gap-4 max-md:pb-5 max-md:pt-4 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:px-14 lg:py-16">
      <figure
        className="relative mx-auto grid w-full grid-cols-2 gap-2 sm:block sm:aspect-[5/4]"
        aria-label="Le projet Garnier et tout ce qui s'y rattache : le message du client, la note vocale, quatre photos, le devis signé, l'acompte et le rendez-vous de mercredi."
        role="img"
      >
        {/* Les liens, dessinés dans un repère de 0 à 100 */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 hidden h-full w-full text-ink/35 sm:block" aria-hidden>
          {NOEUDS.map((n, i) => (
            <path
              key={n.titre}
              className="v-fondu"
              style={d(0.5 + i * 0.25)}
              d={`M50 50Q${(50 + n.pos[0]) / 2 + (n.pos[1] < 50 ? -6 : 6)} ${(50 + n.pos[1]) / 2} ${n.pos[0]} ${n.pos[1]}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Le projet (le positionnement et l'animation sur deux boîtes :
            une animation de transform écraserait le centrage) */}
        <div className="col-span-2 mb-1 sm:absolute sm:left-1/2 sm:top-1/2 sm:mb-0 sm:w-[30%] sm:-translate-x-1/2 sm:-translate-y-1/2">
          <div
            className="v-pop rounded-2xl bg-ink px-4 py-3 text-center text-paper shadow-[var(--v-ombre)] max-sm:flex max-sm:items-baseline max-sm:justify-center max-sm:gap-2 max-sm:py-2.5 sm:py-4"
            style={d(0.1)}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55 max-sm:hidden">Projet</p>
            <p className="mt-1 font-display text-[15px] font-semibold leading-tight max-sm:mt-0 sm:text-base">Mme Garnier</p>
            <p className="text-[12px] text-paper/70">Fuite sous l&apos;évier</p>
          </div>
        </div>

        {/* Ce qui s'y rattache */}
        {NOEUDS.map((n, i) => (
          <div
            key={n.titre}
            className="sm:absolute sm:left-[var(--x)] sm:top-[var(--y)] sm:w-[35%] sm:-translate-x-1/2 sm:-translate-y-1/2 lg:w-[36%]"
            style={
              {
                "--x": `${n.pos[0]}%`,
                "--y": `${n.pos[1]}%`,
              } as CSSProperties
            }
          >
            <div
              className="v-pop flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 max-sm:gap-2 max-sm:px-2.5 max-sm:py-2 shadow-[var(--v-ombre-legere)] ring-1 ring-ink/[0.06]"
              style={d(0.8 + i * 0.25)}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-signal/10 text-signal">
                <Icone>{n.icone}</Icone>
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[12.5px] font-semibold text-ink">{n.titre}</span>
                <span className="block truncate text-[11px] text-steel">{n.detail}</span>
              </span>
            </div>
          </div>
        ))}
      </figure>

      <Taches />
    </div>
  );
}
