"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
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
        className="absolute inset-0 cursor-default feuille-voile bg-ink/40 backdrop-blur-[2px]"
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
        className={`relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[1.6rem] bg-paper shadow-2xl ring-1 ring-ink/10 outline-none feuille-panneau sm:rounded-[1.6rem] ${
          large ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/[0.07] px-5 py-3.5">
          {/* La poignée, sur téléphone */}
          <span aria-hidden className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-ink/15 sm:hidden" />
          <h2 id={idTitre} className="font-display text-[17px] font-semibold text-ink">
            {titre}
          </h2>
          <button
            type="button"
            data-fermer
            onClick={surFermer}
            aria-label="Fermer"
            className="-mr-2 grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink/55 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
          >
            <IconeFermer className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 [padding-bottom:calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body
  );
}
