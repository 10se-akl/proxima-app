"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconeRetour } from "@/components/projet/icones";

// ============================================================
// « Retour » sur les pages secondaires (04/10, retour d'Axel après la
// mise en ligne : « je n'ai pas de bouton retour »).
//
// Devis, Factures, Bilan, Notes, Paramètres, Guide, Nouveau projet : on
// y arrive depuis Argent, la cloche ou le menu du compte, et rien ne
// ramenait en arrière. Dans l'application installée (sur ordinateur
// surtout), il n'y a pas non plus de flèche du navigateur : on restait
// coincé, sauf à repasser par la barre latérale.
//
// Le bouton ramène à l'écran d'où l'on vient. Si l'on est arrivé
// directement sur la page (lien, notification, rechargement en début de
// visite), il mène à la page parente : Argent, Projets ou Aujourd'hui.
// Les onglets (Aujourd'hui, Projets, Planning, Argent) n'en ont pas, et
// les pages qui ont déjà le leur (fiche projet, devis, nouvelle note,
// nouveau rendez-vous, import) gardent le leur.
// ============================================================

const PARENTS: Record<string, string> = {
  "/dashboard/devis": "/dashboard/argent",
  "/dashboard/factures": "/dashboard/argent",
  "/dashboard/bilan": "/dashboard/argent",
  "/dashboard/notes": "/dashboard",
  "/dashboard/parametres": "/dashboard",
  "/dashboard/guide": "/dashboard",
  "/dashboard/demandes/nouvelle": "/dashboard/demandes",
};

function parentDe(chemin: string): string | null {
  if (PARENTS[chemin]) return PARENTS[chemin];
  if (chemin.startsWith("/dashboard/demandes/partage/")) return "/dashboard/demandes";
  return null;
}

// Les écrans parcourus dans l'onglet, pour savoir si « l'écran d'avant »
// est bien dans Compyo. Un retour arrière (bouton, geste du téléphone)
// retire le dernier ; tout autre changement de page en ajoute un.
const CLE_PILE = "compyo-pile-navigation";

function lirePile(): string[] {
  try {
    const valeur: unknown = JSON.parse(sessionStorage.getItem(CLE_PILE) ?? "[]");
    return Array.isArray(valeur) ? valeur.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function ecrirePile(pile: string[]) {
  try {
    sessionStorage.setItem(CLE_PILE, JSON.stringify(pile.slice(-30)));
  } catch {
    // Navigation privée ou stockage bloqué : le bouton mènera à la page parente.
  }
}

export function LienPrecedent() {
  const chemin = usePathname();
  const router = useRouter();
  const [precedent, setPrecedent] = useState<string | null>(null);

  useEffect(() => {
    const pile = lirePile();
    if (pile[pile.length - 1] === chemin) {
      // Rechargement de la même page : rien ne bouge.
    } else if (pile[pile.length - 2] === chemin) {
      pile.pop();
    } else {
      pile.push(chemin);
    }
    ecrirePile(pile);
    setPrecedent(pile.length >= 2 ? pile[pile.length - 2] : null);
  }, [chemin]);

  const parent = parentDe(chemin);
  if (!parent) return null;

  return (
    <div className="px-4 pt-2 sm:px-8 sm:pt-5">
      <button
        type="button"
        onClick={() => (precedent ? router.back() : router.push(parent))}
        className="-ml-2 inline-flex min-h-12 items-center gap-1 rounded-xl pl-1 pr-3 text-base text-steel active:bg-ink/10 sm:hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <IconeRetour className="h-5 w-5" /> Retour
      </button>
    </div>
  );
}
