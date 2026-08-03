"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EvenementPlanning, Priorite } from "@/types";

// Plage par défaut : couvre une journée de travail classique sans obliger
// à scroller pour un artisan qui n'a jamais de rendez-vous hors de ces
// heures. Mais un couvreur, un plombier ou un chauffagiste peut avoir une
// urgence à 22h ou un départ de chantier à 5h — un rendez-vous en dehors de
// 7h-20h ne doit jamais devenir invisible. Le bug remonté : un rendez-vous
// à minuit ne s'affichait pas du tout, positionné hors de la grille. La
// grille s'élargit donc automatiquement pour toujours inclure tous les
// événements de la semaine affichée, quelle que soit l'heure.
const HEURE_DEBUT_DEFAUT = 7;
const HEURE_FIN_DEFAUT = 20;
const HAUTEUR_HEURE = 52; // px

const COULEUR_PRIORITE: Record<Priorite, string> = {
  urgent: "bg-[#C23B22] border-[#C23B22]",
  important: "bg-[#D9861A] border-[#D9861A]",
  normal: "bg-[#2F8F5B] border-[#2F8F5B]",
};

const COULEUR_TACHE_SANS_PROJET = "bg-ink/40 border-ink/40";

type EvenementAvecProjet = EvenementPlanning & {
  demandes?: { nom_client?: string; priorite?: Priorite } | null;
};

function estMemeJour(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function estPasse(jour: Date) {
  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);
  return jour.getTime() < debutAujourdhui.getTime();
}

function BlocEvenement({
  evenement,
  heureDebut,
}: {
  evenement: EvenementAvecProjet;
  heureDebut: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  const date = new Date(evenement.date_heure);
  const minutesDepuisDebut = (date.getHours() - heureDebut) * 60 + date.getMinutes();
  const top = (minutesDepuisDebut / 60) * HAUTEUR_HEURE;
  const dureeMin = evenement.duree_minutes ?? 30;
  const hauteur = Math.max((dureeMin / 60) * HAUTEUR_HEURE, 22);

  const couleur = evenement.demandes?.priorite
    ? COULEUR_PRIORITE[evenement.demandes.priorite]
    : COULEUR_TACHE_SANS_PROJET;

  const termine = evenement.statut === "termine";

  async function basculerTermine() {
    setEnCours(true);
    setErreur(false);
    const { data, error } = await supabase
      .from("evenements_planning")
      .update({ statut: termine ? "a_faire" : "termine" })
      .eq("id", evenement.id)
      .select("id");
    setEnCours(false);
    if (error || !data || data.length === 0) {
      setErreur(true);
      return;
    }
    setMenuOuvert(false);
    router.refresh();
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer "${evenement.titre}" ?`)) return;
    setEnCours(true);
    setErreur(false);
    const { data, error } = await supabase
      .from("evenements_planning")
      .delete()
      .eq("id", evenement.id)
      .select("id");
    setEnCours(false);
    if (error || !data || data.length === 0) {
      setErreur(true);
      return;
    }
    setMenuOuvert(false);
    router.refresh();
  }

  return (
    <div className="absolute left-1 right-1 z-10" style={{ top }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOuvert(!menuOuvert);
        }}
        style={{ height: hauteur }}
        className={`w-full text-left px-2 py-1 border-l-4 text-white text-[11px] leading-tight overflow-hidden rounded-sm ${couleur} ${
          termine ? "opacity-40 line-through" : ""
        }`}
        title={evenement.titre}
      >
        <span className="font-mono opacity-80">
          {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>{" "}
        {evenement.titre}
      </button>

      {menuOuvert && (
        <>
          {/* Fond transparent pour fermer le menu au clic ailleurs */}
          <div className="fixed inset-0 z-20" onClick={() => setMenuOuvert(false)} />
          <div className="relative z-30 mt-1 bg-white border border-ink/15 shadow-lg text-xs w-44">
            {evenement.demande_id && (
              <button
                onClick={() => router.push(`/dashboard/demandes/${evenement.demande_id}`)}
                className="w-full text-left px-3 py-2 hover:bg-paper text-ink/80 border-b border-ink/5"
              >
                → Ouvrir le projet
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/planning/nouveau?eventId=${evenement.id}`)}
              className="w-full text-left px-3 py-2 hover:bg-paper text-ink/80 border-b border-ink/5"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={basculerTermine}
              disabled={enCours}
              className="w-full text-left px-3 py-2 hover:bg-paper text-ink/80 border-b border-ink/5"
            >
              {termine ? "Marquer à faire" : "✓ Marquer terminé"}
            </button>
            <button
              onClick={supprimer}
              disabled={enCours}
              className="w-full text-left px-3 py-2 hover:bg-signal/10 text-signal"
            >
              🗑 Supprimer
            </button>
            {erreur && (
              <p className="px-3 py-2 text-[10px] text-signal border-t border-ink/5">
                Échec de l&apos;action. Réessayez.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function GrilleAgenda({
  jours,
  evenements,
}: {
  jours: Date[];
  evenements: EvenementAvecProjet[];
}) {
  // On élargit la plage par défaut si un événement tombe avant 7h ou après
  // 20h, pour ne jamais rendre un rendez-vous invisible (voir commentaire
  // plus haut). Le cas normal (rien d'inhabituel dans la semaine) garde la
  // plage compacte 7h-20h, sans scroll superflu.
  const heureDebut = Math.min(
    HEURE_DEBUT_DEFAUT,
    ...evenements.map((e) => new Date(e.date_heure).getHours())
  );
  const heureFin = Math.max(
    HEURE_FIN_DEFAUT,
    ...evenements.map((e) => new Date(e.date_heure).getHours())
  );
  const heures = Array.from(
    { length: heureFin - heureDebut + 1 },
    (_, i) => heureDebut + i
  );

  return (
    <div className="border border-ink/10 bg-white overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-ink/10">
          <div />
          {jours.map((jour) => {
            const estAujourdhui = estMemeJour(jour, new Date());
            const passe = estPasse(jour);
            return (
              <div
                key={jour.toISOString()}
                className={`px-2 py-3 text-center border-l border-ink/10 ${
                  estAujourdhui ? "bg-paper" : ""
                } ${passe ? "opacity-45" : ""}`}
              >
                <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
                  {jour.toLocaleDateString("fr-FR", { weekday: "short" })}
                </p>
                <p
                  className={`mt-0.5 text-sm ${
                    estAujourdhui ? "font-semibold text-signal" : "text-ink/70"
                  }`}
                >
                  {jour.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
          <div>
            {heures.map((h) => (
              <div
                key={h}
                style={{ height: HAUTEUR_HEURE }}
                className="text-right pr-2 -translate-y-2"
              >
                <span className="font-mono text-[10px] text-ink/40">{h}h</span>
              </div>
            ))}
          </div>

          {jours.map((jour) => (
            <div
              key={jour.toISOString()}
              className={`relative border-l border-ink/10 ${
                estPasse(jour) ? "bg-ink/[0.02]" : ""
              }`}
              style={{ height: HAUTEUR_HEURE * heures.length }}
            >
              {heures.map((h) => (
                <div
                  key={h}
                  className="border-t border-ink/5"
                  style={{ height: HAUTEUR_HEURE }}
                />
              ))}

              {evenements
                .filter((e) => estMemeJour(new Date(e.date_heure), jour))
                .map((e) => (
                  <BlocEvenement key={e.id} evenement={e} heureDebut={heureDebut} />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
