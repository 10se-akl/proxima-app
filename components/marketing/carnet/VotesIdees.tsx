"use client";

import { useEffect, useState } from "react";
import type { Idee, ResultatVote } from "@/lib/ideesVotees";

// ============================================================
// « Pas encore dans Compyo : votre avis décide » (01/11/2026), devenu un
// sondage le 02/11 (idée d'Axel) : après un vote, chaque bouton se remplit
// jusqu'à son pourcentage (« Bonne idée 78 % · Pas pour moi 22 % »).
//
// Le vote passe par la mesure d'audience maison (/api/visite, Module 44),
// qui ne garde ni adresse IP, ni cookie, ni compte : il est compté comme
// une « page » /vote/<idée>/<oui|non>. Les résultats viennent de
// /api/votes-idees (des totaux, rien d'autre). Un vote compté par idée et
// par téléphone ; on peut changer d'avis à l'écran. Rien n'est montré
// avant d'avoir voté, pour ne pas influencer.
// ============================================================

type Choix = "oui" | "non";
const CLE = "compyo-votes-idees";

function lire(): Record<string, Choix> {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(CLE) ?? "{}");
    return v && typeof v === "object" ? (v as Record<string, Choix>) : {};
  } catch {
    return {};
  }
}

// Les tests d'Axel ne comptent pas (même réglage que la mesure d'audience).
function neRienCompter(): boolean {
  try {
    return window.localStorage.getItem("compyo-ne-pas-mesurer") === "1";
  } catch {
    return false;
  }
}

function envoyer(id: string, choix: Choix) {
  const corps = JSON.stringify({ chemin: `/vote/${id}/${choix}`, referent: "", source: "", tactile: navigator.maxTouchPoints > 1 });
  try {
    const parti = navigator.sendBeacon?.("/api/visite", new Blob([corps], { type: "application/json" }));
    if (!parti)
      fetch("/api/visite", { method: "POST", body: corps, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // Le vote ne doit jamais gêner la page.
  }
}

async function chargerResultats(): Promise<Record<string, ResultatVote> | null> {
  try {
    const r = await fetch("/api/votes-idees", { cache: "no-store" });
    return r.ok ? ((await r.json()) as Record<string, ResultatVote>) : null;
  } catch {
    return null;
  }
}

/** Les chiffres affichés : ceux du serveur, et au moins le vote de ce
 *  téléphone (il peut ne pas être encore compté, ou ne pas l'être du tout). */
function chiffres(serveur: ResultatVote | undefined, choix: Choix): ResultatVote {
  const r = { oui: serveur?.oui ?? 0, non: serveur?.non ?? 0 };
  if (r[choix] === 0) r[choix] = 1;
  return r;
}

export function VotesIdees({ idees }: { idees: Idee[] }) {
  const [votes, setVotes] = useState<Record<string, Choix>>({});
  const [resultats, setResultats] = useState<Record<string, ResultatVote> | null>(null);

  useEffect(() => {
    const deja = lire();
    setVotes(deja);
    if (Object.keys(deja).length > 0) void chargerResultats().then(setResultats);
  }, []);

  function voter(id: string, choix: Choix) {
    if (votes[id] === choix) return;
    const dejaVote = Boolean(votes[id]);
    const suivant = { ...votes, [id]: choix };
    setVotes(suivant);
    try {
      window.localStorage.setItem(CLE, JSON.stringify(suivant));
    } catch {
      // Stockage indisponible : le vote part quand même.
    }
    if (!dejaVote && !neRienCompter()) envoyer(id, choix);
    // Laisser au vote le temps d'arriver avant de relire les résultats.
    window.setTimeout(() => void chargerResultats().then((r) => r && setResultats(r)), dejaVote ? 0 : 900);
  }

  return (
    <ul className="idees">
      {idees.map((idee) => {
        const choix = votes[idee.id];
        const r = choix && resultats ? chiffres(resultats[idee.id], choix) : null;
        const total = r ? r.oui + r.non : 0;
        const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
        const options: Array<[Choix, string]> = [
          ["oui", "Bonne idée"],
          ["non", "Pas pour moi"],
        ];
        return (
          <li key={idee.id} className="idee">
            <p>
              <b>{idee.titre}</b>
              {idee.detail}
            </p>
            <div className="votes" role="group" aria-label={`Votre avis : ${idee.titre}`}>
              {options.map(([valeur, libelle]) => (
                <button
                  key={valeur}
                  type="button"
                  className={`vote ${r ? "avec-resultat" : ""}`}
                  aria-pressed={choix === valeur}
                  onClick={() => voter(idee.id, valeur)}
                >
                  {r && <span className="remplissage" style={{ width: `${pct(r[valeur])}%` }} aria-hidden />}
                  <span className="vote-texte">
                    <span>{libelle}</span>
                    {r && <span className="vote-pct">{pct(r[valeur])}&nbsp;%</span>}
                  </span>
                </button>
              ))}
            </div>
            <p className="merci" aria-live="polite">
              {choix ? (r ? `Merci, c’est noté. ${total} vote${total > 1 ? "s" : ""} pour l’instant.` : "Merci, c’est noté.") : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
