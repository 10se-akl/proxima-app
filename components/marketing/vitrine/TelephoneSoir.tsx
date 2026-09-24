"use client";

import { useEffect, useRef, useState } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";

// ============================================================
// Le téléphone du hero (24/09) : l'écran verrouillé d'un artisan, à
// 19h04. Les notifications arrivent une à une — c'est tout ce que Compyo
// a fait pendant qu'il travaillait. Le visiteur comprend le résultat sans
// lire une ligne : la journée est finie, et l'administratif aussi.
//
// Chaque notification correspond à une fonction réelle de l'app : le
// projet créé depuis un message partagé, la relance préparée en
// brouillon (jamais envoyée sans l'artisan), la signature en ligne, le
// résumé de fin de journée.
//
// Sur ordinateur, le téléphone suit légèrement la souris ; le reflet de
// l'écran se déplace avec lui. Rien de tout ça pour qui a demandé moins de
// mouvement : les quatre notifications sont là d'emblée, immobiles.
// ============================================================

const NOTIFICATIONS = [
  { titre: "Nouveau projet", texte: "Mme Garnier · fuite sous l'évier. Créé depuis son message.", heure: "18:41" },
  { titre: "Relance prête", texte: "Facture F-031, échue depuis 3 jours. À relire avant envoi.", heure: "18:52" },
  { titre: "Devis signé", texte: "M. Lefèvre · salle de bains · 8 460,00 € TTC", heure: "19:03" },
  { titre: "Votre journée", texte: "3 chantiers, 2 devis envoyés, 1 signé. Le résumé est prêt.", heure: "maintenant" },
];

const PREMIERE = 900;
const INTERVALLE = 1800;
const PAUSE = 7000;

export function TelephoneSoir() {
  const [visibles, setVisibles] = useState(0);
  const cadre = useRef<HTMLDivElement>(null);
  const ecran = useRef<HTMLDivElement>(null);

  // Les notifications, en boucle lente, seulement quand le téléphone est
  // à l'écran et l'onglet visible.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibles(NOTIFICATIONS.length);
      return;
    }
    let minuteur: number | undefined;
    let aLEcran = false;
    let n = 0;

    const suivante = () => {
      if (!aLEcran || document.hidden) return;
      if (n < NOTIFICATIONS.length) {
        n += 1;
        setVisibles(n);
        minuteur = window.setTimeout(suivante, n === NOTIFICATIONS.length ? PAUSE : INTERVALLE);
      } else {
        // Tout repart de zéro, doucement.
        n = 0;
        setVisibles(0);
        minuteur = window.setTimeout(suivante, 1400);
      }
    };
    const relancer = () => {
      window.clearTimeout(minuteur);
      if (aLEcran && !document.hidden) minuteur = window.setTimeout(suivante, n === 0 ? PREMIERE : INTERVALLE);
    };

    const observateur = new IntersectionObserver(([e]) => {
      aLEcran = e.isIntersecting;
      relancer();
    });
    if (cadre.current) observateur.observe(cadre.current);
    document.addEventListener("visibilitychange", relancer);
    return () => {
      observateur.disconnect();
      document.removeEventListener("visibilitychange", relancer);
      window.clearTimeout(minuteur);
    };
  }, []);

  // L'inclinaison qui suit la souris : écrite directement dans le style,
  // sans passer par React (aucun rendu à chaque mouvement).
  useEffect(() => {
    const el = cadre.current;
    const zone = el?.closest("section");
    if (!el || !zone) return;
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    let image = 0;
    const bouger = (e: PointerEvent) => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.6)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.2)));
        el.style.transform = `perspective(1400px) rotateY(${x * 9}deg) rotateX(${-y * 6}deg)`;
        ecran.current?.style.setProperty("--gx", `${30 + x * 30}%`);
        ecran.current?.style.setProperty("--gy", `${20 + y * 25}%`);
      });
    };
    const sortir = () => {
      cancelAnimationFrame(image);
      el.style.transform = "";
    };
    zone.addEventListener("pointermove", bouger);
    zone.addEventListener("pointerleave", sortir);
    return () => {
      zone.removeEventListener("pointermove", bouger);
      zone.removeEventListener("pointerleave", sortir);
      cancelAnimationFrame(image);
    };
  }, []);

  return (
    <div
      role="img"
      aria-label="L'écran verrouillé d'un artisan à 19 h 04 : un nouveau projet créé depuis le message d'une cliente, une relance de facture prête à relire, un devis signé de 8 460 euros, et le résumé de sa journée."
      className="v-flotte relative w-full"
    >
      <div
        ref={cadre}
        className="v-telephone transition-transform duration-700 ease-out will-change-transform"
      >
        <div ref={ecran} className="v-ecran v-fond-soir" aria-hidden>
          <div className="v-reflet-ecran" />

          {/* Île et barre d'état */}
          <div className="absolute left-1/2 top-[2.6cqw] h-[8.6cqw] w-[29cqw] -translate-x-1/2 rounded-full bg-black" />
          <div className="absolute right-[7cqw] top-[4.4cqw] flex items-center gap-[1.4cqw] text-white/90">
            <svg viewBox="0 0 18 12" className="w-[4.6cqw]" fill="currentColor">
              <rect x="0" y="8" width="3" height="4" rx="0.8" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
              <rect x="10" y="3" width="3" height="9" rx="0.8" />
              <rect x="15" y="0" width="3" height="12" rx="0.8" opacity="0.4" />
            </svg>
            <svg viewBox="0 0 27 13" className="w-[6.6cqw]" fill="none">
              <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity="0.5" />
              <rect x="2.5" y="2.5" width="15" height="8" rx="2" fill="currentColor" />
              <rect x="24.5" y="4.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" />
            </svg>
          </div>

          {/* L'heure */}
          <div className="absolute inset-x-0 top-[15cqw] text-center text-white">
            <p className="text-[4.4cqw] font-medium tracking-wide text-white/80">Mardi 9 juin</p>
            <p className="mt-[-1cqw] font-display text-[25cqw] font-semibold leading-none tracking-[-0.03em]">
              19:04
            </p>
          </div>

          {/* Les notifications : la plus récente en haut. */}
          <div className="absolute inset-x-[3.6cqw] bottom-[19cqw] flex flex-col">
            {NOTIFICATIONS.map((n, i) => ({ n, i }))
              .reverse()
              .map(({ n, i }) => (
                <div key={n.titre} className="v-notif" data-visible={i < visibles}>
                  <div>
                    <div className="mb-[2.2cqw] flex gap-[3cqw] rounded-[5.4cqw] bg-white/[0.2] p-[3.4cqw] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/15 backdrop-blur-xl backdrop-saturate-150">
                      <span className="grid h-[9cqw] w-[9cqw] shrink-0 place-items-center rounded-[2.4cqw] bg-[#FAF8F5]">
                        <CompyoMark taille={20} className="h-[6.4cqw] w-[6.4cqw]" />
                      </span>
                      <span className="min-w-0 flex-1 text-white">
                        <span className="flex items-baseline justify-between gap-[2cqw]">
                          <span className="truncate text-[3.7cqw] font-semibold">{n.titre}</span>
                          <span className="shrink-0 text-[3.1cqw] text-white/65">{n.heure}</span>
                        </span>
                        <span className="mt-[0.4cqw] block text-[3.5cqw] leading-[1.3] text-white/90">
                          {n.texte}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Lampe et appareil photo, comme sur un vrai écran verrouillé */}
          <span className="absolute bottom-[6cqw] left-[9cqw] grid h-[11.5cqw] w-[11.5cqw] place-items-center rounded-full bg-black/25 text-white backdrop-blur-md">
            <svg viewBox="0 0 24 24" className="w-[5cqw]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3h8l-1 5H9L8 3Z" />
              <path d="M9 8v11a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8" />
              <path d="M12 12v3" />
            </svg>
          </span>
          <span className="absolute bottom-[6cqw] right-[9cqw] grid h-[11.5cqw] w-[11.5cqw] place-items-center rounded-full bg-black/25 text-white backdrop-blur-md">
            <svg viewBox="0 0 24 24" className="w-[5cqw]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
          <span className="absolute bottom-[2.2cqw] left-1/2 h-[1.3cqw] w-[35cqw] -translate-x-1/2 rounded-full bg-white/75" />
        </div>
      </div>
      {/* L'ombre portée au sol : c'est elle qui pose l'objet dans la pièce. */}
      <div
        aria-hidden
        className="absolute -bottom-10 left-1/2 h-10 w-[78%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-2xl dark:bg-black/60"
      />
    </div>
  );
}
