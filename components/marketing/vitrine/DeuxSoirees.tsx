"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";

// ============================================================
// « Même journée. Deux soirées. » (24/09) — la comparaison.
//
// La même table de cuisine, vue de dessus. À gauche, 21:47 sans Compyo :
// le carnet raturé, les post-it, la calculatrice, quatorze messages non
// lus, le café froid. À droite, 19:04 avec Compyo : le téléphone à jour,
// les clés, un verre. Le visiteur fait glisser la séparation.
//
// Tout est dessiné en CSS/SVG. Les objets sont posés en pourcentage de la
// table et dimensionnés en unités de conteneur (cqw) : la scène garde ses
// proportions à toutes les tailles. Deux compositions, une en largeur
// (ordinateur), une en hauteur (téléphone) — une table rétrécie ne
// suffisait pas.
// ============================================================

type Pose = [x: number, y: number, largeur: number, rotation: number];

function Objet({ p, m, children, className = "" }: { p: Pose; m: Pose; children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute left-[var(--xm)] top-[var(--ym)] w-[var(--wm)] -translate-x-1/2 -translate-y-1/2 rotate-[var(--rm)] [container-type:inline-size] sm:left-[var(--x)] sm:top-[var(--y)] sm:w-[var(--w)] sm:rotate-[var(--r)] ${className}`}
      style={
        {
          "--x": `${p[0]}%`,
          "--y": `${p[1]}%`,
          "--w": `${p[2]}cqw`,
          "--r": `${p[3]}deg`,
          "--xm": `${m[0]}%`,
          "--ym": `${m[1]}%`,
          "--wm": `${m[2]}cqw`,
          "--rm": `${m[3]}deg`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

const OMBRE_OBJET = "0 0.4cqw 0.8cqw rgb(0 0 0 / 0.25), 0 2cqw 5cqw -1cqw rgb(0 0 0 / 0.4)";

// La table : du chêne, lames horizontales — public/visuels/table-chene.svg
// (des centaines de traits fins déformés par un bruit étiré, ce qui donne
// des veines qui ondulent comme sur une vraie planche). Fichier statique
// plutôt que calculé ici : il est mis en cache, et ne pèse rien dans le
// JavaScript de la page.
const TABLE = 'url("/visuels/table-chene.svg")';

/** Des lignes d'écriture à la main, illisibles comme il se doit : des
 *  « mots » de longueurs variées, des boucles de hauteurs inégales. Tirage
 *  pseudo-aléatoire à graine fixe : le même dessin au serveur et au
 *  navigateur. */
function Ecriture({ lignes, className = "" }: { lignes: number; className?: string }) {
  let graine = 7;
  const hasard = () => {
    graine = (graine * 16807) % 2147483647;
    return graine / 2147483647;
  };
  const chemins: string[] = [];
  for (let i = 0; i < lignes; i++) {
    const y = 9 + i * 12;
    const fin = 60 + hasard() * 34;
    let x = 4;
    while (x < fin) {
      const longueur = 7 + hasard() * 15;
      let d = `M${x.toFixed(1)} ${y}`;
      for (let k = 0; k < longueur; k += 2.4) {
        const haut = hasard() < 0.18 ? -7 : -2.5 - hasard() * 2.5;
        d += ` q 0.8 ${haut.toFixed(1)} 1.6 0 q 0.4 1.2 0.8 0`;
      }
      chemins.push(d);
      x += longueur + 3 + hasard() * 3;
    }
  }
  return (
    <svg viewBox={`0 0 100 ${lignes * 12 + 2}`} className={className} fill="none" stroke="#2b3441" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {chemins.map((d, i) => (
        <path key={i} d={d} opacity={0.72} />
      ))}
    </svg>
  );
}

function CarnetOuvert() {
  return (
    <div className="relative aspect-[1.45] w-full rounded-[1.8cqw] bg-[#3a281d]" style={{ boxShadow: OMBRE_OBJET }}>
      <div className="absolute inset-[1.4cqw] flex overflow-hidden rounded-[1cqw]">
        {[0, 1].map((page) => (
          <div
            key={page}
            className="relative flex-1 bg-[#f5efe3] px-[3cqw] pt-[5cqw]"
            style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 4.6cqw, rgb(92 112 128 / 0.22) 4.6cqw calc(4.6cqw + 1px))" }}
          >
            {page === 0 ? (
              <>
                <p className="font-display text-[3.6cqw] font-semibold italic text-[#2b3441]">Garnier — évier</p>
                <Ecriture lignes={5} className="mt-[1cqw] w-full" />
                <p className="mt-[1cqw] font-display text-[3.4cqw] italic text-[#2b3441]">
                  <span className="line-through decoration-[#c0392b]">1 240 €</span> 1 380 ??
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-[3.4cqw] italic text-[#2b3441]">TVA 10 ou 20 ?</p>
                <Ecriture lignes={6} className="mt-[1cqw] w-full" />
                <p className="mt-[1cqw] font-display text-[3.4cqw] italic text-[#c0392b]">relancer Durand !!</p>
              </>
            )}
          </div>
        ))}
        <div className="absolute inset-y-0 left-1/2 w-[3cqw] -translate-x-1/2 bg-gradient-to-r from-transparent via-black/15 to-transparent" />
      </div>
    </div>
  );
}

function PostIt({ texte, couleur }: { texte: string; couleur: string }) {
  return (
    <div
      className="relative grid aspect-square w-full place-items-center p-[10cqw] text-center"
      style={{
        background: `linear-gradient(160deg, ${couleur}, color-mix(in srgb, ${couleur} 82%, #000))`,
        boxShadow: "0 0.6cqw 1cqw rgb(0 0 0 / 0.2), 0 6cqw 10cqw -6cqw rgb(0 0 0 / 0.45)",
      }}
    >
      <p className="font-display text-[13cqw] font-semibold italic leading-tight text-[#3a3226]">{texte}</p>
    </div>
  );
}

function TelephoneSurTable({ children, ecran }: { children: ReactNode; ecran: string }) {
  return (
    <div className="relative aspect-[0.49] w-full rounded-[14cqw] bg-[#15171a] p-[4cqw]" style={{ boxShadow: OMBRE_OBJET }}>
      <div className={`h-full overflow-hidden rounded-[11cqw] ${ecran}`}>{children}</div>
      <div className="absolute left-1/2 top-[6cqw] h-[4.5cqw] w-[26cqw] -translate-x-1/2 rounded-full bg-black" />
    </div>
  );
}

function Calculatrice() {
  return (
    <div className="aspect-[0.68] w-full rounded-[8cqw] bg-gradient-to-b from-[#3a3e44] to-[#25282c] p-[8cqw]" style={{ boxShadow: OMBRE_OBJET }}>
      <div className="rounded-[4cqw] bg-[#b7c2ad] px-[6cqw] py-[5cqw] text-right font-mono text-[14cqw] leading-none text-[#2a2f28]">1092,3</div>
      <div className="mt-[8cqw] grid grid-cols-4 gap-[5cqw]">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className={`aspect-square rounded-[3cqw] ${i === 15 ? "bg-[#c96b4a]" : i % 4 === 3 ? "bg-[#5a5f66]" : "bg-[#474b51]"}`} />
        ))}
      </div>
    </div>
  );
}

function Tasse({ the = false }: { the?: boolean }) {
  return (
    <div className="relative aspect-square w-full">
      <span className="absolute right-[-14%] top-1/2 h-[22%] w-[30%] -translate-y-1/2 rounded-[40%] border-[6cqw] border-[#ebe6de]" style={{ boxShadow: "0 1cqw 2cqw rgb(0 0 0 / 0.3)" }} />
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffffff,#e4ded4_70%,#cfc7ba)]" style={{ boxShadow: OMBRE_OBJET }} />
      <span
        className={`absolute inset-[12%] rounded-full ${
          the
            ? "bg-[radial-gradient(circle_at_40%_38%,#d99a4e,#a8621f_60%,#7c4412)]"
            : "bg-[radial-gradient(circle_at_40%_38%,#6a4428,#3a2414_65%,#2a190d)]"
        }`}
      />
      {the && (
        <>
          {/* Le fil et l'étiquette du sachet */}
          <span className="absolute left-[64%] top-[30%] h-[0.6cqw] w-[55%] origin-left rotate-[-24deg] bg-[#efe9df]" />
          <span className="absolute left-[112%] top-[2%] h-[20%] w-[16%] rotate-[-24deg] rounded-[1cqw] bg-[#c96b4a]" />
        </>
      )}
      <span className="absolute left-[26%] top-[22%] h-[10%] w-[22%] rounded-full bg-white/25 blur-[1cqw]" />
    </div>
  );
}

function Stylo() {
  return (
    <div className="relative h-[5.5cqw] w-full rounded-full bg-gradient-to-b from-[#3f4a5a] via-[#1f2733] to-[#10151c]" style={{ boxShadow: "0 1cqw 2cqw rgb(0 0 0 / 0.35)" }}>
      <span className="absolute right-[8%] top-[-30%] h-[40%] w-[30%] rounded-full bg-gradient-to-b from-[#e3e6ea] to-[#9aa1a9]" />
      <span className="absolute left-[-3%] top-1/2 h-[60%] w-[6%] -translate-y-1/2 rounded-l-full bg-[#c9ccd0]" />
    </div>
  );
}

function Cles() {
  return (
    <svg viewBox="0 0 120 80" className="w-full" aria-hidden style={{ filter: "drop-shadow(0 0.6cqw 0.8cqw rgb(0 0 0 / 0.4))" }}>
      <defs>
        <linearGradient id="acier-cle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef0f2" />
          <stop offset="0.5" stopColor="#a9b0b7" />
          <stop offset="1" stopColor="#d7dbdf" />
        </linearGradient>
        <linearGradient id="laiton-cle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3d9a4" />
          <stop offset="0.5" stopColor="#c49a55" />
          <stop offset="1" stopColor="#e6c78c" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="40" r="16" fill="none" stroke="url(#acier-cle)" strokeWidth="3.5" />
      <path d="M44 34h56l6 4-4 3 4 3-4 3-6 3H44a9 9 0 0 1 0-16Z" fill="url(#acier-cle)" />
      <circle cx="48" cy="42" r="3" fill="#6b7178" />
      <path d="M40 50l30 22 5-2-2-4 4-2-3-4 3-3-6-5-26-10" fill="url(#laiton-cle)" />
    </svg>
  );
}

function Livre() {
  return (
    <div className="relative aspect-[0.68] w-full rounded-[2.5cqw] bg-gradient-to-br from-[#2f4a55] via-[#274049] to-[#1d3139] p-[9cqw]" style={{ boxShadow: OMBRE_OBJET }}>
      <span className="absolute inset-y-0 left-0 w-[7cqw] rounded-l-[2.5cqw] bg-black/25" />
      <p className="font-display text-[10cqw] font-semibold leading-tight text-[#f0e6d6]">Le grand large</p>
      <span className="mt-[6cqw] block h-[1.2cqw] w-[40%] rounded-full bg-[#c96b4a]" />
      <span className="absolute bottom-[9cqw] left-[9cqw] block h-[1.2cqw] w-[30%] rounded-full bg-[#f0e6d6]/50" />
    </div>
  );
}

function EcranMessagesNonLus() {
  return (
    <div className="flex h-full flex-col gap-[4cqw] px-[6cqw] pt-[18cqw]">
      <p className="text-center font-display text-[16cqw] font-semibold leading-none text-white">21:47</p>
      {[
        ["Mme Garnier", "Vous passez quand ?"],
        ["M. Durand", "Et la facture ?"],
        ["Fournisseur", "Commande en attente"],
      ].map(([qui, quoi]) => (
        <div key={qui} className="rounded-[5cqw] bg-white/10 px-[5cqw] py-[4cqw]">
          <p className="truncate text-[7cqw] font-semibold text-white">{qui}</p>
          <p className="truncate text-[6.5cqw] text-white/65">{quoi}</p>
        </div>
      ))}
      <p className="mt-auto pb-[8cqw] text-center text-[7cqw] font-semibold text-[#ff8a7a]">14 messages non lus</p>
    </div>
  );
}

function EcranCompyoAJour() {
  return (
    <div className="flex h-full flex-col gap-[4cqw] px-[6cqw] pt-[17cqw] text-[#1F2937]">
      <div className="flex items-center gap-[3cqw]">
        <CompyoMark taille={20} className="h-[10cqw] w-[10cqw]" />
        <p className="text-[7.5cqw] font-semibold">Aujourd&apos;hui</p>
      </div>
      <div className="mt-[3cqw] grid place-items-center">
        <span className="grid h-[26cqw] w-[26cqw] place-items-center rounded-full bg-[#2F8F5B] text-white">
          <svg viewBox="0 0 16 16" className="h-[13cqw] w-[13cqw]" fill="none" aria-hidden>
            <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-[4cqw] text-[8.5cqw] font-semibold">Tout est à jour</p>
      </div>
      {["Devis Garnier · signé", "Relance F-031 · prête", "Demain 8:00 · Durand"].map((l) => (
        <div key={l} className="flex items-center gap-[3cqw] rounded-[4cqw] bg-[#F3EDE6] px-[4cqw] py-[3.5cqw]">
          <span className="h-[3cqw] w-[3cqw] shrink-0 rounded-full bg-[#2F8F5B]" />
          <p className="truncate text-[6.5cqw]">{l}</p>
        </div>
      ))}
    </div>
  );
}

function Scene({ cote }: { cote: "sans" | "avec" }) {
  const sans = cote === "sans";
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `${TABLE} center / cover` }}>
      {sans ? (
        <>
          <Objet p={[89, 21, 10, 0]} m={[80, 91, 17, 0]} className="opacity-40">
            <span className="block aspect-square w-full rounded-full border-[0.7cqw] border-[#4a2e18]/60" />
          </Objet>
          <Objet p={[42, 52, 40, -6]} m={[47, 43, 74, -6]}>
            <CarnetOuvert />
          </Objet>
          <Objet p={[62, 44, 17, 32]} m={[62, 44, 32, 32]}>
            <Stylo />
          </Objet>
          <Objet p={[16, 23, 12, -10]} m={[22, 12, 24, -10]}>
            <PostIt texte="Devis Lefèvre ??" couleur="#efd98c" />
          </Objet>
          <Objet p={[70, 20, 12, 8]} m={[77, 14, 24, 8]}>
            <PostIt texte="Rappeler Mme Garnier" couleur="#e8c5b6" />
          </Objet>
          <Objet p={[64, 76, 11, -4]} m={[72, 67, 21, -4]}>
            <PostIt texte="TVA ?" couleur="#efd98c" />
          </Objet>
          <Objet p={[17, 71, 13, -14]} m={[24, 79, 25, -14]}>
            <Calculatrice />
          </Objet>
          <Objet p={[85, 60, 13, 12]} m={[74, 77, 28, 12]}>
            <TelephoneSurTable ecran="bg-[#101318]">
              <EcranMessagesNonLus />
            </TelephoneSurTable>
          </Objet>
          <Objet p={[90, 17, 10, 0]} m={[50, 86, 16, 0]}>
            <Tasse />
          </Objet>
          {/* 21:47 : une lampe froide sur une table dans le noir */}
          <div className="absolute inset-0 bg-[#0f1a26]/55 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_42%_48%,rgb(255_247_225/0.28),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_45%,rgb(0_0_0/0.55))]" />
          <p className="absolute bottom-3 left-3 rounded-full bg-[#9f2b22] px-2.5 py-1 text-[12px] font-medium text-white shadow-lg sm:hidden">
            14 messages non lus
          </p>
        </>
      ) : (
        <>
          <Objet p={[85, 70, 14, 9]} m={[88, 90, 21, 9]}>
            <Livre />
          </Objet>
          <Objet p={[62, 47, 15, -5]} m={[71, 48, 36, -5]}>
            <TelephoneSurTable ecran="bg-[#FAF8F5]">
              <EcranCompyoAJour />
            </TelephoneSurTable>
          </Objet>
          <Objet p={[66, 86, 12, 18]} m={[60, 92, 19, 18]}>
            <Cles />
          </Objet>
          <Objet p={[84, 26, 11, 0]} m={[82, 12, 18, 0]}>
            <Tasse the />
          </Objet>
          {/* 19:04 : la lumière dorée du soir par la fenêtre */}
          <div className="absolute inset-0 bg-[#ffb070]/15 mix-blend-soft-light" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_78%_12%,rgb(255_205_150/0.45),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_45%,transparent_55%,rgb(40_20_10/0.35))]" />
          <p className="absolute bottom-3 right-3 rounded-full bg-[#2F8F5B] px-2.5 py-1 text-[12px] font-medium text-white shadow-lg sm:hidden">
            ✓ Tout est à jour
          </p>
        </>
      )}
    </div>
  );
}

export function DeuxSoirees() {
  const [x, setX] = useState(50);
  const cadre = useRef<HTMLDivElement>(null);
  const tire = useRef(false);
  const touche = useRef(false);

  // Une première invitation, une seule fois : la séparation glisse
  // doucement à gauche puis à droite, pour montrer qu'elle bouge.
  useEffect(() => {
    const el = cadre.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let image = 0;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const debut = performance.now();
        const pas = (t: number) => {
          if (touche.current) return;
          const p = Math.min(1, (t - debut) / 2800);
          setX(50 + Math.sin(p * Math.PI * 2) * 14 * (1 - p));
          if (p < 1) image = requestAnimationFrame(pas);
        };
        image = requestAnimationFrame(pas);
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(image);
    };
  }, []);

  const placer = (clientX: number) => {
    const r = cadre.current?.getBoundingClientRect();
    if (!r) return;
    setX(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div>
      <div
        ref={cadre}
        className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-[1.8rem] shadow-[var(--v-ombre)] [container-type:inline-size] [touch-action:pan-y] sm:aspect-[16/9] sm:rounded-[2.4rem]"
        onPointerDown={(e) => {
          touche.current = true;
          tire.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          placer(e.clientX);
        }}
        onPointerMove={(e) => tire.current && placer(e.clientX)}
        onPointerUp={() => (tire.current = false)}
        onPointerCancel={() => (tire.current = false)}
      >
        <Scene cote="sans" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${x}%)` }}>
          <Scene cote="avec" />
        </div>

        {/* Les deux heures */}
        <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-medium text-white backdrop-blur-md sm:left-6 sm:top-6 sm:px-3.5 sm:py-1.5 sm:text-[13px]">
          <span className="font-mono tabular-nums">21:47</span> · Sans<span className="hidden sm:inline"> Compyo</span>
        </p>
        <p className="pointer-events-none absolute right-3 top-3 rounded-full bg-signal px-2.5 py-1 text-[11.5px] font-medium text-white shadow-[0_8px_20px_-8px_rgb(201_107_74/0.9)] sm:right-6 sm:top-6 sm:px-3.5 sm:py-1.5 sm:text-[13px]">
          <span className="font-mono tabular-nums">19:04</span> · Avec<span className="hidden sm:inline"> Compyo</span>
        </p>

        {/* La séparation et sa poignée */}
        <div className="pointer-events-none absolute inset-y-0 w-[2px] -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgb(0_0_0/0.4)]" style={{ left: `${x}%` }} />
        <button
          type="button"
          role="slider"
          aria-label="Comparer les deux soirées"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(x)}
          aria-valuetext={x < 50 ? "Surtout la soirée avec Compyo" : x > 50 ? "Surtout la soirée sans Compyo" : "Moitié-moitié"}
          onKeyDown={(e) => {
            const pas = e.shiftKey ? 20 : 5;
            if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - pas));
            else if (e.key === "ArrowRight") setX((v) => Math.min(100, v + pas));
            else if (e.key === "Home") setX(0);
            else if (e.key === "End") setX(100);
            else return;
            touche.current = true;
            e.preventDefault();
          }}
          className="absolute top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-white text-[#1F2937] shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/60"
          style={{ left: `${x}%` }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className="mt-5 text-center text-[13.5px] text-steel">Glissez la poignée pour comparer.</p>
    </div>
  );
}
