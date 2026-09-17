import type { SourceDocumentDevis } from "@/lib/devis/modeleDocument";
import { estEntrepreneurIndividuel } from "@/lib/devis/mentionsLegales";
import type { MentionsLegales } from "@/types";

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
  source: Pick<SourceDocumentDevis, "lignes" | "lots" | "objet" | "validite_jours" | "tva_pct" | "mention_tva_reduite">,
  mentions: MentionsLegales | null
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
        lien: PARAMETRES,
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
