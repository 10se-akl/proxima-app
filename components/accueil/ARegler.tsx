"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { marquerNoteTerminee } from "@/lib/notes";
import { changerStatutEvenement } from "@/components/planning/actionsEvenement";
import { FeuilleDeplacer, type EvenementADeplacer } from "@/components/planning/FeuilleDeplacer";
import { FeuilleMessageClient, type DemandeMessage } from "@/components/projet/FeuilleMessageClient";
import { cloturerChantier, noterChantierPasTermine } from "@/components/dashboard/ConfirmerClotureProjet";
import { Pastille } from "@/components/ui/Pastille";
import { IconeCloche } from "@/components/projet/icones";
import { LigneAccueil } from "./Blocs";
import { BlocAvecTrace, FinCoche, FinMot, useTraceAccueil } from "./TraceAccueil";

// ============================================================
// « À régler » (refonte 03/10 — duel C, lot 4) : c'est « derrière ».
//
// Remplace, sur l'accueil, « Fermer la journée » (le soir), « À confirmer »
// (AConfirmer) et « Chantier terminé ? » (ConfirmerClotureProjet). Une
// seule liste, le plus récent d'abord, et deux gestes par ligne :
//   - une note ou une tâche passée : ✓ et Demain ;
//   - un rendez-vous passé sans réponse : ✓ et Pas fait. « Pas fait »
//     ouvre la feuille « Déplacer » (demain même heure déjà rempli), puis
//     le message au client avec la nouvelle date : aucun rendez-vous client
//     ne bouge en silence ;
//   - « Chantier terminé ? » : Oui (la clôture existante) et Pas encore
//     (une trace ; la question ne revient qu'après un fait nouveau).
// Chaque geste écrit quelque chose de réel, puis laisse une trace (voir
// TraceAccueil). « Tout est réglé. » n'est jamais un geste : l'écran le dit
// de lui-même quand plus rien n'est ni devant ni derrière.
// ============================================================

export type ElementARegler = {
  cle: string;
  genre: "note" | "tache" | "rdv" | "chantier";
  /** La note, l'événement du planning, ou le projet (chantier). */
  id: string;
  /** L'heure de la note ou de l'événement : le tri, le plus récent d'abord. */
  date: string;
  principal: string;
  secondaire?: string;
  href: string;
  demandeId?: string | null;
};

// Le lendemain matin : l'heure à laquelle une note reportée revient.
const HEURE_REPORT_NOTE = 8;

function demainMatin(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(HEURE_REPORT_NOTE, 0, 0, 0);
  return d;
}

/** Même heure, le lendemain d'aujourd'hui (pas le lendemain de la tâche). */
function demainMemeHeure(iso: string): Date {
  const origine = new Date(iso);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(origine.getHours(), origine.getMinutes(), 0, 0);
  return d;
}

const JOUR_HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "2-digit" });
/** « ven. 14h », « lun. 8h30 ». */
function jourHeure(iso: string): string {
  return JOUR_HEURE.format(new Date(iso)).replace(/(\d+):00$/, "$1h").replace(/(\d+):(\d\d)$/, "$1h$2");
}

export function ARegler({ elements }: { elements: ElementARegler[] }) {
  const supabase = createClient();
  const { masques, erreurs, enCours, faire, poserTrace } = useTraceAccueil();
  const [aDeplacer, setADeplacer] = useState<(EvenementADeplacer & { cle: string; demandeId: string | null }) | null>(null);
  const [message, setMessage] = useState<{ demandeId: string; demande: DemandeMessage } | null>(null);
  const occupe = enCours !== null;

  const visibles = elements.filter((e) => !masques.has(e.cle));

  function fait(e: ElementARegler) {
    const estNote = e.genre === "note";
    void faire({
      bloc: "aregler",
      cle: e.cle,
      texte: `Fait : ${e.principal}`,
      ecrire: () => (estNote ? marquerNoteTerminee(supabase, e.id, true) : changerStatutEvenement(supabase, e.id, "termine")),
      annuler: () => (estNote ? marquerNoteTerminee(supabase, e.id, false) : changerStatutEvenement(supabase, e.id, "a_faire")),
    });
  }

  function demain(e: ElementARegler) {
    void faire({
      bloc: "aregler",
      cle: e.cle,
      texte: `Demain : ${e.principal}`,
      ecrire: async () => {
        if (e.genre === "note") {
          // Le rappel sonnera de nouveau demain matin (notification et
          // fenêtre « Compris ») : on efface les marques posées aujourd'hui.
          const { data, error } = await supabase
            .from("notes")
            .update({ rappel_a: demainMatin().toISOString(), notifie_a: null, vu_le: null })
            .eq("id", e.id)
            .select("id");
          return !error && !!data && data.length > 0;
        }
        const { data, error } = await supabase
          .from("evenements_planning")
          .update({ date_heure: demainMemeHeure(e.date).toISOString() })
          .eq("id", e.id)
          .select("id");
        return !error && !!data && data.length > 0;
      },
    });
  }

  function chantier(e: ElementARegler, termine: boolean) {
    void faire(
      termine
        ? { bloc: "aregler", cle: e.cle, texte: `Chantier terminé : ${e.principal}`, ecrire: () => cloturerChantier(supabase, e.id) }
        : {
            bloc: "aregler",
            cle: e.cle,
            texte: `Pas encore : ${e.principal}`,
            ecrire: () => noterChantierPasTermine(supabase, e.id),
            lien: { libelle: "Planifier", href: `/dashboard/planning/nouveau?projetId=${e.id}` },
          }
    );
  }

  // La feuille « Déplacer » a déjà écrit (et vibré) : il reste la trace,
  // puis le message au client avec la nouvelle date. Fermé sans envoyer,
  // la trace garde « Prévenir ».
  function apresDeplacement(nouvelleDate: string) {
    if (!aDeplacer) return;
    const e = aDeplacer;
    setADeplacer(null);
    const demande: DemandeMessage = { cle: "decalage", ancienneDate: e.date_heure, nouvelleDate };
    const prevenir = e.demandeId ? () => setMessage({ demandeId: e.demandeId as string, demande }) : null;
    poserTrace({
      bloc: "aregler",
      cle: e.cle,
      texte: `Déplacé au ${jourHeure(nouvelleDate)}`,
      lien: prevenir ? { libelle: "Prévenir", surClic: prevenir } : undefined,
    });
    prevenir?.();
  }

  return (
    <>
      <BlocAvecTrace
        bloc="aregler"
        titre="À régler"
        icone={
          <Pastille couleur="orange" variante="doux" taille="petite">
            <IconeCloche className="h-4 w-4" />
          </Pastille>
        }
        lignes={visibles.map((e) => {
          const reessayer = erreurs.get(e.cle);
          let fin;
          if (reessayer) fin = <FinMot libelle="Réessayer" surClic={reessayer} occupe={occupe} />;
          else if (e.genre === "chantier")
            fin = (
              <>
                <FinMot libelle="Oui" aria={`Chantier terminé : ${e.principal}`} surClic={() => chantier(e, true)} occupe={occupe} />
                <FinMot libelle="Pas encore" aria={`Pas encore terminé : ${e.principal}`} surClic={() => chantier(e, false)} occupe={occupe} />
              </>
            );
          else
            fin = (
              <>
                <FinCoche libelle={e.principal} surFait={() => fait(e)} occupe={occupe} />
                {e.genre === "rdv" ? (
                  <FinMot
                    libelle="Pas fait"
                    aria={`Pas fait : ${e.principal}`}
                    occupe={occupe}
                    surClic={() =>
                      setADeplacer({ cle: e.cle, id: e.id, titre: e.principal, date_heure: e.date, nomClient: e.principal, demandeId: e.demandeId ?? null })
                    }
                  />
                ) : (
                  <FinMot
                    libelle="Demain"
                    aria={e.genre === "note" ? `Demain matin : ${e.principal}` : `Demain, même heure : ${e.principal}`}
                    surClic={() => demain(e)}
                    occupe={occupe}
                  />
                )}
              </>
            );
          return (
            <LigneAccueil
              key={e.cle}
              href={e.href}
              principal={e.principal}
              secondaire={e.secondaire}
              alerte={reessayer ? "Pas enregistré" : undefined}
              fin={fin}
            />
          );
        })}
      />

      {/* Les feuilles vivent ici, hors de la liste, dans un composant
          toujours monté : la liste peut se vider pendant qu'elles restent
          ouvertes. */}
      <FeuilleDeplacer evenement={aDeplacer} surFermer={() => setADeplacer(null)} surDeplace={(_, d) => apresDeplacement(d)} />
      {message && (
        <FeuilleMessageClient ouverte surFermer={() => setMessage(null)} demandeId={message.demandeId} demande={message.demande} />
      )}
    </>
  );
}
