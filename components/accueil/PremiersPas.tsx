"use client";

import { CHOIX_CAPTURE, LigneChoix } from "@/components/navigation/FeuilleCapture";

// ============================================================
// L'accueil d'un compte neuf (22/10, panel de 18 faux clients).
//
// « Bienvenue… et puis rien. Une page blanche avec un bouton. » Les trois
// portes du [+] sont posées directement sur la page (les mêmes liens que
// la feuille « Nouveau projet », components/navigation/FeuilleCapture), avec
// la promesse qui rassurait le plus : rien ne part sans vous.
// ============================================================

export function PremiersPas() {
  return (
    <section aria-label="Créer votre premier projet">
      <p className="text-base text-ink">Un client vous a écrit ? Partez de son message :</p>
      <div className="mt-3 flex flex-col gap-2.5">
        {CHOIX_CAPTURE.map((c) => (
          <LigneChoix key={c.href} c={c} surFermer={() => {}} />
        ))}
      </div>
      <p className="mt-3 text-sm text-steel">Compyo prépare la fiche du client. Vous relisez avant que rien ne parte.</p>
    </section>
  );
}
