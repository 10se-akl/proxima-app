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
// dit la situation, une action principale, deux ou trois secondaires au
// plus. Le reste des actions vit dans le menu « … ».
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

export type Action = { id: IdAction; libelle: string };

export type ProchaineAction = {
  ton: "neutre" | "attente" | "succes" | "attention";
  /** La situation, en une phrase. */
  phrase: string;
  /** Une ou deux précisions utiles (prochain passage, tâches…). */
  details: string[];
  principale: Action | null;
  secondaires: Action[];
  /** Un point qui demande une décision (le projet a changé depuis le
   *  devis…). */
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

export function prochaineAction(e: EtatProjet): ProchaineAction {
  const details: string[] = [];
  if (e.prochainRdv) details.push(`Prochain passage : ${dateRdv(e.prochainRdv.date_heure)}`);
  if (e.nbTaches > 0) details.push(`${e.nbTaches} chose${e.nbTaches > 1 ? "s" : ""} à faire`);

  const engage = e.statut === "accepte" || e.statut === "en_cours" || e.statut === "termine";
  const devisChange =
    e.devis && e.derniereModification && new Date(e.derniereModification) > new Date(e.devis.created_at);

  // --- Le chantier est fini
  if (e.statut === "termine") {
    return {
      ton: "succes",
      phrase: e.termineLe ? `Chantier terminé le ${formatDate.format(new Date(e.termineLe))}.` : "Chantier terminé.",
      details: e.nbTaches > 0 ? [`${e.nbTaches} chose${e.nbTaches > 1 ? "s" : ""} encore à faire`] : [],
      principale: e.devis && e.devis.statut === "envoye" ? { id: "facturation", libelle: "Voir la facturation" } : null,
      secondaires: [],
    };
  }

  // --- Le chantier tourne
  if (e.statut === "en_cours") {
    const jours = e.demarreLe ? joursDepuis(e.demarreLe, e.maintenant) : null;
    return {
      ton: "neutre",
      phrase: jours !== null && jours > 0 ? `Chantier en cours depuis ${jours} jour${jours > 1 ? "s" : ""}.` : "Chantier en cours.",
      details,
      principale: { id: "ajouter", libelle: "Ajouter une note ou des photos" },
      secondaires: [
        ...(e.prochainRdv ? [] : [{ id: "planifier" as const, libelle: "Planifier un passage" }]),
        { id: "terminer", libelle: "Terminer le chantier" },
      ],
      alerte: devisChange
        ? { texte: "Le projet a changé depuis le devis signé.", action: { id: "dupliquer_devis", libelle: "Dupliquer le devis pour l'ajuster" } }
        : undefined,
    };
  }

  // --- Le client a signé
  if (e.statut === "accepte") {
    return {
      ton: "succes",
      phrase: "Le client a signé le devis.",
      details,
      principale: e.prochainRdv
        ? { id: "demarrer", libelle: "Démarrer le chantier" }
        : { id: "planifier", libelle: "Planifier le démarrage" },
      secondaires: [
        ...(e.prochainRdv ? [] : [{ id: "demarrer" as const, libelle: "Démarrer maintenant" }]),
        { id: "facturation", libelle: "Facturer un acompte" },
      ],
      alerte: devisChange
        ? { texte: "Le projet a changé depuis le devis signé.", action: { id: "dupliquer_devis", libelle: "Dupliquer le devis pour l'ajuster" } }
        : undefined,
    };
  }

  // --- Un devis existe (pas encore signé)
  if (e.devis && !engage) {
    const alerte = devisChange && e.devis.statut !== "brouillon"
      ? { texte: "Le projet a changé depuis ce devis (note, photo ou note vocale).", action: { id: "mettre_a_jour_devis" as const, libelle: "Mettre à jour le devis" } }
      : undefined;

    if (e.devis.statut === "refuse") {
      return {
        ton: "attention",
        phrase: "Le client a refusé le devis.",
        details,
        principale: { id: "dupliquer_devis", libelle: "Repartir de ce devis" },
        secondaires: [{ id: "generer_devis", libelle: "Faire un nouveau devis" }],
      };
    }
    if (e.devis.statut === "brouillon") {
      return {
        ton: "neutre",
        phrase: "Un devis est en préparation.",
        details,
        principale: { id: "ouvrir_devis", libelle: "Terminer le devis" },
        secondaires: [],
      };
    }
    if (e.devis.statut === "a_valider") {
      return {
        ton: "neutre",
        phrase: "Le devis est prêt : à relire, puis à envoyer.",
        details,
        principale: { id: "ouvrir_devis", libelle: "Ouvrir et envoyer" },
        secondaires: [],
        alerte,
      };
    }
    // Envoyé, en attente
    const jours = e.devis.envoye_le ? joursDepuis(e.devis.envoye_le, e.maintenant) : null;
    const sansReponse = jours !== null && jours >= 3;
    return {
      ton: sansReponse ? "attention" : "attente",
      phrase:
        jours === null
          ? "Devis envoyé, en attente de réponse."
          : sansReponse
            ? `Devis envoyé ${depuis(jours)}, toujours sans réponse.`
            : `Devis envoyé ${depuis(jours)}. En attente de la réponse du client.`,
      details,
      principale: sansReponse ? { id: "relancer", libelle: "Préparer une relance" } : { id: "ouvrir_devis", libelle: "Voir le devis" },
      secondaires: sansReponse ? [{ id: "ouvrir_devis", libelle: "Voir le devis" }] : [],
      alerte,
    };
  }

  // --- Pas encore de devis
  const secondaires: Action[] = [{ id: "devis_express", libelle: "Devis express" }];
  if (e.peutAnalyser && !e.analyseAJour) secondaires.push({ id: "analyser", libelle: "Résumer mes notes" });
  const precisions = [...details];
  if (e.nbInfosManquantes > 0) {
    precisions.push(`${e.nbInfosManquantes} point${e.nbInfosManquantes > 1 ? "s" : ""} à vérifier avant de chiffrer`);
  }
  return {
    ton: "neutre",
    phrase: e.prochainRdv ? "Nouvelle demande. Visite prévue avant de chiffrer." : "Nouvelle demande, pas encore chiffrée.",
    details: precisions,
    principale: { id: "generer_devis", libelle: "Préparer le devis" },
    secondaires,
  };
}
