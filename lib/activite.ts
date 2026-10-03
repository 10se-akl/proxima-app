import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bornes,
  decaler,
  joursCalendaires,
  memeMois,
  moisCourant,
  aujourdhuiParis,
  type Mois,
} from "@/lib/moisParis";
import { arrondi, devisRetenu, resumerAEncaisser } from "@/lib/argent";

// ============================================================
// L'activité d'un mois (21/09) — ce que lit la page /dashboard/bilan.
//
// Une règle, la même que pour le bilan d'origine : aucun chiffre qui ne
// se vérifie pas à partir des données de l'artisan. Pas d'estimation
// présentée comme un fait, pas de "rentabilité horaire" — Compyo ne sait
// pas combien d'heures il a réellement passé sur un chantier, et un
// chiffre inventé ici serait pire que pas de chiffre du tout.
//
// Ce qu'on SAIT, en revanche, et qui répond à « où ai-je passé trop de
// temps pour pas assez d'argent » : la durée réelle d'un chantier (du
// démarrage à la fin, deux dates que l'artisan a lui-même posées) et le
// montant de son devis. D'où le montant par jour de chantier.
//
// Sources, choisies pour ne jamais dépendre d'un journal qui pourrait
// avoir raté une écriture :
//   - devis acceptés : demandes.accepte_le. Les DEUX chemins
//     d'acceptation l'écrivent (le bouton "Marquer accepté" et la
//     signature en ligne, voir lib/devis/actions.ts et la fonction
//     repondre_devis de schema.sql), dans la même écriture que le statut
//     du projet. Le bilan d'origine comptait les événements de timeline,
//     dont l'écriture pouvait échouer sans que personne ne le voie ;
//   - devis envoyés : devis.envoye_le ;
//   - encaissé : factures payées, par date de PAIEMENT (payee_le), jamais
//     d'émission ;
//   - montants : TTC partout, comme sur les factures et le relevé
//     bancaire. Mélanger HT et TTC sur un même écran, c'est garantir une
//     mauvaise lecture.
//
// Toutes les colonnes lues existent depuis le Module 32 au plus tard :
// rien ici ne dépend d'une migration récente.
// ============================================================

export type ChiffresMois = {
  signe: number; // somme TTC des devis acceptés
  encaisse: number; // factures payées
  devisEnvoyes: number;
  devisAcceptes: number;
};

export type ChantierTermine = {
  demandeId: string;
  client: string;
  typeChantier: string;
  jours: number | null; // null si la date de démarrage n'a jamais été posée
  montant: number | null; // null si aucun devis retrouvé
  parJour: number | null;
};

export type Activite = {
  mois: Mois;
  /** Mois en cours : les chiffres sont "à ce jour", pas définitifs. */
  enCours: boolean;
  /** Jour du mois jusqu'auquel on compare, si le mois est en cours. */
  jourCompare: number | null;
  actuel: ChiffresMois;
  /** Même période du mois précédent : du 1er au même jour s'il s'agit du
   *  mois en cours, le mois entier sinon. Comparer le 5 septembre à tout
   *  le mois d'août donnerait « −85 % » chaque début de mois — un chiffre
   *  vrai qui raconte n'importe quoi. */
  precedent: ChiffresMois;
  historique: { mois: Mois; signe: number; encaisse: number }[];
  chantiersTermines: ChantierTermine[];
  /** Médiane, en jours, entre l'envoi du devis et son acceptation. */
  delaiSignatureJours: number | null;
  aEncaisser: { total: number; nombre: number; enRetard: number };
};

const MOIS_HISTORIQUE = 6;

type LigneDevis = {
  demande_id: string;
  statut: string;
  total_estime: number | null;
  envoye_le: string | null;
  signe_le: string | null;
};

type LigneDemande = {
  id: string;
  nom_client: string | null;
  type_chantier: string | null;
  accepte_le: string | null;
  demarre_le: string | null;
  termine_le: string | null;
};

// Le devis accepté d'un projet (devisRetenu) et le total à encaisser
// (resumerAEncaisser) viennent de lib/argent.ts (refonte 03/10) : la page
// Argent et l'accueil montrent ainsi les mêmes chiffres que le Bilan.

function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2 ? tri[milieu] : (tri[milieu - 1] + tri[milieu]) / 2;
}

function dansIntervalle(iso: string | null, debut: Date, fin: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= debut.getTime() && t < fin.getTime();
}

export async function calculerActivite(
  supabase: SupabaseClient,
  organisationId: string,
  mois: Mois,
  maintenant = new Date()
): Promise<Activite> {
  const courant = moisCourant(maintenant);
  const enCours = memeMois(mois, courant);

  const { debut, fin } = bornes(mois);
  const premierMoisHistorique = decaler(mois, -(MOIS_HISTORIQUE - 1));
  const debutFenetre = bornes(premierMoisHistorique).debut;
  // La fenêtre va jusqu'à la fin du mois choisi — ou jusqu'à maintenant
  // s'il est en cours, pour ne jamais compter l'avenir.
  const finFenetre = enCours ? maintenant : fin;

  // Période de comparaison.
  const moisPrecedent = decaler(mois, -1);
  const bornesPrecedent = bornes(moisPrecedent);
  let finComparaison = bornesPrecedent.fin;
  let jourCompare: number | null = null;
  if (enCours) {
    // Du 1er au même jour du mois précédent (borné à la longueur de ce
    // mois : le 31 octobre se compare au 30 septembre).
    const { jour } = aujourdhuiParis(maintenant);
    jourCompare = jour;
    const decalageDepuisDebut = maintenant.getTime() - debut.getTime();
    finComparaison = new Date(
      Math.min(bornesPrecedent.debut.getTime() + decalageDepuisDebut, bornesPrecedent.fin.getTime())
    );
  }

  const iso = (d: Date) => d.toISOString();

  const [
    { data: demandesAcceptees, error: e1 },
    { data: demandesTerminees, error: e2 },
    { data: devisEnvoyes, error: e3 },
    { data: facturesPayees, error: e4 },
    { data: facturesOuvertes, error: e5 },
  ] = await Promise.all([
    supabase
      .from("demandes")
      .select("id, nom_client, type_chantier, accepte_le, demarre_le, termine_le")
      .eq("organisation_id", organisationId)
      .gte("accepte_le", iso(debutFenetre))
      .lt("accepte_le", iso(finFenetre)),
    supabase
      .from("demandes")
      .select("id, nom_client, type_chantier, accepte_le, demarre_le, termine_le")
      .eq("organisation_id", organisationId)
      .gte("termine_le", iso(debut))
      .lt("termine_le", iso(enCours ? maintenant : fin)),
    supabase
      .from("devis")
      .select("envoye_le")
      .eq("organisation_id", organisationId)
      .gte("envoye_le", iso(debutFenetre))
      .lt("envoye_le", iso(finFenetre)),
    supabase
      .from("factures")
      .select("total_ttc, payee_le")
      .eq("organisation_id", organisationId)
      .eq("statut", "payee")
      .neq("type", "avoir")
      .gte("payee_le", iso(debutFenetre))
      .lt("payee_le", iso(finFenetre)),
    // Photographie à l'instant T, pas un chiffre du mois : ce qui reste
    // dû, maintenant. C'est ce que les artisans regardent d'abord.
    supabase
      .from("factures")
      .select("total_ttc, date_echeance, statut, type")
      .eq("organisation_id", organisationId)
      .eq("statut", "emise")
      .neq("type", "avoir"),
  ]);

  // Une requête en échec ne doit jamais s'afficher comme "0 €" : un zéro
  // faux est plus trompeur qu'une page d'erreur. On remonte l'erreur.
  const erreur = e1 ?? e2 ?? e3 ?? e4 ?? e5;
  if (erreur) throw new Error(`Activité : lecture impossible (${erreur.message})`);

  // Montant de chaque projet accepté ou terminé : une seule requête pour
  // tous les devis concernés.
  const idsProjets = Array.from(
    new Set([...(demandesAcceptees ?? []), ...(demandesTerminees ?? [])].map((d) => d.id))
  );
  const devisParProjet = new Map<string, LigneDevis[]>();
  if (idsProjets.length > 0) {
    const { data: devis, error } = await supabase
      .from("devis")
      .select("demande_id, statut, total_estime, envoye_le, signe_le")
      .in("demande_id", idsProjets);
    if (error) throw new Error(`Activité : devis illisibles (${error.message})`);
    for (const d of (devis ?? []) as LigneDevis[]) {
      const liste = devisParProjet.get(d.demande_id) ?? [];
      liste.push(d);
      devisParProjet.set(d.demande_id, liste);
    }
  }
  const montantProjet = (id: string): number | null => {
    const retenu = devisRetenu(devisParProjet.get(id) ?? []);
    return retenu?.total_estime != null ? Number(retenu.total_estime) : null;
  };

  function chiffres(debutP: Date, finP: Date): ChiffresMois {
    const acceptees = ((demandesAcceptees ?? []) as LigneDemande[]).filter((d) =>
      dansIntervalle(d.accepte_le, debutP, finP)
    );
    return {
      signe: arrondi(acceptees.reduce((s, d) => s + (montantProjet(d.id) ?? 0), 0)),
      encaisse: arrondi(
        (facturesPayees ?? [])
          .filter((f) => dansIntervalle(f.payee_le, debutP, finP))
          .reduce((s, f) => s + Number(f.total_ttc), 0)
      ),
      devisEnvoyes: (devisEnvoyes ?? []).filter((d) => dansIntervalle(d.envoye_le, debutP, finP)).length,
      devisAcceptes: acceptees.length,
    };
  }

  const historique = Array.from({ length: MOIS_HISTORIQUE }, (_, i) => {
    const m = decaler(premierMoisHistorique, i);
    const b = bornes(m);
    const c = chiffres(b.debut, memeMois(m, courant) ? maintenant : b.fin);
    return { mois: m, signe: c.signe, encaisse: c.encaisse };
  });

  const chantiersTermines: ChantierTermine[] = ((demandesTerminees ?? []) as LigneDemande[])
    .map((d) => {
      const jours = d.demarre_le && d.termine_le ? joursCalendaires(d.demarre_le, d.termine_le) : null;
      const montant = montantProjet(d.id);
      return {
        demandeId: d.id,
        client: d.nom_client?.trim() || "Client sans nom",
        typeChantier: d.type_chantier ?? "autre",
        jours,
        montant,
        parJour: jours && montant != null ? arrondi(montant / jours) : null,
      };
    })
    // Du chantier qui rapporte le moins par jour à celui qui rapporte le
    // plus : c'est la question posée, on y répond en premier.
    .sort((a, b) => (a.parJour ?? Infinity) - (b.parJour ?? Infinity));

  const delais = ((demandesAcceptees ?? []) as LigneDemande[])
    .filter((d) => dansIntervalle(d.accepte_le, debut, finFenetre))
    .map((d) => {
      const retenu = devisRetenu(devisParProjet.get(d.id) ?? []);
      if (!retenu?.envoye_le || !d.accepte_le) return null;
      const jours = (new Date(d.accepte_le).getTime() - new Date(retenu.envoye_le).getTime()) / 86400000;
      return jours >= 0 ? jours : null;
    })
    .filter((j): j is number => j !== null);

  return {
    mois,
    enCours,
    jourCompare,
    actuel: chiffres(debut, enCours ? maintenant : fin),
    precedent: chiffres(bornesPrecedent.debut, finComparaison),
    historique,
    chantiersTermines,
    delaiSignatureJours: (() => {
      const m = mediane(delais);
      return m === null ? null : Math.round(m * 10) / 10;
    })(),
    aEncaisser: resumerAEncaisser(facturesOuvertes ?? [], maintenant),
  };
}

/** Évolution d'un chiffre par rapport au mois précédent, prête à afficher.
 *  Jamais de "+∞ %" : partir de zéro, c'est "nouveau", pas une hausse. */
export function evolution(actuel: number, precedent: number): {
  sens: "hausse" | "baisse" | "stable" | "nouveau" | "aucun";
  pourcentage: number | null;
} {
  if (actuel === 0 && precedent === 0) return { sens: "aucun", pourcentage: null };
  if (precedent === 0) return { sens: "nouveau", pourcentage: null };
  const p = Math.round(((actuel - precedent) / precedent) * 100);
  if (p === 0) return { sens: "stable", pourcentage: 0 };
  return { sens: p > 0 ? "hausse" : "baisse", pourcentage: Math.abs(p) };
}
