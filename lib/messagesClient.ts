import { normaliserTelephone } from "@/lib/clients/normaliserTelephone";

// ============================================================
// Les messages au client (26/09 — « moins mais mieux », lot D).
//
// Trois douleurs, un seul mécanisme : le silence qui détruit la confiance,
// l'immédiateté exigée, l'impayé qu'on n'ose pas réclamer. Dans les trois
// cas, ce qui bloque n'est pas l'envoi, c'est l'ÉCRITURE du message. Ici,
// le message est déjà écrit.
//
// Règles tenues :
//   - DES MODÈLES FIXES, sans IA : rapides, sans coût, sans attente, sans
//     risque de texte inventé. Des fonctions pures, testables.
//   - RIEN N'EST ENVOYÉ PAR COMPYO. On ouvre l'application SMS ou WhatsApp
//     de l'artisan, texte prêt ; c'est lui qui appuie sur envoyer, depuis
//     son propre numéro, et il peut modifier le texte avant.
//   - Un champ manquant disparaît proprement : jamais « undefined », jamais
//     de crochets vides. Vouvoiement, ton poli, jamais menaçant.
//   - Pas plus de sept modèles.
// ============================================================

export type Canal = "sms" | "whatsapp";

export type Signature = { nom?: string | null; entreprise?: string | null };

// Refonte (03/10, duel D lot 1) — « reponse » : un texte écrit avec l'IA
// sur la fiche, puis ouvert dans les SMS ou WhatsApp de l'artisan. Ce n'est
// pas un modèle (suggererMessages ne le propose jamais) : la clé ne sert
// qu'à la trace « Message préparé : réponse » dans le Carnet.
export type CleMessage = "accuse" | "retard" | "decalage" | "rappelRdv" | "meteo" | "relanceDevis" | "relancePaiement" | "reponse";

// ---------------------------------------------------------------- mise en forme

const DATE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
const HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "2-digit" });
const MONTANT = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** « 12 septembre ». */
export function dateEnLettres(iso: string): string {
  return DATE.format(new Date(iso));
}

/** « 14h30 ». */
export function heureCourte(iso: string): string {
  return HEURE.format(new Date(iso)).replace(":", "h");
}

/** « 1 250,00 » — avec des espaces ordinaires : les espaces fines
 *  qu'Intl insère ne passent pas partout dans un SMS. */
export function montantFrancais(n: number): string {
  return MONTANT.format(n).replace(/[  ]/g, " ");
}

function propre(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function signer(corps: string, s?: Signature): string {
  const nom = propre(s?.nom);
  const entreprise = propre(s?.entreprise);
  const ligne = [nom, entreprise].filter(Boolean).join(", ");
  return ligne ? `${corps}\n${ligne}` : corps;
}

// ---------------------------------------------------------------- les modèles

/** Une demande vient d'être captée. */
export function accuse(p: { signature?: Signature }): string {
  return signer("Bonjour, bien reçu votre message. Je suis sur un chantier, je vous rappelle ce soir.", p.signature);
}

/** Rendez-vous aujourd'hui. */
export function retard(p: { signature?: Signature }): string {
  return signer("Bonjour, j'aurai un peu de retard aujourd'hui. Je vous tiens au courant très vite.", p.signature);
}

/** Rendez-vous à venir. Avec `nouvelleDate` (refonte 02/10 — le rendez-vous
 *  vient d'être déplacé depuis l'accueil), le message propose la nouvelle
 *  date au lieu d'annoncer un décalage sans suite. */
export function decalage(p: { dateRdv: string; nouvelleDate?: string | null; signature?: Signature }): string {
  if (p.nouvelleDate) {
    return signer(
      `Bonjour, je dois décaler notre rendez-vous du ${dateEnLettres(p.dateRdv)}. Je vous propose le ${dateEnLettres(p.nouvelleDate)} à ${heureCourte(p.nouvelleDate)}. Cela vous convient-il ?`,
      p.signature
    );
  }
  return signer(
    `Bonjour, je dois décaler notre rendez-vous du ${dateEnLettres(p.dateRdv)}. Je reviens vers vous rapidement avec une nouvelle date.`,
    p.signature
  );
}

/** Rendez-vous demain ou aujourd'hui. */
export function rappelRdv(p: { dateRdv: string; adresse?: string | null; signature?: Signature }): string {
  const adresse = propre(p.adresse);
  return signer(
    `Bonjour, je vous confirme notre rendez-vous le ${dateEnLettres(p.dateRdv)} à ${heureCourte(p.dateRdv)}${adresse ? `, ${adresse}` : ""}.`,
    p.signature
  );
}

/** Alerte météo sur un rendez-vous — le texte existant, déplacé ici
 *  depuis components/planning/GrilleAgenda.tsx. */
export function meteo(p: { dateRdv: string; resumeMeteo?: string | null }): string {
  const resume = propre(p.resumeMeteo);
  return `Bonjour, en raison de la météo prévue${resume ? ` (${resume})` : ""}, il est possible que je doive reporter notre rendez-vous du ${dateEnLettres(p.dateRdv)}. Je vous tiens au courant. Merci de votre compréhension.`;
}

/** Devis en attente de réponse. */
export function relanceDevis(p: { numero?: string | null; dateEnvoi?: string | null; signature?: Signature }): string {
  const numero = propre(p.numero);
  const du = p.dateEnvoi ? ` du ${dateEnLettres(p.dateEnvoi)}` : "";
  const objet = numero ? `au sujet du devis n° ${numero}${du}` : `au sujet de mon devis${du}`;
  return signer(`Bonjour, je me permets de revenir vers vous ${objet}. Avez-vous des questions ? Je reste disponible.`, p.signature);
}

/** Facture échue non réglée — un premier rappel poli : pas de pénalités,
 *  pas de mention juridique. C'est exactement ce que l'artisan n'arrive
 *  pas à écrire. */
export function relancePaiement(p: {
  numero?: string | null;
  dateFacture?: string | null;
  montant?: number | null;
  signature?: Signature;
}): string {
  const numero = propre(p.numero);
  const facture = numero ? `la facture n° ${numero}` : "ma facture";
  const du = p.dateFacture ? ` du ${dateEnLettres(p.dateFacture)}` : "";
  // L'incise du montant porte ses deux virgules ; sans montant, aucune.
  const montant = typeof p.montant === "number" && p.montant > 0 ? `, d'un montant de ${montantFrancais(p.montant)} €,` : "";
  return signer(
    `Bonjour, sauf erreur de ma part, ${facture}${du}${montant} n'est pas encore réglée. Les coordonnées bancaires figurent sur la facture. Merci d'avance.`,
    p.signature
  );
}

/** Le libellé d'un modèle, pour la trace dans le carnet et la feuille. */
export const LIBELLES: Record<CleMessage, string> = {
  accuse: "Bien reçu",
  retard: "Retard",
  decalage: "Décalage du rendez-vous",
  rappelRdv: "Rappel du rendez-vous",
  meteo: "Alerte météo",
  relanceDevis: "Relance du devis",
  relancePaiement: "Relance de paiement",
  reponse: "Réponse",
};

// ---------------------------------------------------------------- l'ouverture

/** Le numéro pour un lien sms: — même format que celui déjà utilisé et
 *  testé sur Samsung (chiffres et « + » seulement). */
export function numeroSms(brut: string): string {
  return brut.replace(/[^\d+]/g, "");
}

/** Le numéro international sans « + » pour wa.me. Un numéro qui commence
 *  par + ou 00 garde son indicatif ; sinon, c'est un numéro français :
 *  « 06 12 34 56 78 » devient « 33612345678 » (via la normalisation déjà
 *  utilisée pour la table clients). */
export function numeroWhatsApp(brut: string): string | null {
  const net = brut.trim();
  if (net.startsWith("+") || net.startsWith("00")) {
    const chiffres = net.replace(/\D/g, "").replace(/^00/, "");
    return chiffres.length >= 8 ? chiffres : null;
  }
  const neufDerniers = normaliserTelephone(net);
  return neufDerniers ? `33${neufDerniers}` : null;
}

export function lienMessage(canal: Canal, numero: string, texte: string): string | null {
  const corps = encodeURIComponent(texte);
  if (canal === "sms") {
    const n = numeroSms(numero);
    return n ? `sms:${n}?body=${corps}` : null;
  }
  const n = numeroWhatsApp(numero);
  return n ? `https://wa.me/${n}?text=${corps}` : null;
}

/** Ouvre l'application SMS ou WhatsApp de l'artisan, texte prêt. Rien
 *  n'est envoyé : c'est lui qui appuie sur envoyer. Renvoie false si le
 *  numéro est inutilisable. */
export function ouvrirMessage(canal: Canal, numero: string, texte: string): boolean {
  const lien = lienMessage(canal, numero, texte);
  if (!lien) return false;
  if (canal === "sms") window.open(lien, "_self");
  else window.open(lien, "_blank", "noopener");
  return true;
}

// ---------------------------------------------------------------- l'équipe

/** Refonte (03/10, duel A) — prévenir la personne qu'on vient d'inviter.
 *  Volontairement SANS lien : c'est l'e-mail de Compyo qui prouve son
 *  adresse ; un lien transféré par WhatsApp ferait entrer n'importe qui.
 *  Tutoiement : le message part du téléphone du patron vers son équipe,
 *  il le modifie avant d'envoyer s'il vouvoie. */
export function messageInvitationEquipe(p: { prenom: string; entreprise?: string | null }): string {
  const prenom = propre(p.prenom);
  const entreprise = propre(p.entreprise);
  return `Bonjour${prenom ? ` ${prenom}` : ""}, je viens de t'ajouter à l'équipe${entreprise ? ` ${entreprise}` : ""} sur Compyo. Un e-mail de Compyo t'attend : regarde aussi dans les indésirables.`;
}

/** WhatsApp sans destinataire : l'artisan choisit le contact, texte prêt.
 *  Rien n'est envoyé : c'est lui qui appuie sur envoyer. */
export function lienPartageWhatsApp(texte: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}

// ---------------------------------------------------------------- le choix

export type ContexteMessage = {
  telephone: string | null;
  adresse: string | null;
  /** Création du projet, pour l'accusé de réception. */
  creeLe: string;
  /** Un message a-t-il déjà été préparé pour ce projet ? */
  dejaContacte: boolean;
  signature: Signature;
  facturesDues: { id: string; numero: string; date_emission: string; date_echeance: string | null; total_ttc: number | null }[];
  devisEnvoyes: { id: string; numero: string; envoye_le: string | null }[];
  /** Rendez-vous à faire, à partir d'aujourd'hui. */
  rdvs: { id: string; date_heure: string }[];
  meteo?: { dateRdv: string; resume: string | null } | null;
};

export type Suggestion = { cle: CleMessage; texte: string; factureId?: string };

/** Mêmes seuils que les relances existantes (app/api/cron/). */
const JOURS_APRES_ECHEANCE = 3;
const JOURS_SANS_ECHEANCE = 15;
const JOURS_RELANCE_DEVIS = 5;
const JOUR = 86400000;

function memeJourParis(a: Date, b: Date) {
  const f = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
  return f.format(a) === f.format(b);
}

/** Deux ou trois messages au plus, le plus probable en premier, par
 *  simples règles — sans IA. `prioritaire` (venu d'une notification ou de
 *  l'accueil) passe devant. */
export function suggererMessages(
  ctx: ContexteMessage,
  maintenant: Date,
  prioritaire?: {
    cle: CleMessage;
    factureId?: string | null;
    devisId?: string | null;
    /** Pour « decalage » : l'ancienne et la nouvelle date du rendez-vous. */
    ancienneDate?: string | null;
    nouvelleDate?: string | null;
  } | null
): Suggestion[] {
  const s: Suggestion[] = [];
  const ajouter = (x: Suggestion | null) => {
    if (x && !s.some((y) => y.cle === x.cle)) s.push(x);
  };
  const t = maintenant.getTime();

  const factureEchue = ctx.facturesDues
    .filter((f) =>
      f.date_echeance
        ? t - Date.parse(f.date_echeance) >= JOURS_APRES_ECHEANCE * JOUR
        : t - Date.parse(f.date_emission) >= JOURS_SANS_ECHEANCE * JOUR
    )
    .sort((a, b) => Date.parse(a.date_emission) - Date.parse(b.date_emission));
  const devisSansReponse = ctx.devisEnvoyes
    .filter((d) => d.envoye_le && t - Date.parse(d.envoye_le) >= JOURS_RELANCE_DEVIS * JOUR)
    .sort((a, b) => Date.parse(a.envoye_le as string) - Date.parse(b.envoye_le as string));
  const rdvs = [...ctx.rdvs].sort((a, b) => Date.parse(a.date_heure) - Date.parse(b.date_heure));
  const rdvAujourdhui = rdvs.find((r) => memeJourParis(new Date(r.date_heure), maintenant));
  const rdvAVenir = rdvs.find((r) => Date.parse(r.date_heure) > t && !memeJourParis(new Date(r.date_heure), maintenant));

  const facture = (id?: string | null) => {
    const f = (id && ctx.facturesDues.find((x) => x.id === id)) || factureEchue[0];
    return f
      ? {
          cle: "relancePaiement" as const,
          factureId: f.id,
          texte: relancePaiement({ numero: f.numero, dateFacture: f.date_emission, montant: f.total_ttc, signature: ctx.signature }),
        }
      : null;
  };
  const devis = (id?: string | null) => {
    const d = (id && ctx.devisEnvoyes.find((x) => x.id === id)) || devisSansReponse[0];
    return d ? { cle: "relanceDevis" as const, texte: relanceDevis({ numero: d.numero, dateEnvoi: d.envoye_le, signature: ctx.signature }) } : null;
  };

  // Ce qui a été demandé explicitement (notification, bouton Relancer).
  if (prioritaire?.cle === "relancePaiement") ajouter(facture(prioritaire.factureId));
  if (prioritaire?.cle === "relanceDevis") ajouter(devis(prioritaire.devisId));
  if (prioritaire?.cle === "decalage" && prioritaire.ancienneDate)
    ajouter({
      cle: "decalage",
      texte: decalage({ dateRdv: prioritaire.ancienneDate, nouvelleDate: prioritaire.nouvelleDate, signature: ctx.signature }),
    });
  // 6. L'alerte météo passe en premier quand elle est active.
  if (ctx.meteo) ajouter({ cle: "meteo", texte: meteo({ dateRdv: ctx.meteo.dateRdv, resumeMeteo: ctx.meteo.resume }) });
  // 1. Facture échue non payée.
  if (factureEchue.length > 0) ajouter(facture());
  // 2. Devis envoyé sans réponse au-delà du seuil.
  if (devisSansReponse.length > 0) ajouter(devis());
  // 3. Rendez-vous aujourd'hui.
  if (rdvAujourdhui) {
    ajouter({ cle: "retard", texte: retard({ signature: ctx.signature }) });
    ajouter({ cle: "rappelRdv", texte: rappelRdv({ dateRdv: rdvAujourdhui.date_heure, adresse: ctx.adresse, signature: ctx.signature }) });
  }
  // 4. Rendez-vous à venir.
  if (rdvAVenir) {
    ajouter({ cle: "rappelRdv", texte: rappelRdv({ dateRdv: rdvAVenir.date_heure, adresse: ctx.adresse, signature: ctx.signature }) });
    ajouter({ cle: "decalage", texte: decalage({ dateRdv: rdvAVenir.date_heure, signature: ctx.signature }) });
  }
  // 5. Projet créé il y a moins de 24 h, jamais contacté.
  if (!ctx.dejaContacte && t - Date.parse(ctx.creeLe) < JOUR) ajouter({ cle: "accuse", texte: accuse({ signature: ctx.signature }) });

  return s.slice(0, 3);
}

/** La première phrase d'un message, pour que l'artisan sache ce qu'il
 *  envoie sans tout lire. Avec `phrases = 2` (refonte 02/10 : un décalage
 *  dont la nouvelle date est dans la deuxième phrase), les deux premières. */
export function premierePhrase(texte: string, phrases = 1): string {
  const ligne = texte.split("\n")[0];
  let fin = -1;
  for (let i = 0; i < phrases; i++) {
    const suite = ligne.slice(fin + 1).search(/[.?!](\s|$)/);
    if (suite === -1) return ligne;
    fin += suite + 1;
  }
  return ligne.slice(0, fin + 1);
}
