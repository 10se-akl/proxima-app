"use client";

import { useRef } from "react";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { NOTIFICATIONS, useNotificationsSoir } from "./TelephoneSoir";

// ============================================================
// Le hero sur téléphone (25/09) : l'écran du visiteur devient l'écran
// verrouillé de l'artisan à 19h04.
//
// Sur ordinateur, on dessine un téléphone à côté du titre. Sur un
// téléphone, un téléphone dessiné dans le téléphone rendait les
// notifications minuscules : ici, pas de cadre. Les notifications arrivent
// à leur vraie taille, sur le ciel du soir, comme sur l'écran que le
// visiteur tient dans la main.
//
// La zone a une hauteur fixe : une notification qui arrive pousse les
// autres vers le bas, sous un fondu, sans jamais déplacer le bouton
// d'inscription placé dessous. Pas de boucle ici : sur le premier écran,
// l'écran verrouillé ne doit jamais se vider sous les yeux du visiteur ;
// les notifications arrivent une fois, et restent.
// ============================================================

export function EcranSoir() {
  const cadre = useRef<HTMLDivElement>(null);
  const visibles = useNotificationsSoir(cadre, false);

  return (
    <div
      ref={cadre}
      role="img"
      aria-label="À 19 h 04, sur l'écran verrouillé d'un artisan : un nouveau projet créé depuis le message d'une cliente, une relance de facture prête à relire, un devis signé de 8 460 euros, et le résumé de sa journée."
      className="relative"
    >
      <p aria-hidden className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
        Mardi 9 juin · <span className="text-white/85">19:04</span>
      </p>
      <div
        aria-hidden
        className="mt-3 h-[max(9rem,calc(100svh-37.5rem))] max-h-[21rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_68%,transparent)]"
      >
        {NOTIFICATIONS.map((n, i) => ({ n, i }))
          .reverse()
          .map(({ n, i }) => (
            <div key={n.titre} className="v-notif" data-visible={i < visibles}>
              <div>
                <div className="mb-2 flex gap-3 rounded-[1.35rem] bg-white/[0.14] px-3.5 py-3 shadow-[0_10px_30px_-14px_rgb(0_0_0/0.6)] ring-1 ring-inset ring-white/15 backdrop-blur-xl backdrop-saturate-150">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.7rem] bg-[#FAF8F5]">
                    <CompyoMark taille={26} />
                  </span>
                  <span className="min-w-0 flex-1 text-white">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[14.5px] font-semibold">{n.titre}</span>
                      <span className="shrink-0 text-[12px] text-white/60">{n.heure}</span>
                    </span>
                    <span className="mt-0.5 block text-[13.5px] leading-snug text-white/85">{n.texte}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
