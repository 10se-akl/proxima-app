"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Feuille } from "@/components/projet/Feuille";
import { IconeCrayon, IconeDocument, IconeMicro, IconePhoto } from "@/components/projet/icones";
import { obtenirClasseReconnaissance } from "@/lib/dictee";

// ============================================================
// La capture d'un nouveau projet (26/09 — « moins mais mieux », lots A et
// C) — ce qu'ouvre le bouton [+] de la navigation. La seule porte
// d'entrée pour créer un projet dans l'application.
//
// Avant, quatre portes de même importance (créer, importer un message,
// importer une capture, dicter). Maintenant, un très grand micro au
// centre — parler est le plus rapide sur un chantier, les mains prises —
// et, en dessous, trois choix plus petits, au même niveau entre eux.
//
// L'enregistrement ne démarre pas à l'ouverture de la feuille : un appui
// sur le micro le lance (le parcours de dictée existant démarre l'écoute
// en arrivant). Un enregistrement involontaire serait pire qu'un geste de
// plus. Si le navigateur ne sait pas dicter, ou si le micro a été refusé,
// le grand bouton devient « Écrire », à la même taille, sans message
// d'erreur technique.
//
// Le partage depuis WhatsApp ou les SMS (Web Share Target) reste le
// chemin le plus rapide et ne passe pas par ici.
// ============================================================

const DICTER = "/dashboard/demandes/nouvelle?dictee=1";
const ECRIRE = "/dashboard/demandes/nouvelle";

export function FeuilleCapture({ ouverte, surFermer }: { ouverte: boolean; surFermer: () => void }) {
  const [micro, setMicro] = useState(true);

  useEffect(() => {
    if (!ouverte) return;
    if (!obtenirClasseReconnaissance()) {
      setMicro(false);
      return;
    }
    // Micro refusé une fois pour ce site : inutile de le proposer.
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((etat) => setMicro(etat.state !== "denied"))
      .catch(() => {});
  }, [ouverte]);

  const secondaires = [
    { href: "/dashboard/demandes/importer", libelle: "Coller un message", icone: <IconeDocument className="h-5 w-5" />, visible: true },
    { href: "/dashboard/demandes/importer-capture", libelle: "Photo ou capture", icone: <IconePhoto className="h-5 w-5" />, visible: true },
    { href: ECRIRE, libelle: "Écrire", icone: <IconeCrayon className="h-5 w-5" />, visible: micro },
  ].filter((s) => s.visible);

  return (
    <Feuille ouverte={ouverte} titre="Nouveau projet" surFermer={surFermer}>
      <div className="flex flex-col items-center pb-2 pt-3">
        <Link
          href={micro ? DICTER : ECRIRE}
          onClick={surFermer}
          className="group flex flex-col items-center gap-3 focus-visible:outline-none"
        >
          <span className="grid h-28 w-28 place-items-center rounded-full bg-signal text-white shadow-[0_18px_40px_-16px_rgb(var(--c-signal)/0.9)] transition-transform group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-signal/40">
            {micro ? <IconeMicro className="h-12 w-12" /> : <IconeCrayon className="h-11 w-11" />}
          </span>
          <span className="font-display text-xl font-semibold text-ink">{micro ? "Parler" : "Écrire"}</span>
        </Link>

        <ul className="mt-8 grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${secondaires.length}, minmax(0, 1fr))` }}>
          {secondaires.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                onClick={surFermer}
                className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-ink/[0.05] px-2 text-center text-[13px] font-medium leading-tight text-ink/75 transition hover:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
              >
                <span className="text-ink/55">{s.icone}</span>
                {s.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Feuille>
  );
}
