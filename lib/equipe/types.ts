// ============================================================
// Rejoindre une équipe (refonte 03/10, duel A) — ce que la page
// /rejoindre et la page « Définir votre mot de passe » reçoivent du
// serveur (app/api/equipe/rejoindre). Le serveur décide ; ces écrans ne
// font qu'afficher. En particulier, « Votre accès a été retiré » ne
// s'affiche que si le serveur l'a dit, jamais sur une panne réseau.
// ============================================================

export type EtatRejoindre =
  /** Une invitation en cours pour l'adresse connectée. */
  | {
      etat: "invitation";
      invitation: { id: string; entreprise: string; invitant: string | null; prenom: string };
      /** La session vient d'un lien reçu dans la boîte mail (preuve de l'adresse). */
      preuve: boolean;
      /** Compte « en attente » : il choisit son mot de passe en rejoignant. */
      motDePasseRequis: boolean;
      email: string;
    }
  /** Déjà dans une équipe (celle de l'invitation, ou aucune invitation). */
  | { etat: "membre"; enAttente: boolean }
  /** Invité ici, mais déjà dans une autre entreprise : seul l'invité le voit. */
  | { etat: "ailleurs"; entreprise: string }
  /** A fait partie d'une équipe, n'en fait plus partie. */
  | { etat: "retire" }
  /** Aucune équipe, aucune invitation. */
  | { etat: "aucune"; enAttente: boolean };
