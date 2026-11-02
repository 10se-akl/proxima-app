"use client";

import { useEffect, useState } from "react";

// ============================================================
// « Pas encore dans Compyo : votre avis décide » (01/11/2026).
// Idée d'Axel, testée le 01/11 : 7 artisans sur 8 voteraient en un appui,
// aucun n'écrirait un message. Donc : un appui, anonyme, sans e-mail.
//
// Le vote passe par la mesure d'audience maison (/api/visite, Module 44),
// qui ne garde ni adresse IP, ni cookie, ni compte : il est compté comme
// une « page » /vote/<idée>/<oui|non>, lisible dans /admin/statistiques.
// Aucune table nouvelle. En développement, /api/visite n'enregistre rien.
// Le choix est retenu sur le téléphone (localStorage) pour afficher
// « Merci » au retour ; on peut changer d'avis.
// ============================================================

export type Idee = { id: string; titre: string; detail: string };
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

export function VotesIdees({ idees }: { idees: Idee[] }) {
  const [votes, setVotes] = useState<Record<string, Choix>>({});
  useEffect(() => setVotes(lire()), []);

  function voter(id: string, choix: Choix) {
    if (votes[id] === choix) return;
    // Un seul vote compté par idée et par téléphone : changer d'avis met à
    // jour l'affichage, sans compter un second vote.
    const dejaVote = Boolean(votes[id]);
    const suivant = { ...votes, [id]: choix };
    setVotes(suivant);
    try {
      window.localStorage.setItem(CLE, JSON.stringify(suivant));
    } catch {
      // Stockage indisponible : le vote part quand même.
    }
    if (!dejaVote && !neRienCompter()) envoyer(id, choix);
  }

  return (
    <ul className="idees">
      {idees.map((idee) => (
        <li key={idee.id} className="idee">
          <p>
            <b>{idee.titre}</b>
            {idee.detail}
          </p>
          <div className="votes" role="group" aria-label={`Votre avis : ${idee.titre}`}>
            <button type="button" className="vote" aria-pressed={votes[idee.id] === "oui"} onClick={() => voter(idee.id, "oui")}>
              Bonne idée
            </button>
            <button type="button" className="vote" aria-pressed={votes[idee.id] === "non"} onClick={() => voter(idee.id, "non")}>
              Pas pour moi
            </button>
          </div>
          <p className="merci" aria-live="polite">
            {votes[idee.id] ? "Merci, c’est noté." : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
