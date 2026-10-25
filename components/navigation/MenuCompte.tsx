"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron } from "@/components/projet/icones";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BoutonInstallerDiscret } from "@/components/pwa/BoutonInstallerDiscret";
import { IconeGuide, IconeParametres, IconeRetours } from "@/components/ui/Icones";
import { CompyoMark } from "@/components/marketing/CompyoMark";
import { BOUTON_TEXTE, FOCUS, GROUPE, SECONDAIRE, TUILE_ICONE } from "@/components/ui/recettes";

// Design v3 (24/10) : les liens du compte en liste groupée (surface, ombre
// douce, filets fins), lignes de 60 px, tuile d'icône neutre.
const LIGNE = `flex min-h-[3.75rem] w-full items-center gap-3.5 px-4 text-left text-[17px] text-ink active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink`;

// ============================================================
// Le compte (refonte 03/10 — duel B, lot 1).
//
// Paramètres, le guide et l'avis ne servent pas tous les jours : sur
// téléphone, ils quittent la feuille « Plus » et passent derrière un
// avatar, en haut à droite, à côté de la cloche. L'avatar ouvre la feuille
// « Compte » : Paramètres, Guide, Donner mon avis, puis le thème,
// l'installation et la déconnexion (toujours précédée d'une question).
// La barre du bas ne garde que des destinations quotidiennes.
//
// Sur ordinateur, aucun menu ne s'ouvre : les mêmes liens sont à un clic,
// en bas de la barre latérale (LiensCompte).
// ============================================================

/** Ouvre la feuille « Faire un retour » (components/dashboard/BoutonRetour.tsx). */
export function ouvrirRetour() {
  window.dispatchEvent(new CustomEvent("compyo:ouvrir-retour"));
}

/** « Gérard Martin » → « GM » ; une adresse e-mail → sa première lettre. */
export function initialesCompte(nom: string): string {
  const propre = nom.trim();
  if (!propre) return "?";
  if (propre.includes("@")) return propre[0].toUpperCase();
  const mots = propre.split(/\s+/).filter(Boolean);
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

const LIENS = [
  { href: "/dashboard/parametres", label: "Paramètres", Icone: IconeParametres },
  { href: "/dashboard/guide", label: "Guide", Icone: IconeGuide },
];

const estDans = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Téléphone : l'avatar de la barre du haut, et sa feuille « Compte ». */
export function MenuCompte({ nom, surDeconnexion }: { nom: string; surDeconnexion: () => void }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Changer de page ferme la feuille.
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label="Compte"
        className="grid h-12 w-12 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
      >
        {/* Un petit visuel dans une grande cible (règle 17). */}
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-full bg-ink font-display text-sm font-semibold text-paper"
        >
          {initialesCompte(nom)}
        </span>
      </button>

      <Feuille ouverte={ouvert} titre="Compte" surFermer={() => setOuvert(false)}>
        {nom && <p className={`mb-3 truncate px-1 ${SECONDAIRE}`}>{nom}</p>}
        <ul className={GROUPE}>
          {LIENS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOuvert(false)}
                aria-current={estDans(pathname, l.href) ? "page" : undefined}
                className={LIGNE}
              >
                <span className={TUILE_ICONE}>
                  <l.Icone taille={20} />
                </span>
                <span className={`flex-1 ${estDans(pathname, l.href) ? "font-semibold" : ""}`}>{l.label}</span>
                <IconeChevron className="h-5 w-5 text-steel" />
              </Link>
            </li>
          ))}
          {/* 23/10 — demande d'Axel : sur téléphone, rien ne ramenait au site
              (présentation, tarifs, questions fréquentes). « / » ne renvoie
              pas un compte connecté vers l'appli (middleware.ts). */}
          <li>
            <Link
              href="/"
              onClick={() => setOuvert(false)}
              className={LIGNE}
            >
              <span aria-hidden className={TUILE_ICONE}>
                <CompyoMark taille={20} />
              </span>
              <span className="flex-1">Voir le site Compyo</span>
              <IconeChevron className="h-5 w-5 text-steel" />
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setOuvert(false);
                ouvrirRetour();
              }}
              className={LIGNE}
            >
              <span className={TUILE_ICONE}>
                <IconeRetours taille={20} />
              </span>
              <span className="flex-1">Donner mon avis</span>
              <IconeChevron className="h-5 w-5 text-steel" />
            </button>
          </li>
        </ul>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-ink">
            <ThemeToggle className={`grid h-12 w-12 place-items-center rounded-full active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors ${FOCUS}`} />
            <BoutonInstallerDiscret
              compact
              className={`grid h-12 w-12 place-items-center rounded-full active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors ${FOCUS}`}
            />
          </div>
          {/* La confirmation reste dans surDeconnexion (Sidebar.tsx). */}
          <button
            type="button"
            onClick={surDeconnexion}
            className={`-mr-3 ${BOUTON_TEXTE}`}
          >
            Se déconnecter
          </button>
        </div>
      </Feuille>
    </>
  );
}

/** Ordinateur : Paramètres · Guide · Donner mon avis, à un clic, en bas de
 *  la barre latérale. Rien ne s'ouvre, rien ne recouvre la navigation. */
export function LiensCompte() {
  const pathname = usePathname();
  const classe = (actif: boolean) =>
    `flex items-center rounded-lg text-sm transition-colors [@media(pointer:coarse)]:min-h-12 ${
      actif ? "font-semibold text-ink" : "text-steel hover:text-ink"
    }`;
  return (
    <nav aria-label="Compte" className="flex flex-wrap items-center gap-x-2 px-2">
      {LIENS.map((l) => (
        <span key={l.href} className="flex items-center gap-x-2">
          <Link href={l.href} aria-current={estDans(pathname, l.href) ? "page" : undefined} className={classe(estDans(pathname, l.href))}>
            {l.label}
          </Link>
          <span aria-hidden className="text-steel">
            ·
          </span>
        </span>
      ))}
      <button type="button" onClick={ouvrirRetour} aria-label="Donner mon avis" className={classe(false)}>
        Avis
      </button>
    </nav>
  );
}
