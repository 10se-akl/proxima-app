// ============================================================
// Templates de relance (11/09) — devis sans réponse et factures impayées.
//
// DÉLIBÉRÉMENT SANS IA. Ce sont des textes fixes à trous, pas une
// génération de modèle de langage : c'est ce qui garantit qu'aucun
// montant, aucune date d'intervention et aucun engagement ne peut être
// inventé dans un message destiné à un client. Le bouton "Suggérer une
// relance" de la fiche projet (app/api/ai/generer-reponse) reste, lui,
// l'option IA — à la demande explicite de l'artisan, et toujours relue
// avant envoi. Ici, c'est l'automatisation qui déclenche la proposition :
// elle doit donc être encore plus prévisible.
//
// Aucun de ces textes n'est jamais envoyé par Compyo. Ils remplissent une
// note que l'artisan ouvre, modifie s'il le souhaite, puis envoie
// lui-même par son propre moyen (SMS, mail, téléphone).
//
// Ton : calme, factuel, jamais culpabilisant ni insistant — cohérent avec
// la recherche terrain qui a motivé ces relances (l'administratif est la
// 3e source de stress des artisans, on ne rajoute pas de pression, on
// enlève une charge mentale).
// ============================================================

function signature(nomArtisan: string, entreprise: string | null): string {
  const nom = nomArtisan.trim() || "";
  const boite = entreprise?.trim();
  if (nom && boite) return `${nom}\n${boite}`;
  return nom || boite || "";
}

function avecSignature(corps: string, nomArtisan: string, entreprise: string | null): string {
  const fin = signature(nomArtisan, entreprise);
  return fin ? `${corps}\n\n${fin}` : corps;
}

export type ParamsRelanceDevis = {
  nomClient: string;
  numeroDevis: string;
  joursDepuis: number;
  nomArtisan: string;
  entreprise: string | null;
};

// Palier 1 (J+5) — ton neutre : on suppose simplement que le client n'a
// pas encore eu le temps de regarder. Aucune relance de la relance, aucune
// mention de délai qui expirerait.
export function messageRelanceDevisJ5(p: ParamsRelanceDevis): string {
  return avecSignature(
    `Bonjour ${p.nomClient},

Je reviens vers vous au sujet du devis n° ${p.numeroDevis} que je vous ai transmis il y a ${p.joursDepuis} jours.

Avez-vous pu en prendre connaissance ? Si vous avez une question, ou si quelque chose mérite d'être ajusté, dites-le moi : j'y réponds volontiers.

Bonne journée,`,
    p.nomArtisan,
    p.entreprise
  );
}

// Palier 2 (J+10) — plus direct : on demande une réponse claire, y compris
// négative. Rendre un "non" facile à donner est ce qui débloque vraiment
// un devis en attente — et ça libère le planning de l'artisan.
export function messageRelanceDevisJ10(p: ParamsRelanceDevis): string {
  return avecSignature(
    `Bonjour ${p.nomClient},

Je n'ai pas eu de retour sur le devis n° ${p.numeroDevis}, envoyé il y a ${p.joursDepuis} jours.

Souhaitez-vous toujours avancer sur ce projet ? Un simple oui ou non me suffit : cela me permet de savoir si je garde du temps pour vous dans mon planning. Si c'est non, aucun souci, dites-le moi franchement.

Bonne journée,`,
    p.nomArtisan,
    p.entreprise
  );
}

export type ParamsRelanceFacture = {
  nomClient: string;
  numeroFacture: string;
  dateEcheance: string | null;
  nomArtisan: string;
  entreprise: string | null;
};

// Relance de facture — un seul palier, volontairement. Une facture
// impayée est un sujet sensible : mieux vaut une relance propre et une
// conversation ensuite, qu'une mécanique qui relance toute seule en
// boucle et abîme la relation client. La formule "si le règlement est
// déjà parti" évite de mettre le client en faute alors qu'un virement
// peut simplement être en cours.
export function messageRelanceFacture(p: ParamsRelanceFacture): string {
  const rappelEcheance = p.dateEcheance
    ? ` (échéance du ${new Date(p.dateEcheance).toLocaleDateString("fr-FR")})`
    : "";
  return avecSignature(
    `Bonjour ${p.nomClient},

Sauf erreur de ma part, la facture n° ${p.numeroFacture}${rappelEcheance} n'a pas encore été réglée.

Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Sinon, pouvez-vous me dire où en est le paiement ?

Bonne journée,`,
    p.nomArtisan,
    p.entreprise
  );
}

// En-tête ajouté dans la note créée par le cron — la note doit dire
// clairement, dès la première ligne, que RIEN n'a été envoyé et que
// l'artisan reste seul à décider.
export const AVERTISSEMENT_BROUILLON =
  "Brouillon — rien n'a été envoyé. Relisez, modifiez si besoin, puis envoyez-le vous-même.";
