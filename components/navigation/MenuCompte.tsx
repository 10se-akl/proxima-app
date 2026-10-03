"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron } from "@/components/projet/icones";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BoutonInstallerDiscret } from "@/components/pwa/BoutonInstallerDiscret";
import { IconeGuide, IconeParametres, IconeRetours } from "@/components/ui/Icones";

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
        className="grid h-12 w-12 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
      >
        {/* Un petit visuel dans une grande cible (règle 17). */}
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-display text-sm font-semibold text-white"
        >
          {initialesCompte(nom)}
        </span>
      </button>

      <Feuille ouverte={ouvert} titre="Compte" surFermer={() => setOuvert(false)}>
        {nom && <p className="mb-2 truncate text-sm text-steel">{nom}</p>}
        <ul className="flex flex-col">
          {LIENS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOuvert(false)}
                aria-current={estDans(pathname, l.href) ? "page" : undefined}
                className="flex min-h-14 items-center gap-3.5 border-b border-ink/15 text-base text-ink active:bg-ink/10"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink/[0.06] text-ink">
                  <l.Icone taille={19} />
                </span>
                <span className={`flex-1 ${estDans(pathname, l.href) ? "font-semibold" : ""}`}>{l.label}</span>
                <IconeChevron className="h-4 w-4 text-steel" />
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setOuvert(false);
                ouvrirRetour();
              }}
              className="flex min-h-14 w-full items-center gap-3.5 border-b border-ink/15 text-left text-base text-ink active:bg-ink/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink/[0.06] text-ink">
                <IconeRetours taille={19} />
              </span>
              <span className="flex-1">Donner mon avis</span>
              <IconeChevron className="h-4 w-4 text-steel" />
            </button>
          </li>
        </ul>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-ink">
            <ThemeToggle className="grid h-12 w-12 place-items-center rounded-2xl active:bg-ink/10 sm:hover:bg-ink/5" />
            <BoutonInstallerDiscret
              compact
              className="grid h-12 w-12 place-items-center rounded-2xl active:bg-ink/10 sm:hover:bg-ink/5"
            />
          </div>
          {/* La confirmation reste dans surDeconnexion (Sidebar.tsx). */}
          <button
            type="button"
            onClick={surDeconnexion}
            className="min-h-12 px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
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
      actif ? "font-semibold text-white" : "text-white/75 hover:text-white"
    }`;
  return (
    <nav aria-label="Compte" className="flex flex-wrap items-center gap-x-2 px-2">
      {LIENS.map((l) => (
        <span key={l.href} className="flex items-center gap-x-2">
          <Link href={l.href} aria-current={estDans(pathname, l.href) ? "page" : undefined} className={classe(estDans(pathname, l.href))}>
            {l.label}
          </Link>
          <span aria-hidden className="text-white/30">
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
