import { Carte, Coche, Etiquette, d } from "./outils";

// ============================================================
// 10:15 — sur le chantier : la note dictée, les photos qui se rangent.
//
// La note : l'onde de l'enregistrement, puis le texte qui s'écrit mot à
// mot pendant qu'il parle — la transcription réelle de l'app. Les photos
// arrivent en vrac (comme dans la pellicule du téléphone), puis se rangent
// dans le projet.
//
// Les « photos » sont dessinées : quatre vues de chantier en SVG, avec la
// lumière et le vignettage d'une photo. Elles ne prétendent pas être des
// photographies ; elles en ont la place et le rôle.
// ============================================================

const TRANSCRIPTION =
  "Évier de la cuisine. Siphon PVC fissuré, les deux flexibles à changer. Le fond du meuble a pris l'eau, à reprendre. Compter une demi-journée.";

// Hauteurs de l'onde vocale, figées (pas de hasard au rendu : le serveur
// et le navigateur doivent produire exactement le même HTML).
const ONDE = [30, 52, 74, 46, 88, 62, 36, 70, 94, 58, 40, 66, 84, 50, 28, 60, 90, 72, 44, 56, 80, 38, 64, 86, 48, 34, 68, 92, 54, 42, 76, 58];

type Sujet = "siphon" | "evier" | "meuble" | "arrivee";

const PHOTOS: { sujet: Sujet; legende: string; heure: string; pile: [string, string, string] }[] = [
  { sujet: "siphon", legende: "Siphon", heure: "10:16", pile: ["calc(50% + 6px)", "calc(50% + 6px)", "-9deg"] },
  { sujet: "evier", legende: "Évier", heure: "10:16", pile: ["calc(-50% - 6px)", "calc(50% + 6px)", "7deg"] },
  { sujet: "meuble", legende: "Fond du meuble", heure: "10:17", pile: ["calc(50% + 6px)", "calc(-50% - 6px)", "4deg"] },
  { sujet: "arrivee", legende: "Arrivée d'eau", heure: "10:18", pile: ["calc(-50% - 6px)", "calc(-50% - 6px)", "-3deg"] },
];

function PhotoChantier({ sujet }: { sujet: Sujet }) {
  const id = `photo-${sujet}`;
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-vignette`} cx="42%" cy="35%" r="80%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.38" />
        </radialGradient>
        <linearGradient id={`${id}-fond`} x1="0" y1="0" x2="0" y2="1">
          {sujet === "siphon" && (
            <>
              <stop offset="0" stopColor="#4a3a2e" />
              <stop offset="1" stopColor="#1c1410" />
            </>
          )}
          {sujet === "evier" && (
            <>
              <stop offset="0" stopColor="#f1ece5" />
              <stop offset="1" stopColor="#d8d0c5" />
            </>
          )}
          {sujet === "meuble" && (
            <>
              <stop offset="0" stopColor="#d4b089" />
              <stop offset="1" stopColor="#a98158" />
            </>
          )}
          {sujet === "arrivee" && (
            <>
              <stop offset="0" stopColor="#efe9e1" />
              <stop offset="1" stopColor="#d6cdc1" />
            </>
          )}
        </linearGradient>
        <linearGradient id={`${id}-tuyau`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9d9a95" />
          <stop offset="0.35" stopColor="#f4f2ee" />
          <stop offset="1" stopColor="#b3afa8" />
        </linearGradient>
        <linearGradient id={`${id}-cuivre`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a4a2a" />
          <stop offset="0.4" stopColor="#e3a276" />
          <stop offset="1" stopColor="#9c5733" />
        </linearGradient>
        <linearGradient id={`${id}-inox`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9dcdf" />
          <stop offset="0.5" stopColor="#9aa0a6" />
          <stop offset="1" stopColor="#c4c8cc" />
        </linearGradient>
      </defs>

      <rect width="160" height="120" fill={`url(#${id}-fond)`} />

      {sujet === "siphon" && (
        <g>
          <rect x="0" y="92" width="160" height="28" fill="#2b1f18" />
          <ellipse cx="96" cy="104" rx="34" ry="5" fill="#8fb4c4" opacity="0.35" />
          <path d="M58 -4V50Q58 80 84 80Q110 80 110 50V42H150" fill="none" stroke={`url(#${id}-tuyau)`} strokeWidth="15" strokeLinecap="round" />
          <path d="M53 0V48" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          <path d="M80 72l4 5-3 4 4 4" fill="none" stroke="#3a2a20" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="88" cy="92" r="1.8" fill="#bcd6e0" opacity="0.8" />
          <circle cx="90" cy="99" r="1.4" fill="#bcd6e0" opacity="0.6" />
        </g>
      )}
      {sujet === "evier" && (
        <g>
          <rect x="22" y="18" width="116" height="84" rx="16" fill={`url(#${id}-inox)`} />
          <rect x="30" y="26" width="100" height="68" rx="11" fill="#7b8187" opacity="0.35" />
          <circle cx="80" cy="62" r="7" fill="#555b61" />
          <circle cx="80" cy="62" r="3.5" fill="#2e3236" />
          <path d="M80 4v10q0 8 -8 8h-6" fill="none" stroke="#c9cdd1" strokeWidth="5" strokeLinecap="round" />
          <path d="M36 32q14 -6 30 -2" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
      {sujet === "meuble" && (
        <g>
          <rect x="16" y="8" width="128" height="112" rx="3" fill="#c79d73" stroke="#8b633f" strokeOpacity="0.5" />
          {[24, 34, 47, 58, 71, 86, 97, 112, 126, 136].map((x) => (
            <path key={x} d={`M${x} 10q3 50 -2 108`} stroke="#8b633f" strokeOpacity="0.18" strokeWidth="1.2" fill="none" />
          ))}
          <rect x="70" y="28" width="20" height="4" rx="2" fill="#5b5f63" />
          <ellipse cx="82" cy="108" rx="54" ry="22" fill="#4a2e18" opacity="0.45" />
          <ellipse cx="78" cy="112" rx="36" ry="12" fill="#3a2212" opacity="0.4" />
        </g>
      )}
      {sujet === "arrivee" && (
        <g>
          <rect x="56" y="0" width="12" height="120" fill={`url(#${id}-cuivre)`} />
          <rect x="44" y="50" width="36" height="18" rx="4" fill="#c7cbcf" />
          <rect x="49" y="40" width="42" height="7" rx="3.5" fill="#c96b4a" transform="rotate(-8 70 44)" />
          <path d="M80 60h24q14 0 14 14v46" fill="none" stroke="#b9bdc1" strokeWidth="7" strokeDasharray="2 2" />
          <path d="M60 0v120" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
        </g>
      )}

      <rect width="160" height="120" fill={`url(#${id}-vignette)`} />
    </svg>
  );
}

export function SceneChantier() {
  const mots = TRANSCRIPTION.split(" ");
  return (
    <div className="grid gap-10 px-5 pb-20 pt-8 sm:px-10 sm:pb-24 sm:pt-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-14 lg:py-16">
      {/* La note vocale */}
      <Carte className="v-entre p-5 sm:p-6" style={d(0.1)}>
        <div className="flex items-center justify-between gap-3">
          <Etiquette>Note vocale</Etiquette>
          <Etiquette className="normal-case tracking-normal">Chantier Garnier</Etiquette>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-signal text-white shadow-[0_8px_20px_-8px_rgb(201_107_74/0.9)]">
            <span className="v-pulse absolute inset-0 rounded-full bg-signal/40" style={d(0.4)} />
            <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
          </span>
          <div aria-hidden className="flex h-10 min-w-0 flex-1 items-center gap-[2px] sm:gap-[3px]">
            {ONDE.map((h, i) => (
              <span
                key={i}
                className="v-onde block w-full min-w-0 flex-1 origin-center rounded-full bg-ink/70"
                style={{ height: `${h}%`, ...d(0.3 + (i % 8) * 0.08) }}
              />
            ))}
          </div>
          <span className="shrink-0 font-mono text-[12px] tabular-nums text-steel">0:14</span>
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-ink/85 sm:text-[16px]">
          {mots.map((mot, i) => (
            <span key={i} className="v-mot" style={d(1.1 + i * 0.09)}>
              {mot}{" "}
            </span>
          ))}
        </p>
        <p
          className="v-pop mt-5 inline-flex items-center gap-1.5 rounded-full bg-succes/10 px-3 py-1.5 text-[12px] font-medium text-succes"
          style={d(1.4 + mots.length * 0.09)}
        >
          <Coche className="h-3.5 w-3.5" /> Rangée dans le projet Garnier
        </p>
      </Carte>

      {/* Les photos : en vrac, puis rangées */}
      <div className="v-entre" style={d(0.3)}>
        <div className="flex items-baseline justify-between">
          <Etiquette>Photos · Garnier</Etiquette>
          <Etiquette className="normal-case tracking-normal">4 photos</Etiquette>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {PHOTOS.map((p, i) => (
            <figure
              key={p.sujet}
              className="v-photo relative aspect-[4/3] overflow-hidden rounded-xl bg-ink/10 shadow-[var(--v-ombre-legere)] ring-1 ring-black/5"
              style={d(3.2 + i * 0.12, { "--px": p.pile[0], "--py": p.pile[1], "--pr": p.pile[2] })}
            >
              <PhotoChantier sujet={p.sujet} />
              <figcaption className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                <span className="truncate rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  {p.legende}
                </span>
                <span className="font-mono text-[10px] text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">{p.heure}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
