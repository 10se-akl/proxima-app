"use client";

import { useEffect, useId, useRef, type PointerEvent as EvenementPointeur, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconeFermer } from "./icones";
import { annoncerNavigation, protegerFeuilleDuRetour } from "@/lib/retourFeuilles";

// ============================================================
// Une « feuille » (24/09) : ce qui s'ouvre par-dessus la fiche projet pour
// une action précise (ajouter, modifier les infos, relire une réponse…).
// Monte du bas sur téléphone, au pouce ; s'ouvre au centre sur ordinateur.
//
// La fiche elle-même ne porte plus aucun formulaire ouvert en permanence :
// c'est ce qui la garde lisible. Chaque saisie vit ici, le temps de la
// faire.
//
// Accessibilité : dialogue modal, titre annoncé, Échap ferme, le focus
// entre dans la feuille à l'ouverture et revient au bouton qui l'a
// ouverte à la fermeture, le défilement de la page est bloqué derrière.
// ============================================================

export function Feuille({
  ouverte,
  titre,
  surFermer,
  children,
  large = false,
}: {
  ouverte: boolean;
  titre: string;
  surFermer: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  const idTitre = useId();
  const panneau = useRef<HTMLDivElement>(null);
  const retourFocus = useRef<HTMLElement | null>(null);
  const fermer = useRef(surFermer);
  // Design v3 : le geste « tirer vers le bas » en cours (voir debutGlisser).
  const glisse = useRef<{ y: number; t: number; dy: number } | null>(null);
  fermer.current = surFermer;

  useEffect(() => {
    if (!ouverte) return;
    retourFocus.current = document.activeElement as HTMLElement | null;
    const ancienDebordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Le premier élément utile, sinon le panneau lui-même.
    const premier = panneau.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), textarea, select, button:not([data-fermer]), [href]"
    );
    (premier ?? panneau.current)?.focus({ preventScroll: true });

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fermer.current();
      }
      // Le focus reste dans la feuille.
      if (e.key === "Tab" && panneau.current) {
        const focusables = [...panneau.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )].filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const premierEl = focusables[0];
        const dernierEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === premierEl) {
          e.preventDefault();
          dernierEl.focus();
        } else if (!e.shiftKey && document.activeElement === dernierEl) {
          e.preventDefault();
          premierEl.focus();
        }
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = ancienDebordement;
      retourFocus.current?.focus?.({ preventScroll: true });
    };
  }, [ouverte]);

  // 27/09 — Le geste « retour » du téléphone ferme la feuille au lieu de
  // quitter la page (voir lib/retourFeuilles.ts).
  useEffect(() => {
    if (!ouverte) return;
    return protegerFeuilleDuRetour(() => fermer.current());
  }, [ouverte]);

  if (!ouverte) return null;

  // Design v3 (23/10) — tirer la poignée (ou le titre) vers le bas ferme la
  // feuille, comme une feuille native : au-delà de 80 px, ou d'un geste
  // rapide. Seulement au doigt ou au stylet, et jamais depuis le contenu
  // (son défilement reste libre).
  function debutGlisser(e: EvenementPointeur<HTMLDivElement>) {
    if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("button")) return;
    glisse.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function pendantGlisser(e: EvenementPointeur<HTMLDivElement>) {
    if (!glisse.current || !panneau.current) return;
    const dy = Math.max(0, e.clientY - glisse.current.y);
    glisse.current.dy = dy;
    panneau.current.style.transition = "none";
    panneau.current.style.transform = `translateY(${dy}px)`;
  }
  function finGlisser(e: EvenementPointeur<HTMLDivElement>) {
    const g = glisse.current;
    glisse.current = null;
    if (!g || !panneau.current) return;
    const vitesse = g.dy / Math.max(1, e.timeStamp - g.t);
    panneau.current.style.transition = "transform 160ms cubic-bezier(0.2, 0, 0, 1)";
    const el = panneau.current;
    // Toujours remettre en place : si la fermeture est refusée (un retrait
    // en cours, par exemple), la feuille ne reste pas à moitié descendue.
    el.style.transform = "";
    if (g.dy > 80 || (g.dy > 16 && vitesse > 0.5)) surFermer();
  }

  // 26/09 — rendue dans <body> : ouverte depuis un bloc positionné (un
  // rendez-vous du planning), elle doit couvrir tout l'écran quel que soit
  // le parent qui l'appelle.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Fermer"
        data-fermer
        tabIndex={-1}
        onClick={surFermer}
        className="absolute inset-0 cursor-default feuille-voile bg-black/40 dark:bg-black/60"
      />
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        // Un lien vers un autre écran : la feuille le laisse naviguer sans
        // toucher à l'historique (voir lib/retourFeuilles.ts).
        onClickCapture={(e) => {
          const lien = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
          if (
            lien &&
            lien.origin === window.location.origin &&
            !lien.target &&
            !lien.hasAttribute("download") &&
            lien.pathname + lien.search !== window.location.pathname + window.location.search
          ) {
            annoncerNavigation();
          }
        }}
        className={`relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[28px] bg-paper ombre-feuille outline-none feuille-panneau sm:rounded-[28px] ${
          large ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div
          onPointerDown={debutGlisser}
          onPointerMove={pendantGlisser}
          onPointerUp={finGlisser}
          onPointerCancel={finGlisser}
          className="flex touch-none items-center justify-between gap-3 px-5 pb-2 pt-5 sm:pt-4"
        >
          {/* La poignée, sur téléphone : elle se tire. */}
          <span aria-hidden className="absolute left-1/2 top-2 h-[5px] w-10 -translate-x-1/2 rounded-full bg-steel/60 sm:hidden" />
          <h2 id={idTitre} className="font-display text-xl font-semibold text-ink">
            {titre}
          </h2>
          <button
            type="button"
            data-fermer
            onClick={surFermer}
            aria-label="Fermer"
            className="-mr-2 grid h-12 w-12 shrink-0 place-items-center rounded-full text-steel active:bg-ink/10 motion-safe:transition-colors sm:hover:bg-ink/5 sm:hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <IconeFermer className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2 [padding-bottom:calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body
  );
}
