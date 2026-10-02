"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Feuille } from "@/components/projet/Feuille";
import { vibrer, vibrerEchec } from "@/lib/retour";

// ============================================================
// Déplacer un rendez-vous (refonte 02/10 — duel C, lot 2).
//
// Un rendez-vous client ne se déplace plus en silence. Avant, « Demain »
// (Fermer la journée) le reportait d'un appui sans que le client le sache,
// et « Non » (À confirmer) ouvrait un petit formulaire en ligne qui ne
// proposait jamais de le prévenir. Ici : la date et l'heure, déjà remplies
// (demain, même heure), un seul bouton. Une fois enregistré, l'appelant
// enchaîne sur « Message au client », texte prêt avec la nouvelle date :
// c'est l'artisan qui envoie, depuis son téléphone.
//
// Rien ne disparaît comme réussi avant la réponse de la base. Un créneau
// déjà pris (contrainte de non-chevauchement, code 23P01) le dit en clair.
// ============================================================

export type EvenementADeplacer = {
  id: string;
  titre: string;
  date_heure: string;
  nomClient?: string | null;
};

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/** Demain, à la même heure que le rendez-vous, au format des champs. */
function demainMemeHeure(iso: string) {
  const origine = new Date(iso);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return {
    date: `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`,
    heure: `${deuxChiffres(origine.getHours())}:${deuxChiffres(origine.getMinutes())}`,
  };
}

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
  const supabase = createClient();
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!evenement) return;
    const d = demainMemeHeure(evenement.date_heure);
    setDate(d.date);
    setHeure(d.heure);
    setErreur(null);
  }, [evenement]);

  async function deplacer() {
    if (!evenement || !date || !heure || enCours) return;
    setEnCours(true);
    setErreur(null);
    const nouvelleDate = new Date(`${date}T${heure}`).toISOString();
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

  const champ =
    "mt-1.5 w-full min-h-12 rounded-xl border border-ink/15 bg-paper px-3 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20";

  return (
    <Feuille
      ouverte={!!evenement}
      // Le nom du client est déjà sur la ligne touchée : un titre court tient
      // sur une ligne à 360 px (règle 2 du langage), même avec un nom long.
      titre="Déplacer le rendez-vous"
      surFermer={surFermer}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void deplacer();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-ink">
            Jour
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Heure
            <input type="time" required value={heure} onChange={(e) => setHeure(e.target.value)} className={champ} />
          </label>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-signal-fonce dark:text-signal-clair">
          {erreur}
        </p>
        <button
          type="submit"
          disabled={enCours}
          className="mt-2 w-full min-h-14 rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {enCours ? "…" : "Déplacer"}
        </button>
      </form>
    </Feuille>
  );
}
