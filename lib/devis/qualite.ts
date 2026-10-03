import type { SourceDocumentDevis } from "@/lib/devis/modeleDocument";
import { estEntrepreneurIndividuel } from "@/lib/devis/mentionsLegales";
import type { LigneDevisCalculee, MentionsLegales, ParametresEntreprise } from "@/types";
import {
  estLigneAjustementMinimum,
  estUniteHeure,
  estUniteJour,
  joursDeMainOeuvre,
  joursDepuisTexte,
  tarifJournee,
} from "@/lib/moteur-metier/tempsMainOeuvre";

// ============================================================
// Score du devis (17/09) — deux questions, séparées :
//
// 1. CONFORMITÉ : ce document tient-il la route juridiquement ? (assurance
//    décennale, identité de l'entreprise, objet, validité…)
// 2. LISIBILITÉ : un client qui le reçoit comprend-il ce qu'il achète ?
//    (libellés vagues, "Divers" à répétition, devis long non découpé…)
//
// Ce score N'EMPÊCHE JAMAIS D'ENVOYER. C'est un avis, pas un contrôle :
// l'artisan connaît son métier et ses clients mieux que nous, et il peut
// avoir une bonne raison pour chaque point. Il dit ce qui manque et
// pourquoi ça compte — à lui de décider.
// ============================================================

export type NiveauPoint = "ok" | "attention" | "conseil";

export type PointQualite = {
  id: string;
  niveau: NiveauPoint;
  libelle: string;
  detail: string;
  // Où corriger, quand ce n'est pas sur cet écran.
  lien?: { texte: string; href: string };
};

export type EvaluationDevis = {
  score: number; // 0 à 100, conformité seulement
  conformite: PointQualite[];
  lisibilite: PointQualite[];
  aVerifier: number; // nombre de points qui ne sont pas "ok"
};

const PARAMETRES = { texte: "Compléter mes paramètres", href: "/dashboard/parametres" };

const vide = (v: string | null | undefined) => !v || !v.trim();

// Libellés qui ne disent rien au client. On reste tolérant : un mot seul
// ("Carrelage") peut suffire, c'est "Divers", "Travaux", "Prestation" qui
// posent problème.
const MOTS_VAGUES = /^(divers|travaux|prestation|prestations|forfait|fourniture|fournitures|main.?d.?oeuvre|autre|autres|supplément|supplements?)\b/i;

// Le temps et son prix (21/09) : une journée au prix d'une heure, ou une
// heure au prix d'une journée. Partagé par le score du devis (ci-dessous) et
// par les lignes à revoir (lignesADoute), pour qu'ils ne divergent jamais.
type TarifsTemps = Pick<ParametresEntreprise, "cout_horaire" | "cout_journalier">;

const jourAuPrixHeure = (l: { unite: string; prix_unitaire: number }, t: TarifsTemps) =>
  estUniteJour(l.unite) && l.prix_unitaire > 0 && l.prix_unitaire <= t.cout_horaire * 2;

const heureAuPrixJour = (l: { unite: string; prix_unitaire: number }, t: TarifsTemps) =>
  estUniteHeure(l.unite) && l.prix_unitaire >= t.cout_horaire * 4;

function point(
  id: string,
  ok: boolean,
  libelle: string,
  detail: string,
  options: { lien?: PointQualite["lien"]; niveauSiFaux?: NiveauPoint; detailOk?: string } = {}
): PointQualite {
  return {
    id,
    niveau: ok ? "ok" : options.niveauSiFaux ?? "attention",
    libelle,
    detail: ok ? options.detailOk ?? detail : detail,
    ...(ok ? {} : { lien: options.lien }),
  };
}

export function evaluerDevis(
  source: Pick<
    SourceDocumentDevis,
    "lignes" | "lots" | "objet" | "validite_jours" | "tva_pct" | "mention_tva_reduite" | "duree_estimee"
  >,
  mentions: MentionsLegales | null,
  // 21/09 — facultatif : sans les tarifs de l'artisan, les contrôles de
  // cohérence prix / unité ne peuvent pas se faire et sont simplement sautés.
  tarifs?: Pick<ParametresEntreprise, "cout_horaire" | "cout_journalier"> | null
): EvaluationDevis {
  const m = mentions;
  const lignes = source.lignes.filter((l) => l.categorie !== "deplacement");

  // ---- Conformité (ce qui pèse dans le score) ---------------------------
  const conformiteAvecPoids: { p: PointQualite; poids: number }[] = [
    {
      poids: 30,
      p: point(
        "decennale",
        !vide(m?.assurance_decennale_compagnie) && !vide(m?.assurance_decennale_police),
        "Assurance décennale",
        "Obligatoire sur un devis de travaux du bâtiment (art. L243-3 du code des assurances) : assureur et numéro de police. Son absence peut coûter très cher en cas de contrôle.",
        { lien: PARAMETRES, detailOk: "Assureur et numéro de police indiqués sur le devis." }
      ),
    },
    {
      poids: 8,
      p: point(
        "decennale_zone",
        !vide(m?.assurance_decennale_zone),
        "Couverture géographique de la décennale",
        "La zone couverte par votre décennale doit figurer avec elle (par exemple « France métropolitaine »).",
        { lien: PARAMETRES, niveauSiFaux: "conseil" }
      ),
    },
    {
      poids: 8,
      p: point(
        "rc_pro",
        !vide(m?.rc_pro_compagnie),
        "Responsabilité civile professionnelle",
        "Attendue à côté de la décennale : elle couvre les dommages causés pendant le chantier.",
        { lien: PARAMETRES, niveauSiFaux: "conseil" }
      ),
    },
    {
      poids: 15,
      p: point(
        "identite",
        !vide(m?.nom_entreprise) && !vide(m?.siret),
        "Identité de l'entreprise",
        "Nom et SIRET : c'est ce qui distingue un vrai devis d'un simple papier.",
        { lien: PARAMETRES, detailOk: "Nom, SIRET et forme juridique sur le document." }
      ),
    },
    {
      poids: 10,
      p: point(
        "coordonnees",
        !vide(m?.adresse) && (!vide(m?.telephone) || !vide(m?.email)),
        "Coordonnées",
        "Adresse et au moins un moyen de vous joindre : votre client doit pouvoir vous répondre.",
        { lien: PARAMETRES }
      ),
    },
    {
      poids: 6,
      p: point(
        "mediateur",
        !vide(m?.mediateur_nom),
        "Médiateur de la consommation",
        "Obligatoire quand on travaille pour des particuliers : ses coordonnées doivent figurer sur le devis.",
        { lien: PARAMETRES, niveauSiFaux: "conseil" }
      ),
    },
    {
      poids: 15,
      p: point(
        "objet",
        !vide(source.objet),
        "Objet des travaux",
        "Une phrase qui dit ce qui va être fait. C'est la première chose que lit votre client.",
        { detailOk: "Une phrase claire ouvre le devis." }
      ),
    },
    {
      poids: 8,
      p: point(
        "validite",
        Boolean(source.validite_jours && source.validite_jours > 0),
        "Durée de validité",
        "Sans durée de validité, votre prix vous engage sans limite de temps.",
        { detailOk: `Offre valable ${source.validite_jours} jours.` }
      ),
    },
  ];

  // Franchise de TVA cochée mais TVA appliquée : une des deux informations
  // est fausse, et c'est le client qui la lira.
  if (m?.mention_tva_non_applicable && Number(source.tva_pct ?? 0) > 0) {
    conformiteAvecPoids.push({
      poids: 10,
      p: {
        id: "tva_contradiction",
        niveau: "attention",
        libelle: "TVA contradictoire",
        detail: `Vos paramètres indiquent « TVA non applicable (art. 293 B) », mais ce devis applique ${source.tva_pct} %. Corrigez l'un ou l'autre avant l'envoi.`,
        // Le groupe « Mentions légales » s'ouvre directement (lot F).
        lien: { texte: PARAMETRES.texte, href: `${PARAMETRES.href}#mentions` },
      },
    });
  }

  // Taux réduit : la mention qui le justifie remplace l'ancienne
  // attestation papier depuis février 2025.
  const tauxReduit = Number(source.tva_pct ?? 0) > 0 && Number(source.tva_pct) < 20;
  if (tauxReduit) {
    conformiteAvecPoids.push({
      poids: 10,
      p: point(
        "mention_tva_reduite",
        !vide(source.mention_tva_reduite),
        "Justification du taux réduit",
        `Ce devis applique ${source.tva_pct} % de TVA : la mention qui le justifie doit figurer sur le document (elle remplace l'attestation papier depuis février 2025).`
      ),
    });
  }

  const poidsTotal = conformiteAvecPoids.reduce((s, c) => s + c.poids, 0);
  const poidsObtenu = conformiteAvecPoids.reduce((s, c) => s + (c.p.niveau === "ok" ? c.poids : 0), 0);

  // ---- Lisibilité (des conseils, jamais dans le score) ------------------
  const lisibilite: PointQualite[] = [];

  const vagues = lignes.filter((l) => MOTS_VAGUES.test(l.description.trim()) || l.description.trim().length < 8);
  lisibilite.push(
    point(
      "libelles",
      vagues.length === 0,
      "Libellés compréhensibles",
      vagues.length === 1
        ? `« ${vagues[0]?.description.trim()} » ne dit pas au client ce qu'il achète. Une ligne précise se négocie moins.`
        : `${vagues.length} lignes ne disent pas au client ce qu'il achète (par exemple « ${vagues[0]?.description.trim()} »). Des lignes précises se négocient moins.`,
      { niveauSiFaux: "conseil", detailOk: "Chaque ligne dit ce qu'elle contient." }
    )
  );

  const divers = lignes.filter((l) => /divers/i.test(l.description));
  if (divers.length >= 2) {
    lisibilite.push({
      id: "divers",
      niveau: "conseil",
      libelle: "Trop de « divers »",
      detail: `${divers.length} lignes contiennent « divers ». C'est exactement ce qu'un client compare en premier avec un autre devis.`,
    });
  }

  const sansLots = (source.lots ?? []).length === 0;
  if (lignes.length >= 8 && sansLots) {
    lisibilite.push({
      id: "lots",
      niveau: "conseil",
      libelle: "Découpage en lots",
      detail: `${lignes.length} lignes à la suite, c'est long à lire. Regroupez-les par pièce ou par étape (bouton « Organiser en lots ») : le client comprend mieux, et il peut arbitrer lot par lot plutôt que de tout refuser.`,
    });
  }

  const gratuites = lignes.filter((l) => l.total === 0);
  if (gratuites.length > 0) {
    lisibilite.push({
      id: "lignes_zero",
      niveau: "conseil",
      libelle: "Lignes à 0 €",
      detail: `${gratuites.length} ligne${gratuites.length > 1 ? "s" : ""} à 0,00 € apparaîtra${gratuites.length > 1 ? "ont" : ""} telle${gratuites.length > 1 ? "s" : ""} quelle${gratuites.length > 1 ? "s" : ""} sur le devis. Si c'est un geste commercial, dites-le dans le libellé (« offert »).`,
    });
  }

  // ---- Cohérence du temps (21/09) — voir tempsMainOeuvre.ts --------------
  // Ce que l'œil de l'artisan rate le plus facilement : une ligne passée en
  // jours qui a gardé le prix d'une heure, et une durée annoncée au client
  // sans rapport avec la main-d'œuvre qu'il paie.
  const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
  if (tarifs && tarifs.cout_horaire > 0) {
    const mainOeuvre = lignes.filter((l) => l.categorie === "main_oeuvre" && !estLigneAjustementMinimum(l));
    const journee = tarifJournee(tarifs);
    const jourAuPrixHeureTrouve = mainOeuvre.find((l) => jourAuPrixHeure(l, tarifs));
    if (jourAuPrixHeureTrouve) {
      lisibilite.push({
        id: "unite_prix",
        niveau: "attention",
        libelle: "Prix d'une heure sur une ligne en jours",
        detail: `« ${jourAuPrixHeureTrouve.description.trim()} » est comptée en jours, à ${euros(jourAuPrixHeureTrouve.prix_unitaire)} l'unité : c'est le prix d'une heure. Une journée vous coûte ${euros(journee)}. Choisissez « jour » dans l'unité de la ligne : le prix se corrige tout seul.`,
      });
    }
    const heureAuPrixJourTrouvee = mainOeuvre.find((l) => heureAuPrixJour(l, tarifs));
    if (heureAuPrixJourTrouvee) {
      lisibilite.push({
        id: "unite_prix_heure",
        niveau: "attention",
        libelle: "Prix d'une journée sur une ligne en heures",
        detail: `« ${heureAuPrixJourTrouvee.description.trim()} » est comptée en heures, à ${euros(heureAuPrixJourTrouvee.prix_unitaire)} l'heure, alors que votre tarif horaire est de ${euros(tarifs.cout_horaire)}. Si c'est un prix à la journée, choisissez « jour » dans l'unité de la ligne.`,
      });
    }
  }

  const dureeAnnoncee = joursDepuisTexte(source.duree_estimee);
  const joursDeTravail = joursDeMainOeuvre(lignes);
  // Seulement quand la durée annoncée est bien PLUS COURTE que le travail
  // facturé : un chantier plus long que sa main-d'œuvre est souvent normal
  // (séchage, livraisons), l'inverse fait croire au client à un chantier
  // express qu'il paie pourtant plusieurs jours.
  if (dureeAnnoncee !== null && joursDeTravail >= 1 && dureeAnnoncee < joursDeTravail / 2) {
    const jours = Math.round(joursDeTravail * 2) / 2;
    lisibilite.push({
      id: "duree_estimee",
      niveau: "conseil",
      libelle: "Durée estimée",
      detail: `Le devis annonce « ${source.duree_estimee?.trim()} », mais sa main-d'œuvre représente environ ${String(jours).replace(".", ",")} jour${jours > 1 ? "s" : ""} de travail (à 8 h par jour). Si vous êtes plusieurs sur le chantier, c'est peut-être normal ; sinon, le client s'attend à un chantier bien plus court que ce qu'il paie.`,
    });
  }

  // La mention "EI" se déduit de la forme juridique : si elle manque, le
  // devis d'un entrepreneur individuel n'est pas conforme depuis 2022.
  if (m && !estEntrepreneurIndividuel(m.forme_juridique) && vide(m.forme_juridique)) {
    lisibilite.push({
      id: "forme_juridique",
      niveau: "conseil",
      libelle: "Forme juridique",
      detail: "Indiquez votre forme juridique (SARL, micro-entreprise…) : un entrepreneur individuel doit faire figurer « EI » à côté de son nom depuis 2022.",
      lien: PARAMETRES,
    });
  }

  const conformite = conformiteAvecPoids.map((c) => c.p);
  return {
    score: poidsTotal === 0 ? 100 : Math.round((poidsObtenu / poidsTotal) * 100),
    conformite,
    lisibilite,
    aVerifier: [...conformite, ...lisibilite].filter((p) => p.niveau !== "ok").length,
  };
}

// ============================================================
// Les lignes à remettre sous les yeux de l'artisan (refonte du 03/10, duel F
// lot 3) — sur téléphone, la revue du devis (components/devis/RevueDevis.tsx)
// montre les lignes signalées en premier, avec UN mot d'alerte devant leur
// détail.
//
// Un signal informe, il ne demande pas de tampon : aucune ligne n'a de case
// « vérifié », et une liste sans signal est simplement une liste (jamais un
// « rien d'inhabituel », qui rassurerait sans rien avoir vérifié).
//
// Une ligne porte au plus UN signal, le plus utile d'abord. Ne sont
// signalés que des constats qu'on peut prouver (une quantité à 0, un prix à
// 0, une journée au prix d'une heure, un prix qui vient de Compyo et non de
// l'artisan) — pas des intuitions.
// ============================================================

export type SignalLigne = {
  id: "quantite" | "prix" | "prix_a_verifier" | "prix_compyo";
  /** Le mot d'alerte, tel qu'il s'affiche devant le détail de la ligne. */
  libelle: string;
};

type LigneARelire = Pick<
  LigneDevisCalculee,
  "description" | "categorie" | "quantite" | "unite" | "prix_unitaire" | "prix_source" | "detail_calcul"
>;

// Le seul signal prouvable aujourd'hui : le prix vient du tarif de référence
// interne de Compyo, pas de l'artisan. calculerDevis le pose (prix_source) ;
// l'éditeur le passe à « artisan » dès que l'artisan tape un prix. Les devis
// d'avant n'ont pas ce champ : on se replie sur la note de calcul que le
// moteur a toujours écrite pour ces lignes.
export function estPrixCompyo(ligne: Pick<LigneDevisCalculee, "prix_source" | "detail_calcul">): boolean {
  if (ligne.prix_source) return ligne.prix_source === "compyo";
  return (ligne.detail_calcul ?? "").trim().startsWith("Tarif de référence interne");
}

/** Un signal (ou null) par ligne, dans l'ordre des lignes reçues. */
export function lignesADoute(
  lignes: LigneARelire[],
  tarifs?: Pick<ParametresEntreprise, "cout_horaire" | "cout_journalier"> | null
): (SignalLigne | null)[] {
  return lignes.map((l) => {
    // Calculée par Compyo pour atteindre le minimum d'heures : pas une
    // saisie de l'artisan, rien à lui faire relire.
    if (estLigneAjustementMinimum(l)) return null;
    if (!(l.quantite > 0)) return { id: "quantite", libelle: "Quantité à saisir" };
    if (!(l.prix_unitaire > 0)) return { id: "prix", libelle: "Prix à saisir" };
    if (tarifs && tarifs.cout_horaire > 0 && l.categorie === "main_oeuvre") {
      if (jourAuPrixHeure(l, tarifs) || heureAuPrixJour(l, tarifs)) {
        return { id: "prix_a_verifier", libelle: "Prix à vérifier" };
      }
    }
    if (estPrixCompyo(l)) return { id: "prix_compyo", libelle: "Prix Compyo" };
    return null;
  });
}
