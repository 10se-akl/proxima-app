import type { Metadata } from "next";
import { VueRejoindre } from "./VueRejoindre";

// ============================================================
// /rejoindre (refonte 03/10, duel A) — là où arrive :
//   - la personne invitée qui a déjà un compte (lien reçu par e-mail) ;
//   - un compte sans équipe (le tableau de bord l'envoie ici) : invitée,
//     ou retirée d'une équipe (« Votre accès a été retiré ») ;
//   - un compte « en attente » qui se connecte (le middleware l'envoie
//     ici : s'il a une invitation, il passe devant la liste d'attente).
//
// Tout se décide côté navigateur puis serveur : le lien reçu par e-mail
// porte la session dans la partie « # » de l'adresse, que le serveur ne
// voit jamais. La page la récupère, puis demande au serveur
// (/api/equipe/rejoindre) ce qu'il en est. Hors du cache du service
// worker (public/sw.js), comme le tableau de bord.
// ============================================================

export const metadata: Metadata = {
  title: "Rejoindre une équipe",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RejoindrePage() {
  return <VueRejoindre />;
}
