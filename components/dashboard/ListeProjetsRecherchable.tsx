"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { DemandeCard } from "@/components/dashboard/DemandeCard";
import { IconeDossier } from "@/components/ui/Icones";
import { BoutonCapture } from "@/components/accueil/BoutonCapture";
import { EnTetePage } from "@/components/ui/EnTetePage";
import { BOUTON_CREUX, BOUTON_TEXTE, GROUPE, SECONDAIRE, CHAMP, TUILE_ICONE } from "@/components/ui/recettes";
import type { Projet } from "@/types";

export function ListeProjetsRecherchable({
  projets,
  photos = {},
  infos = {},
  astuce,
}: {
  projets: Projet[];
  /** id du projet → URL signée de sa première photo. */
  photos?: Record<string, string>;
  /** id du projet → « Rendez-vous demain à 9h ». */
  infos?: Record<string, string>;
  /** Sous l'en-tête, avant la liste (l'astuce du partage). */
  astuce?: ReactNode;
}) {
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

  const enCours = projets.length - projetsTermines.length;

  return (
    <div>
      <EnTetePage
        titre="Projets"
        sousTitre={enCours === 0 ? "Aucun projet en cours" : enCours === 1 ? "1 projet en cours" : `${enCours} projets en cours`}
      >
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom, téléphone, adresse…"
          aria-label="Rechercher un projet"
          className={CHAMP}
        />
      </EnTetePage>

      {astuce && <div className="mt-4">{astuce}</div>}

      {/* Refonte visuelle (04/10) : la liste dans une carte, comme Devis et
          Factures. Design v3 (24/10) : la carte groupée des recettes. */}
      <ul className={`mt-5 ${GROUPE}`}>
        {filtres.length === 0 ? (
          <li className="flex flex-col items-center px-5 py-10 text-center">
            <span className={TUILE_ICONE} aria-hidden>
              <IconeDossier taille={20} />
            </span>
            <p className={`mt-3 max-w-xs ${SECONDAIRE}`}>
              {projets.length === 0 ? "Aucun projet pour le moment." : "Aucun résultat pour cette recherche."}
            </p>
            {/* L'état vide ouvre la même feuille que le [+] de la navigation. */}
            {projets.length === 0 ? (
              <div className="mt-4">
                <BoutonCapture />
              </div>
            ) : recherche.trim() ? (
              <button type="button" onClick={() => setRecherche("")} className={`mt-4 ${BOUTON_CREUX}`}>
                Effacer la recherche
              </button>
            ) : null}
          </li>
        ) : (
          tries.map((p) => <DemandeCard key={p.id} demande={p} photo={photos[p.id] ?? null} info={infos[p.id] ?? null} />)
        )}
      </ul>

      {/* Tout en bas : l'historique ne se met jamais entre l'artisan et ses
          chantiers en cours. */}
      {projetsTermines.length > 0 && !recherche.trim() && (
        <button
          type="button"
          onClick={() => setAfficherTermines(!afficherTermines)}
          className={`-ml-3 mt-2 ${BOUTON_TEXTE}`}
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
