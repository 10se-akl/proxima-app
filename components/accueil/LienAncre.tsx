"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// ============================================================
// Un lien qui ouvre une page sur un bloc précis (refonte 03/10 — duel B,
// lot 4 : « Facturer » ouvre la fiche sur son bloc Facturation).
//
// La fiche projet charge ses données après l'arrivée : quand Next.js
// cherche l'ancre (#facturation), le bloc n'existe pas encore, et la page
// reste en haut. On attend donc qu'il apparaisse (dix secondes au plus),
// puis on le fait venir sous la barre du haut. Rien ne change sur la fiche.
// ============================================================

const ATTENTE_MAX_MS = 10000;
// La barre du haut du téléphone est collante : le bloc s'arrête dessous.
const MARGE_HAUT_PX = 72;

function amenerQuandPresent(id: string) {
  if (typeof MutationObserver === "undefined") return;
  const amener = () => {
    const el = document.getElementById(id);
    if (!el) return false;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - MARGE_HAUT_PX });
    return true;
  };
  const observateur = new MutationObserver(() => {
    if (amener()) observateur.disconnect();
  });
  observateur.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observateur.disconnect(), ATTENTE_MAX_MS);
}

export function LienAncre({
  href,
  ancre,
  className,
  children,
}: {
  href: string;
  ancre: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={`${href}#${ancre}`} className={className} onClick={() => amenerQuandPresent(ancre)}>
      {children}
    </Link>
  );
}
