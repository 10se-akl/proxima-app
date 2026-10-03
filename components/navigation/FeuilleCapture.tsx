"use client";

import Link from "next/link";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron, IconeCrayon, IconeDocument, IconeEtincelle, IconePhoto } from "@/components/projet/icones";
import { IconeNote } from "@/components/ui/Icones";

// ============================================================
// La capture d'un nouveau projet — ce qu'ouvre le bouton [+] de la
// navigation, la seule porte d'entrée pour créer un projet.
//
// 27/09 — Retour d'Axel : le grand micro « Parler » « sert à rien et
// marche pas bien » (la dictée du navigateur est capricieuse dans
// l'application installée), et même lui ne comprenait pas toujours quoi
// choisir. Le micro est retiré : trois lignes, chacune dit en une phrase
// ce qu'elle fait, et celles où l'IA travaille le montrent (l'étincelle et
// le mot « IA ») — on le sait avant d'appuyer. Pour parler plutôt
// qu'écrire, le micro du clavier du téléphone marche partout.
//
// Refonte (03/10 — duel B, lot 3) : « Plus » a quitté la barre du bas, et
// avec lui la porte des notes. Une quatrième ligne, à part, crée une note
// (sans rappel par défaut : « Me le rappeler » reste un choix). Les
// couleurs suivent le langage : icônes en encre, détail en gris lisible.
//
// Le partage depuis WhatsApp ou les SMS (Web Share Target) reste le
// chemin le plus rapide et ne passe pas par ici.
// ============================================================

type Choix = { href: string; libelle: string; detail: string; icone: React.ReactNode; ia: boolean };

const CHOIX: Choix[] = [
  {
    href: "/dashboard/demandes/importer",
    libelle: "Coller un message",
    detail: "Le SMS ou le WhatsApp du client : l'IA prépare le projet.",
    icone: <IconeDocument className="h-6 w-6" />,
    ia: true,
  },
  {
    href: "/dashboard/demandes/importer-capture",
    libelle: "Photo ou capture",
    detail: "Une capture d'écran de la conversation : l'IA la lit pour vous.",
    icone: <IconePhoto className="h-6 w-6" />,
    ia: true,
  },
  {
    href: "/dashboard/demandes/nouvelle",
    libelle: "Écrire moi-même",
    detail: "Le nom du client, son numéro, ce qu'il veut.",
    icone: <IconeCrayon className="h-6 w-6" />,
    ia: false,
  },
];

const NOTE: Choix = {
  href: "/dashboard/notes/nouvelle",
  libelle: "Une note ou un rappel",
  detail: "Une chose à ne pas oublier.",
  icone: <IconeNote taille={24} />,
  ia: false,
};

function LigneChoix({ c, surFermer }: { c: Choix; surFermer: () => void }) {
  return (
    <Link
      href={c.href}
      onClick={surFermer}
      className="flex min-h-[4.75rem] items-center gap-4 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/15 active:bg-ink/10 sm:hover:bg-ink/5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink/[0.06] text-ink">{c.icone}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-base font-semibold text-ink">
          {c.libelle}
          {c.ia && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-semibold text-ink">
              <IconeEtincelle className="h-3 w-3" /> IA
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-steel">{c.detail}</span>
      </span>
      <IconeChevron className="h-4 w-4 shrink-0 text-steel" />
    </Link>
  );
}

export function FeuilleCapture({ ouverte, surFermer }: { ouverte: boolean; surFermer: () => void }) {
  return (
    <Feuille ouverte={ouverte} titre="Nouveau projet" surFermer={surFermer}>
      <ul className="flex flex-col gap-2.5">
        {CHOIX.map((c) => (
          <li key={c.href}>
            <LigneChoix c={c} surFermer={surFermer} />
          </li>
        ))}
      </ul>
      {/* À part : ce n'est pas un projet. */}
      <div className="mt-4 border-t border-ink/15 pt-4">
        <LigneChoix c={NOTE} surFermer={surFermer} />
      </div>
    </Feuille>
  );
}
