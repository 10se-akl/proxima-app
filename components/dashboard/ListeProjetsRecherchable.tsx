"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { DemandeCard } from "@/components/dashboard/DemandeCard";
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un nom, un téléphone, une adresse…"
          className="flex-1 min-w-[200px] rounded-xl border border-ink/15 bg-surface px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
        />
        {projetsTermines.length > 0 && (
          <button
            onClick={() => setAfficherTermines(!afficherTermines)}
            className="text-xs text-ink/50 hover:text-ink underline whitespace-nowrap transition-colors"
          >
            {afficherTermines
              ? "Masquer les projets terminés"
              : `Afficher les projets terminés (${projetsTermines.length})`}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtres.length === 0 ? (
          <p className="text-sm text-ink/50">
            {projets.length === 0
              ? "Aucun projet pour le moment. Créez-en un pour tester l'assistant IA."
              : "Aucun résultat pour cette recherche."}
          </p>
        ) : (
          filtres.map((p) => <DemandeCard key={p.id} demande={p} />)
        )}
      </div>
    </div>
  );
}
