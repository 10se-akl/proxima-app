"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconeRetour } from "@/components/projet/icones";
import { FOCUS } from "@/components/ui/recettes";

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
// les pages qui ont déjà le leur (fiche projet, devis) gardent le leur.
//
// 08/10 (passe de finition) — la nouvelle note, le rendez-vous et les deux
// imports perdent leur « ← Retour aux projets / au planning / aux notes » :
// on y arrive par le [+] ou depuis une fiche, et ce lien menait à une
// liste qu'on n'avait pas ouverte. Le même « Retour » partout, qui ramène
// d'où l'on vient.
// ============================================================

const PARENTS: Record<string, string> = {
  "/dashboard/devis": "/dashboard/argent",
  "/dashboard/factures": "/dashboard/argent",
  "/dashboard/bilan": "/dashboard/argent",
  "/dashboard/notes": "/dashboard",
  "/dashboard/parametres": "/dashboard",
  "/dashboard/guide": "/dashboard",
  "/dashboard/demandes/nouvelle": "/dashboard/demandes",
  "/dashboard/demandes/importer": "/dashboard/demandes",
  "/dashboard/demandes/importer-capture": "/dashboard/demandes",
  "/dashboard/notes/nouvelle": "/dashboard/notes",
  "/dashboard/planning/nouveau": "/dashboard/planning",
};

function parentDe(chemin: string): string | null {
  if (PARENTS[chemin]) return PARENTS[chemin];
  if (chemin.startsWith("/dashboard/demandes/partage/")) return "/dashboard/demandes";
  return null;
}

// Les écrans parcourus dans l'onglet, pour savoir si « l'écran d'avant »
// est bien dans Compyo. Un retour arrière (bouton, geste du téléphone)
// retire le dernier ; tout autre changement de page en ajoute un.
//
// 08/10 — « retour arrière » se reconnaît à l'événement popstate, et non
// plus au seul chemin : un lien qui ramène vers l'écran d'avant (« ←
// Projet » depuis le devis) avance dans l'historique du navigateur ; le
// compter comme un retour décalait la pile, et « Retour » menait ensuite
// au mauvais écran.
const CLE_PILE = "compyo-pile-navigation";
let retourNavigateur = false;

// Ce qu'on retrouve en revenant : les écrans de la barre et les listes.
// La fiche projet dit ainsi « ‹ Aujourd'hui » ou « ‹ Planning » quand on
// en vient, au lieu de toujours mener à « Projets ».
const LIBELLES_RETOUR: Record<string, string> = {
  "/dashboard": "Aujourd'hui",
  "/dashboard/demandes": "Projets",
  "/dashboard/planning": "Planning",
  "/dashboard/argent": "Argent",
  "/dashboard/notes": "Notes",
  "/dashboard/devis": "Devis",
  "/dashboard/factures": "Factures",
  "/dashboard/bilan": "Bilan",
};

// Revenir par l'historique montre l'écran tel qu'on l'a laissé : ce
// drapeau demande à l'écran retrouvé de se recalculer en arrivant (une
// tâche cochée sur la fiche ne doit plus figurer sur l'accueil).
const CLE_RAFRAICHIR = "compyo-rafraichir-au-retour";

/** Revient à l'écran d'avant et le remet à jour. */
export function revenir(router: { back: () => void }) {
  try {
    sessionStorage.setItem(CLE_RAFRAICHIR, "1");
  } catch {
    // Stockage bloqué : l'écran retrouvé ne se recalcule pas, c'est tout.
  }
  router.back();
}

function lirePile(): string[] {
  try {
    const valeur: unknown = JSON.parse(sessionStorage.getItem(CLE_PILE) ?? "[]");
    return Array.isArray(valeur) ? valeur.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** L'écran d'avant, s'il est dans Compyo et dans cet onglet ; sinon null. */
export function cheminPrecedent(): string | null {
  const pile = lirePile();
  if (pile.length < 2 || pile[pile.length - 1] !== window.location.pathname) return null;
  return pile[pile.length - 2];
}

function ecrirePile(pile: string[]) {
  try {
    sessionStorage.setItem(CLE_PILE, JSON.stringify(pile.slice(-30)));
  } catch {
    // Navigation privée ou stockage bloqué : le bouton mènera à la page parente.
  }
}

/** « Aujourd'hui », « Planning »… : l'écran d'avant, s'il est l'un de
 *  ceux qu'on retrouve en revenant ; sinon null. */
export function useLibelleRetour(): string | null {
  const chemin = usePathname();
  const [libelle, setLibelle] = useState<string | null>(null);
  useEffect(() => {
    const precedent = cheminPrecedent();
    setLibelle(precedent ? LIBELLES_RETOUR[precedent] ?? null : null);
  }, [chemin]);
  return libelle;
}

export function LienPrecedent() {
  const chemin = usePathname();
  const router = useRouter();
  const [precedent, setPrecedent] = useState<string | null>(null);

  useEffect(() => {
    const surRetour = () => {
      retourNavigateur = true;
    };
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, []);

  useEffect(() => {
    const pile = lirePile();
    if (pile[pile.length - 1] === chemin) {
      // Rechargement de la même page : rien ne bouge.
    } else if (retourNavigateur) {
      // Retour (ou avance) par l'historique : on se recale sur cet écran
      // s'il est dans la pile, sinon on l'ajoute.
      const i = pile.lastIndexOf(chemin);
      if (i >= 0) pile.splice(i + 1);
      else pile.push(chemin);
    } else {
      pile.push(chemin);
    }
    retourNavigateur = false;
    ecrirePile(pile);
    setPrecedent(pile.length >= 2 ? pile[pile.length - 2] : null);

    try {
      if (sessionStorage.getItem(CLE_RAFRAICHIR)) {
        sessionStorage.removeItem(CLE_RAFRAICHIR);
        router.refresh();
      }
    } catch {
      // Stockage bloqué : rien à recalculer.
    }
  }, [chemin, router]);

  const parent = parentDe(chemin);
  if (!parent) return null;

  return (
    <div className="px-4 pt-2 sm:px-8 sm:pt-5 lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:max-w-6xl lg:px-10">
      <button
        type="button"
        onClick={() => (precedent ? revenir(router) : router.push(parent))}
        // Design v3 (24/10) : rayon 14 des boutons, appui en couleur.
        className={`-ml-2 inline-flex min-h-12 items-center gap-1 rounded-full pl-1 pr-3 text-base font-medium text-steel active:bg-ink/10 sm:hover:text-ink motion-safe:transition-colors ${FOCUS}`}
      >
        <IconeRetour className="h-5 w-5" /> Retour
      </button>
    </div>
  );
}
