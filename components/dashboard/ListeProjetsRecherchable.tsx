"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DemandeCard } from "@/components/dashboard/DemandeCard";
import { IconeDossier } from "@/components/ui/Icones";
import { BoutonCapture } from "@/components/accueil/BoutonCapture";
import type { Projet } from "@/types";

export function ListeProjetsRecherchable({ projets }: { projets: Projet[] }) {
  // Permet d'arriver ici avec une recherche déjà pré-remplie (ex : depuis
  // l'alerte "un projet existe déjà pour ce nom" à la création).
  const searchParams = useSearchParams();
  const [recherche, setRecherche] = useState(searchParams.get("q") ?? "");
  // Un chantier terminé reste consultable pour toujours (nouveau devis,
  // garantie...) mais n'a rien à faire dans la vue de tous les jours —
  // sans ça, la liste finit par n'être qu'un historique au fil de la bêta.
  const [afficherTermines, setAfficherTermines] = useState(false);

  const projetsTermines = projets.filter((p) => p.statut === "termine");
  // Une recherche explicite (ex: depuis l'alerte "client existant" à la
  // création) doit pouvoir retrouver un projet terminé même si le filtre
  // par défaut les masque — sinon le lien "voir l'historique" ne servirait
  // à rien pour un client déjà servi par le passé.
  const base =
    afficherTermines || recherche.trim()
      ? projets
      : projets.filter((p) => p.statut !== "termine");

  // Un artisan retrouve souvent un client par son numéro plus vite que par
  // l'orthographe exacte de son nom — utile dès que les projets
  // s'accumulent. L'email n'est plus saisi nulle part dans l'app (voir
  // décision précédente), pas la peine de l'inclure ici.
  const filtres = base.filter((p) =>
    `${p.nom_client} ${p.description} ${p.adresse_client ?? ""} ${p.telephone_client ?? ""}`
      .toLowerCase()
      .includes(recherche.toLowerCase())
  );

  // 27/09 — Les chantiers terminés, quand on les affiche, passent après
  // les autres : on cherche d'abord ce qui est en cours.
  const tries = [...filtres].sort((a, b) => Number(a.statut === "termine") - Number(b.statut === "termine"));

  return (
    <div>
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Nom, téléphone, adresse…"
        aria-label="Rechercher un projet"
        className="w-full min-h-12 rounded-2xl border border-ink/15 bg-surface px-4 text-[15px] transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
      />

      <div className="mt-4 flex flex-col gap-2">
        {filtres.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-signal/10">
              <IconeDossier taille={20} className="text-signal" />
            </span>
            <p className="text-sm text-ink/50">
              {projets.length === 0 ? "Aucun projet pour le moment." : "Aucun résultat pour cette recherche."}
            </p>
            {/* L'état vide ouvre la même feuille que le [+] de la navigation. */}
            {projets.length === 0 && <BoutonCapture />}
          </div>
        ) : (
          tries.map((p) => <DemandeCard key={p.id} demande={p} />)
        )}
      </div>

      {/* Tout en bas : l'historique ne se met jamais entre l'artisan et ses
          chantiers en cours. */}
      {projetsTermines.length > 0 && !recherche.trim() && (
        <button
          type="button"
          onClick={() => setAfficherTermines(!afficherTermines)}
          className="mt-4 inline-flex min-h-12 items-center text-[14px] font-medium text-ink/65 underline underline-offset-4 hover:text-ink"
        >
          {afficherTermines
            ? "Masquer les projets terminés"
            : projetsTermines.length === 1
              ? "Voir le projet terminé"
              : `Voir les ${projetsTermines.length} projets terminés`}
        </button>
      )}
    </div>
  );
}
