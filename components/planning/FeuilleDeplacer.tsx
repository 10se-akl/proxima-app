"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Feuille } from "@/components/projet/Feuille";
import { vibrer, vibrerEchec } from "@/lib/retour";
import { ChoisirJour } from "./ChoisirJour";
import { BOUTON_PLEIN_LARGE, CHAMP, LIBELLE } from "@/components/ui/recettes";
import { aujourdhuiCle, ajouterJours, heureChamp, instantParis, quandEnLettres, type CleJour } from "./semaine";

// ============================================================
// Déplacer un rendez-vous (refonte 02/10 — duel C, lot 2 ; refonte 03/10 —
// duel G, lot 3).
//
// Un rendez-vous client ne se déplace plus en silence. Avant, « Demain »
// (Fermer la journée) le reportait d'un appui sans que le client le sache,
// et « Non » (À confirmer) ouvrait un petit formulaire en ligne qui ne
// proposait jamais de le prévenir. Ici : le jour et l'heure, déjà remplis
// (demain, même heure), un seul bouton (« Déplacer à demain »). Une fois
// enregistré, l'appelant enchaîne sur « Message au client », texte prêt
// avec la nouvelle date : c'est l'artisan qui envoie, depuis son téléphone.
//
// Lot 3 : le champ date devient les sept jours (ChoisirJour), qui montrent
// ce qui est déjà pris avant de choisir. L'heure se lit et s'écrit à l'heure
// de Paris.
//
// Rien ne disparaît comme réussi avant la réponse de la base. Un créneau
// déjà pris (contrainte de non-chevauchement, code 23P01) le dit en clair.
// ============================================================

export type EvenementADeplacer = {
  id: string;
  titre: string;
  date_heure: string;
  nomClient?: string | null;
  duree_minutes?: number | null;
};

export function FeuilleDeplacer({
  evenement,
  surFermer,
  surDeplace,
}: {
  /** null : feuille fermée. */
  evenement: EvenementADeplacer | null;
  surFermer: () => void;
  /** Appelé une fois l'enregistrement confirmé, avec la nouvelle date. */
  surDeplace: (e: EvenementADeplacer, nouvelleDate: string) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [jour, setJour] = useState<CleJour>(() => ajouterJours(aujourdhuiCle(), 1));
  const [heure, setHeure] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!evenement) return;
    setJour(ajouterJours(aujourdhuiCle(), 1));
    setHeure(heureChamp(evenement.date_heure));
    setErreur(null);
  }, [evenement]);

  async function deplacer() {
    if (!evenement || !jour || !heure || enCours) return;
    setEnCours(true);
    setErreur(null);
    const nouvelleDate = instantParis(jour, heure).toISOString();
    const { data, error } = await supabase
      .from("evenements_planning")
      .update({ date_heure: nouvelleDate })
      .eq("id", evenement.id)
      .select("id");
    setEnCours(false);
    if (error || !data || data.length === 0) {
      vibrerEchec();
      setErreur(error?.code === "23P01" ? "Déjà pris à cette heure." : "Pas enregistré. Réessayez.");
      return;
    }
    vibrer();
    surDeplace(evenement, nouvelleDate);
  }

  return (
    <Feuille
      ouverte={!!evenement}
      // Le nom du client est déjà sur la ligne touchée : un titre court tient
      // sur une ligne à 360 px (règle 2 du langage), même avec un nom long.
      titre="Déplacer le rendez-vous"
      surFermer={surFermer}
    >
      {evenement && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void deplacer();
          }}
        >
          <ChoisirJour
            jour={jour}
            surChoisir={(j) => {
              setJour(j);
              setErreur(null);
            }}
            ignorer={evenement.id}
            creneau={heure ? { heure, duree: evenement.duree_minutes ?? 60 } : null}
          />
          <label className="block">
            <span className={LIBELLE}>Heure</span>
            <input type="time" required value={heure} onChange={(e) => setHeure(e.target.value)} className={CHAMP} />
          </label>

          {/* Le bouton reste sous le pouce même si la liste des jours fait défiler la feuille.
              Design v3 (24/10) : filet gris-clair, BOUTON_PLEIN_LARGE. */}
          <div className="sticky bottom-[calc(-1.25rem_-_env(safe-area-inset-bottom))] -mx-5 -mb-[calc(1.25rem_+_env(safe-area-inset-bottom))] border-t border-gris-clair bg-paper px-5 pt-3 [padding-bottom:calc(1.25rem+env(safe-area-inset-bottom))]">
            <p aria-live="polite" className="min-h-5 text-sm font-semibold text-signal-fonce">
              {erreur}
            </p>
            <button type="submit" disabled={enCours || !heure} className={`mt-1 py-3 ${BOUTON_PLEIN_LARGE}`}>
              {/* Design v3 (25/10) : la date à confirmer ne disparaît jamais. */}
              <span className="line-clamp-2 text-center">{enCours ? "…" : `Déplacer à ${quandEnLettres(jour, aujourdhuiCle())}`}</span>
            </button>
          </div>
        </form>
      )}
    </Feuille>
  );
}
