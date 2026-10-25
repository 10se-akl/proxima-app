"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ajouterJours,
  aujourdhuiCle,
  cleParis,
  instantParis,
  libelleChoix,
  occupationEnConflit,
  type CleJour,
} from "./semaine";
import { heure } from "@/lib/heure";
import { BOUTON_TEXTE, CHAMP, LIBELLE } from "@/components/ui/recettes";

// ============================================================
// Choisir le jour : les sept jours qui viennent, avec ce qui est déjà pris
// (refonte 03/10, duel G, lot 3).
//
// Le même choix sert à planifier et à déplacer. Avant, une date à taper :
// l'erreur « créneau déjà pris » arrivait après, une fois le formulaire
// rempli. Ici, chaque jour dit ce qu'il porte (« 8 h Dupont · 14 h 30
// Roux », ou « Rien de prévu ») avant qu'on le touche, et un jour qui
// gênerait le créneau proposé le dit en alerte. Ce n'est qu'un
// avertissement : la base reste seule juge (contrainte de non-chevauchement),
// et l'écriture dit « Déjà pris à cette heure. » si le créneau est pris.
//
// « Un autre jour… » ouvre le champ date du téléphone pour ce qui dépasse
// la semaine. « Rien de prévu » n'est pas « libre » : l'artisan ne note pas
// tout, la ligne ne promet que ce qui est écrit au planning.
// ============================================================

type Pris = {
  id: string;
  titre: string;
  date_heure: string;
  duree_minutes: number | null;
  demandes?: { nom_client?: string } | { nom_client?: string }[] | null;
};

const nomDe = (p: Pris) => {
  const d = Array.isArray(p.demandes) ? p.demandes[0] : p.demandes;
  return d?.nom_client || p.titre;
};

export function ChoisirJour({
  jour,
  surChoisir,
  ignorer,
  creneau,
}: {
  jour: CleJour;
  surChoisir: (jour: CleJour) => void;
  /** Le rendez-vous qu'on déplace : il ne se gêne pas lui-même. */
  ignorer?: string;
  /** Le créneau proposé (heure « HH:MM » et durée) : un jour qui le gênerait le dit. */
  creneau?: { heure: string; duree: number } | null;
}) {
  const [supabase] = useState(() => createClient());
  const aujourdhui = aujourdhuiCle();
  const cles = Array.from({ length: 7 }, (_, i) => ajouterJours(aujourdhui, i));
  const [pris, setPris] = useState<Pris[] | null>(null);
  const [autreOuvert, setAutreOuvert] = useState(false);
  const horsSemaine = !cles.includes(jour);

  useEffect(() => {
    let vivant = true;
    supabase
      .from("evenements_planning")
      .select("id, titre, date_heure, duree_minutes, demandes(nom_client)")
      .eq("type", "rendez_vous")
      .neq("statut", "annule")
      .gte("date_heure", instantParis(cles[0]).toISOString())
      .lt("date_heure", instantParis(ajouterJours(cles[6], 1)).toISOString())
      .order("date_heure", { ascending: true })
      .then(({ data, error }) => {
        // Une lecture ratée n'empêche rien : les jours s'affichent sans détail.
        if (vivant) setPris(error ? [] : ((data as Pris[]) ?? []));
      });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <ul role="radiogroup" aria-label="Jour" className="flex flex-col gap-1.5">
        {cles.map((cle) => {
          const choisi = cle === jour && !horsSemaine;
          const duJour = (pris ?? []).filter((p) => cleParis(p.date_heure) === cle);
          const gene = creneau ? occupationEnConflit(instantParis(cle, creneau.heure), creneau.duree, duJour, ignorer) : undefined;
          const visibles = duJour.filter((p) => p.id !== ignorer);
          return (
            <li key={cle}>
              <button
                type="button"
                role="radio"
                aria-checked={choisi}
                onClick={() => {
                  setAutreOuvert(false);
                  surChoisir(cle);
                }}
                // Design v3 (24/10) : un choix se lit comme un champ (contour
                // fin `contour` depuis le 25/10, à l'encre une fois choisi) ; le détail du jour
                // tient sur deux lignes au plus au lieu d'être coupé.
                className={`flex min-h-12 w-full items-center gap-3 rounded-[14px] bg-surface px-4 py-2 text-left motion-safe:transition-colors active:bg-ink/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                  choisi ? "ring-2 ring-inset ring-ink" : "ring-1 ring-inset ring-contour"
                }`}
              >
                <span className="w-24 shrink-0 text-base font-semibold text-ink">{libelleChoix(cle, aujourdhui)}</span>
                <span className="line-clamp-2 min-w-0 flex-1 text-sm text-steel">
                  {pris === null ? (
                    <span aria-hidden className="block h-4 w-24 rounded-full bg-paper-warm" />
                  ) : gene ? (
                    <span className="font-semibold text-signal-fonce">Heure déjà prise</span>
                  ) : visibles.length === 0 ? (
                    "Rien de prévu"
                  ) : (
                    visibles.map((p) => `${heure(p.date_heure)} ${nomDe(p)}`).join(" · ")
                  )}
                </span>
                <span
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    choisi ? "border-ink bg-ink" : "border-steel"
                  }`}
                >
                  {choisi && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {autreOuvert || horsSemaine ? (
        <label className="mt-3 block">
          <span className={LIBELLE}>Un autre jour</span>
          <input
            type="date"
            min={aujourdhui}
            value={horsSemaine ? jour : ""}
            onChange={(e) => e.target.value && surChoisir(e.target.value)}
            className={CHAMP}
          />
        </label>
      ) : (
        <button type="button" onClick={() => setAutreOuvert(true)} className={`-ml-3 mt-1 ${BOUTON_TEXTE}`}>
          Un autre jour…
        </button>
      )}
    </div>
  );
}
