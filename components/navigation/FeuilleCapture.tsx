"use client";

import Link from "next/link";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron, IconeCrayon, IconeDocument, IconePhoto } from "@/components/projet/icones";
import { IconeNote } from "@/components/ui/Icones";
import { CARTE, FOCUS, SECONDAIRE, TUILE_ICONE } from "@/components/ui/recettes";

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

// 06/10 (« le compagnon ») — plus de pastille « IA » : chaque ligne dit ce
// qu'on obtient. Le champ `ia` reste, pour mémoire de ce qui appelle l'IA.
type Choix = { href: string; libelle: string; detail: string; icone: React.ReactNode; ia: boolean };

export const CHOIX_CAPTURE: Choix[] = [
  {
    href: "/dashboard/demandes/importer",
    libelle: "Coller un message",
    detail: "Le SMS ou le WhatsApp du client devient un projet.",
    icone: <IconeDocument className="h-6 w-6" />,
    ia: false,
  },
  {
    href: "/dashboard/demandes/importer-capture",
    libelle: "Photo ou capture",
    detail: "Une capture d'écran de la conversation suffit.",
    icone: <IconePhoto className="h-6 w-6" />,
    ia: false,
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

// Design v3 (24/10) : chaque porte est une carte (surface + ombre douce, plus
// de contour), haute de 76 px : tuile d'icône neutre de 48 px, titre en
// 17 semi-gras, une ligne de détail en gris lisible. La même ligne sert à
// l'accueil d'un compte neuf (components/accueil/PremiersPas.tsx).
export function LigneChoix({ c, surFermer }: { c: Choix; surFermer: () => void }) {
  return (
    <Link
      href={c.href}
      onClick={surFermer}
      className={`${CARTE} flex min-h-[4.75rem] items-center gap-4 px-4 py-3 active:bg-paper-warm sm:hover:bg-paper-warm/60 motion-safe:transition-colors ${FOCUS}`}
    >
      <span className={`${TUILE_ICONE} !h-12 !w-12`}>{c.icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold leading-snug text-ink">{c.libelle}</span>
        <span className={`mt-0.5 block leading-snug ${SECONDAIRE}`}>{c.detail}</span>
      </span>
      <IconeChevron className="h-5 w-5 shrink-0 text-steel" />
    </Link>
  );
}

export function FeuilleCapture({ ouverte, surFermer }: { ouverte: boolean; surFermer: () => void }) {
  return (
    <Feuille ouverte={ouverte} titre="Nouveau projet" surFermer={surFermer}>
      <ul className="flex flex-col gap-3">
        {CHOIX_CAPTURE.map((c) => (
          <li key={c.href}>
            <LigneChoix c={c} surFermer={surFermer} />
          </li>
        ))}
      </ul>
      {/* À part : ce n'est pas un projet. Design v3 (24/10) : un vide et un
          petit titre plutôt qu'un filet. */}
      <p className={`mt-6 px-1 ${SECONDAIRE}`}>Autre chose</p>
      <div className="mt-2">
        <LigneChoix c={NOTE} surFermer={surFermer} />
      </div>
    </Feuille>
  );
}
