"use client";

import Link from "next/link";
import { Feuille } from "@/components/projet/Feuille";

// ============================================================
// La capture d'un nouveau projet (26/09) — ce qu'ouvre le bouton [+] de
// la navigation. Une seule porte d'entrée, partout dans l'application.
//
// Elle ne fait que choisir le parcours : chacun reste celui qui existait
// déjà (dictée, message, capture d'écran, saisie), avec ses replis et la
// détection d'un client existant.
// ============================================================

const PARCOURS = [
  { href: "/dashboard/demandes/nouvelle?dictee=1", libelle: "Parler" },
  { href: "/dashboard/demandes/importer", libelle: "Coller un message" },
  { href: "/dashboard/demandes/importer-capture", libelle: "Photo ou capture" },
  { href: "/dashboard/demandes/nouvelle", libelle: "Écrire" },
];

export function FeuilleCapture({ ouverte, surFermer }: { ouverte: boolean; surFermer: () => void }) {
  return (
    <Feuille ouverte={ouverte} titre="Nouveau projet" surFermer={surFermer}>
      <ul className="flex flex-col gap-2">
        {PARCOURS.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              onClick={surFermer}
              className="flex min-h-12 items-center rounded-2xl bg-surface px-4 text-[15px] font-medium text-ink ring-1 ring-ink/10 transition hover:ring-ink/25"
            >
              {p.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </Feuille>
  );
}
