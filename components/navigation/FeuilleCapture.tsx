"use client";

import Link from "next/link";
import { Feuille } from "@/components/projet/Feuille";
import { IconeChevron, IconeCrayon, IconeDocument, IconeEtincelle, IconePhoto } from "@/components/projet/icones";

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
// Le partage depuis WhatsApp ou les SMS (Web Share Target) reste le
// chemin le plus rapide et ne passe pas par ici.
// ============================================================

const CHOIX = [
  {
    href: "/dashboard/demandes/importer",
    libelle: "Coller un message",
    detail: "Le SMS ou le WhatsApp du client : l'IA prépare le projet.",
    icone: <IconeDocument className="h-6 w-6" />,
    ia: true,
  },
  {
    href: "/dashboard/demandes/importer-capture",
    libelle: "Photo ou capture",
    detail: "Une capture d'écran de la conversation : l'IA la lit pour vous.",
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

export function FeuilleCapture({ ouverte, surFermer }: { ouverte: boolean; surFermer: () => void }) {
  return (
    <Feuille ouverte={ouverte} titre="Nouveau projet" surFermer={surFermer}>
      <ul className="flex flex-col gap-2.5">
        {CHOIX.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              onClick={surFermer}
              className="flex min-h-[4.75rem] items-center gap-4 rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/10 transition hover:ring-ink/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-signal/10 text-signal">{c.icone}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                  {c.libelle}
                  {c.ia && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11.5px] font-semibold text-ink/70">
                      <IconeEtincelle className="h-3 w-3" /> IA
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[14px] leading-snug text-ink/65">{c.detail}</span>
              </span>
              <IconeChevron className="h-4 w-4 shrink-0 text-ink/30" />
            </Link>
          </li>
        ))}
      </ul>
    </Feuille>
  );
}
