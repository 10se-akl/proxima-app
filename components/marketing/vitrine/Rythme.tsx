"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CompyoMark } from "@/components/marketing/CompyoMark";

// ============================================================
// Le rythme de l'accueil sur téléphone (25/09).
//
// 1. Les apparitions : chaque élément marqué [data-revele] monte et se
//    révèle en arrivant à l'écran (le style est dans vitrine.css). Ce qui
//    est déjà à l'écran au chargement ne joue pas : rien ne clignote.
//
// 2. La barre d'action : l'inscription reste toujours sous le pouce, dans
//    une capsule en bas de l'écran. Elle s'efface tant que le bouton du
//    hero est visible ([data-cache-barre] — sur un petit téléphone, il est
//    sous le pli : la barre le remplace dès le premier écran), et là où
//    elle gênerait — tout élément marqué [data-sans-barre] qui occupe le
//    bas de l'écran : la journée (plein écran), la vidéo (ses commandes
//    sont en bas) et le pied de page. Le bouton de la dernière section la
//    cache aussi : deux fois la même invitation l'une sous l'autre.
//
// Rien de tout ça au-dessus de 768 px : l'ordinateur garde son en-tête.
// ============================================================

export function Rythme() {
  const barre = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [connecte, setConnecte] = useState(false);

  // Les apparitions. 04/10 — sur ordinateur aussi : toute la vitrine vit
  // au défilement (voir Mouvement.tsx).
  useEffect(() => {
    const racine = document.querySelector<HTMLElement>(".vitrine");
    if (!racine) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = [...racine.querySelectorAll<HTMLElement>("[data-revele]")];
    const hauteur = window.innerHeight;
    for (const el of elements) {
      if (el.getBoundingClientRect().top < hauteur * 0.92) el.setAttribute("data-vu", "");
    }
    racine.setAttribute("data-anime", "");

    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-vu", "");
          obs.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    elements.filter((el) => !el.hasAttribute("data-vu")).forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // La barre : visible quand le bouton du hero n'est pas à l'écran et
  // qu'aucune zone « sans barre » n'occupe le bas de l'écran (les 18 % du
  // bas).
  useEffect(() => {
    setConnecte(document.cookie.split("; ").some((c) => c.startsWith("sb-") && c.includes("-auth-token")));
    const genes = new Set<Element>();
    let image = 0;
    const suivre = (entrees: IntersectionObserverEntry[]) => {
      for (const e of entrees) {
        if (e.isIntersecting) genes.add(e.target);
        else genes.delete(e.target);
      }
      // À l'image suivante : les deux observateurs ont alors répondu, et la
      // barre ne tressaille pas au chargement.
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => setVisible(genes.size === 0));
    };
    const bas = new IntersectionObserver(suivre, { rootMargin: "-82% 0px 0px 0px" });
    const partout = new IntersectionObserver(suivre);
    document.querySelectorAll("[data-sans-barre]").forEach((z) => bas.observe(z));
    document.querySelectorAll("[data-cache-barre]").forEach((z) => partout.observe(z));
    return () => {
      cancelAnimationFrame(image);
      bas.disconnect();
      partout.disconnect();
    };
  }, []);

  // Cachée, la barre ne doit pas non plus recevoir le focus.
  useEffect(() => {
    if (visible) barre.current?.removeAttribute("inert");
    else barre.current?.setAttribute("inert", "");
  }, [visible]);

  return (
    <div
      ref={barre}
      data-visible={visible ? "" : undefined}
      className="v-barre fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 md:hidden"
    >
      <div className="flex items-center gap-3 rounded-full bg-[#1c1512]/85 p-1.5 pl-3 text-white shadow-[0_18px_40px_-14px_rgb(0_0_0/0.7)] ring-1 ring-white/10 backdrop-blur-xl backdrop-saturate-150">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FAF8F5]">
          <CompyoMark taille={22} />
        </span>
        <p className="min-w-0 flex-1 leading-tight">
          <span className="block text-[14px] font-semibold">Compyo</span>
          <span className="block truncate text-[11.5px] text-white/60">
            {connecte ? "Votre espace vous attend" : "Bêta privée · gratuite"}
          </span>
        </p>
        <Link
          href={connecte ? "/dashboard" : "/demander-acces"}
          className="rounded-full bg-signal px-5 py-3 text-[14px] font-semibold text-white transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {connecte ? "Ouvrir" : "Rejoindre"}
        </Link>
      </div>
    </div>
  );
}
