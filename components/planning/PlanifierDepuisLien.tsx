"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeuillePlanifier, TracePlanifie, type ProjetAPlanifier } from "./FeuillePlanifier";

// ============================================================
// « Planifier » depuis la fiche d'un projet (refonte 03/10, duel G, lot 3).
//
// La fiche, « À confirmer », la clôture et la confirmation d'un rendez-vous
// mènent toutes à /planning/nouveau?projetId=… : cette route renvoie
// maintenant ici (/planning?projetId=…), et la feuille s'ouvre déjà remplie.
// Aucun fichier de ces écrans n'a changé.
//
// Le composant reste monté d'un rendu à l'autre : après « Planifier », on
// retire ?projetId= de l'adresse et la trace « Planifié : … » reste en haut
// de la page jusqu'à ce qu'on la quitte.
// ============================================================

export function PlanifierDepuisLien({ projet }: { projet: ProjetAPlanifier | null }) {
  const router = useRouter();
  const [fermee, setFermee] = useState(false);
  const [trace, setTrace] = useState<string | null>(null);

  // L'adresse a perdu ?projetId= : un prochain « Planifier » rouvrira la feuille.
  useEffect(() => {
    if (!projet) setFermee(false);
  }, [projet]);

  function terminer() {
    setFermee(true);
    router.replace("/dashboard/planning");
  }

  return (
    <>
      <TracePlanifie texte={trace} />
      <FeuillePlanifier
        projet={fermee ? null : projet}
        surFermer={terminer}
        surPlanifie={(t) => {
          setTrace(t);
          terminer();
          router.refresh();
        }}
      />
    </>
  );
}
