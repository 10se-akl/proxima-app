import type { Devis, StatutProjet } from "@/types";
import { cleJour } from "./entreesCarnet";

// ============================================================
// « Maintenant » (24/09) — où en est le projet, et la prochaine chose à
// faire, en une phrase et un bouton.
//
// L'ancienne fiche montrait toujours le même parcours de vente (« 1.
// Cadrer, 2. Générer un devis, 3. Préparer une réponse »), même sur un
// chantier démarré depuis trois mois. L'artisan devait lire toute la page
// pour savoir quoi faire. Ici, l'état du projet décide : une phrase qui
// dit la situation, une action principale, une secondaire au plus (refonte
// 03/10). Le reste des actions vit dans le menu « … ».
//
// Pur et sans rendu : testé tel quel.
// ============================================================

export type IdAction =
  | "generer_devis"
  | "devis_express"
  | "analyser"
  | "ouvrir_devis"
  | "relancer"
  | "dupliquer_devis"
  | "mettre_a_jour_devis"
  | "planifier"
  | "demarrer"
  | "terminer"
  | "ajouter"
  | "facturation";

// 27/09 — `ia` : l'action appelle l'IA. Retour d'Axel : « l'IA, faut
// savoir où elle est ». Chaque bouton IA porte le même signal (l'étincelle
// et « avec l'IA »), et le bouton principal dit ce qu'elle va faire.
export type Action = { id: IdAction; libelle: string; ia?: boolean };

// Refonte (03/10, duel D lot 1) — « Maintenant » montre au plus un bouton
// plein et un bouton texte (règle 5 de docs/langage-interface.md). Avant,
// trois ou quatre boutons de même poids s'empilaient (Planifier,
// Démarrer maintenant, Facturer un acompte…) : il fallait lire pour
// choisir. Ce qui ne tient pas passe dans « … » (`dansMenu`), rien ne
// disparaît.
export type ProchaineAction = {
  ton: "neutre" | "attente" | "succes" | "attention";
  /** La situation, en une phrase courte (une ligne à 360 px). */
  phrase: string;
  /** Une ou deux précisions utiles (prochain passage, tâches…), affichées
   *  sur une seule ligne. */
  details: string[];
  /** Le bouton plein. */
  principale: Action | null;
  /** Au plus une autre action, en bouton texte (en contour quand il n'y a
   *  pas de bouton plein). */
  secondaire: Action | null;
  /** Les autres actions utiles maintenant : elles vont dans « … ». */
  dansMenu: Action[];
  /** Un point qui demande une décision (le projet a changé depuis le
   *  devis…). Son action tient lieu de bouton texte. */
  alerte?: { texte: string; action: Action };
};

export type EtatProjet = {
  statut: StatutProjet;
  devis: Pick<Devis, "statut" | "envoye_le" | "created_at"> | null;
  derniereModification: string | null;
  demarreLe: string | null;
  termineLe: string | null;
  prochainRdv: { date_heure: string; titre: string } | null;
  nbTaches: number;
  nbInfosManquantes: number;
  peutAnalyser: boolean;
  analyseAJour: boolean;
  maintenant: Date;
};

const formatRdv = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});
const formatDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });

export function dateRdv(iso: string): string {
  return formatRdv.format(new Date(iso)).replace(" à ", ", ").replace(":", " h ").replace(/ h 00$/, " h");
}

function joursDepuis(iso: string, maintenant: Date): number {
  const a = cleJour(maintenant.toISOString());
  const b = cleJour(iso);
  return Math.round(
    (Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) /
      86400000
  );
}

function depuis(jours: number): string {
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} jours`;
}

// Refonte (03/10, duel D lot 1) — les phrases tiennent sur une ligne à
// 360 px (règle 2) : la situation en quelques mots, la précision dessous
// (« Chantier, jour 12. » puis « Prochain passage : lun. 8 h »).
export function prochaineAction(e: EtatProjet): ProchaineAction {
  const details: string[] = [];
  if (e.prochainRdv) details.push(`Prochain passage : ${dateRdv(e.prochainRdv.date_heure)}`);
  if (e.nbTaches > 0) details.push(`${e.nbTaches} chose${e.nbTaches > 1 ? "s" : ""} à faire`);

  const engage = e.statut === "accepte" || e.statut === "en_cours" || e.statut === "termine";
  const devisChange =
    e.devis && e.derniereModification && new Date(e.derniereModification) > new Date(e.devis.created_at);
  // Après la signature, on ne touche jamais au devis signé : on le
  // duplique. L'action vit dans « … » ; quand le projet a changé depuis,
  // l'alerte la montre aussi.
  const dupliquer: Action = { id: "dupliquer_devis", libelle: "Dupliquer le devis" };
  const alerteSigne = devisChange ? { texte: "Changé depuis le devis signé.", action: dupliquer } : undefined;

  // --- Le chantier est fini
  if (e.statut === "termine") {
    return {
      ton: "succes",
      phrase: "Chantier terminé.",
      details: [
        ...(e.termineLe ? [`Le ${formatDate.format(new Date(e.termineLe))}`] : []),
        ...(e.nbTaches > 0 ? [`${e.nbTaches} chose${e.nbTaches > 1 ? "s" : ""} encore à faire`] : []),
      ],
      principale: e.devis && e.devis.statut === "envoye" ? { id: "facturation", libelle: "Voir la facturation" } : null,
      secondaire: null,
      dansMenu: [],
    };
  }

  // --- Le chantier tourne
  if (e.statut === "en_cours") {
    const jours = e.demarreLe ? joursDepuis(e.demarreLe, e.maintenant) : null;
    return {
      ton: "neutre",
      phrase: jours !== null && jours >= 0 ? `Chantier, jour ${jours + 1}.` : "Chantier en cours.",
      details,
      principale: { id: "ajouter", libelle: "Ajouter une note ou des photos" },
      // Sans passage prévu, le chantier touche peut-être à sa fin. Avec
      // l'alerte, son action tient lieu de bouton texte : « Terminer »
      // reste dans « … ».
      secondaire: e.prochainRdv || alerteSigne ? null : { id: "terminer", libelle: "Terminer le chantier" },
      dansMenu: e.devis && !alerteSigne ? [dupliquer] : [],
      alerte: alerteSigne,
    };
  }

  // --- Le client a signé
  if (e.statut === "accepte") {
    return {
      ton: "succes",
      phrase: "Devis signé.",
      details,
      principale: e.prochainRdv
        ? { id: "demarrer", libelle: "Démarrer le chantier" }
        : { id: "planifier", libelle: "Planifier le démarrage" },
      secondaire: null,
      dansMenu: [
        ...(e.prochainRdv ? [] : [{ id: "demarrer" as const, libelle: "Démarrer maintenant" }]),
        { id: "facturation", libelle: "Facturer un acompte" },
        ...(e.devis && !alerteSigne ? [dupliquer] : []),
      ],
      alerte: alerteSigne,
    };
  }

  // --- Un devis existe (pas encore signé)
  if (e.devis && !engage) {
    const alerte = devisChange && e.devis.statut !== "brouillon"
      ? { texte: "Changé depuis ce devis.", action: { id: "mettre_a_jour_devis" as const, libelle: "Mettre à jour avec l'IA", ia: true } }
      : undefined;

    if (e.devis.statut === "refuse") {
      return {
        ton: "attention",
        phrase: "Devis refusé.",
        details,
        principale: { id: "dupliquer_devis", libelle: "Repartir de ce devis" },
        secondaire: { id: "generer_devis", libelle: "Nouveau devis avec l'IA", ia: true },
        dansMenu: [],
      };
    }
    if (e.devis.statut === "brouillon") {
      return {
        ton: "neutre",
        phrase: "Devis en préparation.",
        details,
        principale: { id: "ouvrir_devis", libelle: "Terminer le devis" },
        secondaire: null,
        dansMenu: [],
      };
    }
    if (e.devis.statut === "a_valider") {
      return {
        ton: "neutre",
        phrase: "Devis prêt à envoyer.",
        details: ["À relire avant l'envoi", ...details],
        principale: { id: "ouvrir_devis", libelle: "Ouvrir et envoyer" },
        secondaire: null,
        dansMenu: [],
        alerte,
      };
    }
    // Envoyé, en attente
    const jours = e.devis.envoye_le ? joursDepuis(e.devis.envoye_le, e.maintenant) : null;
    const sansReponse = jours !== null && jours >= 3;
    return {
      ton: sansReponse ? "attention" : "attente",
      phrase: sansReponse ? "Devis sans réponse." : "Devis envoyé.",
      details: [...(jours !== null ? [`Envoyé ${depuis(jours)}`] : ["En attente du client"]), ...details],
      principale: sansReponse ? { id: "relancer", libelle: "Relancer avec l'IA", ia: true } : { id: "ouvrir_devis", libelle: "Voir le devis" },
      // « Voir le devis » reste aussi à un appui sur la ligne du devis.
      secondaire: sansReponse && !alerte ? { id: "ouvrir_devis", libelle: "Voir le devis" } : null,
      dansMenu: [],
      alerte,
    };
  }

  // --- Pas encore de devis
  // « Faire le devis moi-même » (un devis vide, sans l'IA) et « Résumer mes
  // notes avec l'IA » sont dans « … » : le bouton plein suffit ici.
  const precisions = [...details];
  if (e.nbInfosManquantes > 0) {
    precisions.push(`${e.nbInfosManquantes} point${e.nbInfosManquantes > 1 ? "s" : ""} à vérifier`);
  }
  return {
    ton: "neutre",
    phrase: e.prochainRdv ? "Visite prévue." : "Pas encore chiffré.",
    details: precisions,
    principale: { id: "generer_devis", libelle: "Préparer le devis avec l'IA", ia: true },
    secondaire: null,
    dansMenu: [],
  };
}
