"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Feuille } from "@/components/projet/Feuille";
import { FeuilleMessageClient, type DemandeMessage } from "@/components/projet/FeuilleMessageClient";
import { vibrer, vibrerEchec } from "@/lib/retour";
import { FeuilleDeplacer } from "./FeuilleDeplacer";
import { changerStatutEvenement, type EvenementAvecProjet } from "./actionsEvenement";

// ============================================================
// Déplacer ou annuler un rendez-vous, et prévenir le client (refonte 03/10,
// duel G lot 1).
//
// Le téléphone (AgendaMobile) et la grille de l'ordinateur (GrilleAgenda)
// passaient chacun par leur propre chemin : la grille annulait en un clic,
// sans un mot au client. Ici, une seule logique pour les deux :
//   - « Déplacer » : la feuille (jour, heure), puis « Message au client »
//     avec la nouvelle date ;
//   - « Annuler » : une question (« Annuler et prévenir X » / « Annuler
//     sans prévenir » / « Garder »), puis « Message au client ».
// Aucun rendez-vous client n'est déplacé ou annulé sans proposer de
// prévenir. C'est l'artisan qui envoie, depuis son téléphone.
//
// L'ordre compte (règle 13) : on écrit, on lit le résultat, et seulement
// alors on ouvre le message. Un échec reste dans la feuille où était le
// doigt. Le lien sms: quitte l'application : à la fermeture du message, on
// rafraîchit la page.
//
// Après une annulation, le texte est « decalage » sans date (« je dois
// décaler… je reviens vers vous avec une nouvelle date ») : pas de huitième
// modèle (lib/messagesClient.ts). Si le client a annulé lui-même, l'artisan
// touche « Pas maintenant » ; « Appeler » est dans la même feuille.
// ============================================================

type Mode = "deplacer" | "annuler" | null;

export function useChangerRendezVous(
  evenement: EvenementAvecProjet,
  /** Tout est fait (écrit, et message vu ou refusé) : le parent ferme ses feuilles. */
  surTermine: () => void
): {
  ouvrirDeplacer: () => void;
  ouvrirAnnuler: () => void;
  /** Une de ces feuilles est ouverte : le parent met la sienne de côté. */
  occupe: boolean;
  feuilles: ReactNode;
} {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<Mode>(null);
  const [message, setMessage] = useState<DemandeMessage | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  // Un rendez-vous lié à un projet : il y a un client à prévenir. Une
  // tâche, ou un rendez-vous sans projet : la question seule, sans message.
  const rdvClient = evenement.type === "rendez_vous" && !!evenement.demande_id;
  const nomClient = evenement.demandes?.nom_client;

  function terminer() {
    setMode(null);
    setMessage(null);
    surTermine();
    router.refresh();
  }

  async function annuler(prevenir: boolean) {
    if (enCours) return;
    setEnCours(true);
    setErreur(false);
    const ok = await changerStatutEvenement(supabase, evenement.id, "annule");
    setEnCours(false);
    if (!ok) {
      vibrerEchec();
      setErreur(true);
      return;
    }
    vibrer();
    if (prevenir) {
      setMode(null);
      setMessage({ cle: "decalage", ancienneDate: evenement.date_heure });
      return;
    }
    terminer();
  }

  const fermerQuestion = () => {
    setMode(null);
    setErreur(false);
  };

  const feuilles = (
    <>
      <FeuilleDeplacer
        evenement={
          mode === "deplacer"
            ? { id: evenement.id, titre: evenement.titre, date_heure: evenement.date_heure, nomClient }
            : null
        }
        surFermer={() => setMode(null)}
        surDeplace={(_, nouvelleDate) => {
          setMode(null);
          if (rdvClient) {
            setMessage({ cle: "decalage", ancienneDate: evenement.date_heure, nouvelleDate });
            return;
          }
          terminer();
        }}
      />

      <Feuille ouverte={mode === "annuler"} titre="Annuler le rendez-vous ?" surFermer={fermerQuestion}>
        <div className="flex flex-col gap-2">
          {rdvClient && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => void annuler(true)}
              className="min-h-14 w-full rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <span className="block truncate">Annuler et prévenir {nomClient ?? "le client"}</span>
            </button>
          )}
          <button
            type="button"
            disabled={enCours}
            onClick={() => void annuler(false)}
            className="min-h-12 w-full rounded-2xl px-4 text-base font-semibold text-signal-fonce ring-1 ring-inset ring-signal-fonce/50 disabled:opacity-60 dark:text-signal-clair dark:ring-signal-clair/50"
          >
            {rdvClient ? "Annuler sans prévenir" : "Annuler"}
          </button>
          <button
            type="button"
            onClick={fermerQuestion}
            className="min-h-12 w-full px-3 text-base font-semibold text-ink underline decoration-ink/30 underline-offset-4"
          >
            Garder
          </button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-signal-fonce dark:text-signal-clair">
          {erreur ? "Pas enregistré. Réessayez." : ""}
        </p>
      </Feuille>

      {message && evenement.demande_id && (
        <FeuilleMessageClient ouverte surFermer={terminer} demandeId={evenement.demande_id} demande={message} />
      )}
    </>
  );

  return {
    ouvrirDeplacer: () => setMode("deplacer"),
    ouvrirAnnuler: () => {
      setErreur(false);
      setMode("annuler");
    },
    occupe: mode !== null || message !== null,
    feuilles,
  };
}
