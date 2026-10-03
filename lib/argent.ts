import { aujourdhuiParis } from "@/lib/moisParis";

// ============================================================
// L'argent (refonte 03/10 — duel B, lot 2).
//
// Une seule fonction calcule les lignes d'argent : l'accueil (« À suivre »)
// et la page Argent l'appellent toutes les deux, avec les mêmes seuils.
// Sans ça, les deux écrans finiraient par diverger, et Sylvie verrait sur
// Argent une facture que Gérard ne voit pas sur l'accueil (ou l'inverse).
//
// Rien ici ne lit la base : les pages font leurs requêtes (en parallèle,
// une seule fois) et passent les lignes. On peut donc vérifier les règles
// avec des données simulées.
//
// Le total « à encaisser » est celui du Bilan (lib/activite.ts appelle
// resumerAEncaisser) : les factures émises, hors avoirs, en TTC.
// ============================================================

// Un devis envoyé apparaît dans « En attente du client » à partir de trois
// jours sans réponse (au-delà, sans relance, il est souvent perdu), et
// propose « Relancer » au premier palier des relances existantes (voir
// app/api/cron/relance-devis/route.ts).
export const JOURS_AFFICHAGE_DEVIS = 3;
export const JOURS_RELANCE_DEVIS = 5;
// Les factures : mêmes seuils que app/api/cron/relance-factures/route.ts.
// Une facture n'apparaît qu'une fois échue (ou, sans échéance, après
// quinze jours) : avant, elle n'est pas « impayée », juste en cours.
export const JOURS_APRES_ECHEANCE = 3;
export const JOURS_SANS_ECHEANCE = 15;
// Refonte (03/10 — duel C) : une relance préparée fait taire sa ligne sur
// l'accueil pendant sept jours. Sans ça, relancer ne retirait rien et la
// liste ne se vidait jamais.
export const JOURS_PAUSE_RELANCE = 7;

const JOUR_MS = 86400000;

type AvecClient = { demandes?: { nom_client?: string | null } | null };

export type DevisArgent = AvecClient & {
  id: string;
  statut: string;
  numero: string;
  envoye_le: string | null;
  created_at?: string | null;
  demande_id: string | null;
  artisan_id?: string | null;
  total_estime?: number | string | null;
  signe_le?: string | null;
};

export type FactureArgent = AvecClient & {
  id: string;
  numero: string;
  demande_id: string;
  statut: string;
  type: string;
  total_ttc?: number | string | null;
  date_emission: string;
  date_echeance: string | null;
  artisan_id?: string | null;
};

export type ProjetArgent = {
  id: string;
  nom_client: string;
  statut: string;
  accepte_le?: string | null;
  termine_le?: string | null;
  artisan_id?: string | null;
};

/** Une trace `message_prepare` du carnet (FeuilleMessageClient). */
export type MessagePrepare = {
  demande_id: string | null;
  created_at: string;
  metadata?: unknown;
};

export type LigneEnAttente = {
  id: string;
  genre: "facture" | "devis";
  demandeId: string | null;
  artisanId: string | null;
  /** Jours depuis l'échéance (facture) ou depuis l'envoi (devis). */
  jours: number;
  nom: string;
  quoi: string;
  montant: number | null;
  href: string;
  /** « Relancer », dès le seuil de relance ; null avant. */
  relance: string | null;
  /** Une relance a été préparée il y a moins de 7 jours. */
  relanceeRecemment: boolean;
};

export type LigneDevisAEnvoyer = {
  id: string;
  demandeId: string | null;
  artisanId: string | null;
  /** Jours depuis la création du devis. */
  jours: number;
  nom: string;
  quoi: "Devis à relire" | "Devis à envoyer";
  montant: number | null;
  href: string;
};

export type LigneAFacturer = {
  demandeId: string;
  artisanId: string | null;
  /** Jours depuis la fin du chantier. */
  jours: number;
  nom: string;
  /** Le devis accepté, TTC. */
  montantDevis: number;
  /** Ce qui reste à facturer, après acomptes, factures et avoirs. */
  solde: number;
  /** La fiche ; « Facturer » l'ouvre sur son bloc #facturation (FacturesProjet). */
  href: string;
};

export type AEncaisser = { total: number; nombre: number; enRetard: number };

export type Argent = {
  /** Factures impayées et devis sans réponse, du plus ancien au plus récent. */
  enAttente: LigneEnAttente[];
  /** Devis à relire (brouillon) puis à envoyer, du plus ancien au plus récent. */
  devisAEnvoyer: LigneDevisAEnvoyer[];
  aEncaisser: AEncaisser;
  /** Vide sauf avec `avecAFacturer` (voir calculerArgent). */
  aFacturer: LigneAFacturer[];
  totalAFacturer: number;
};

/** Supabase type une jointure « demandes(...) » comme un tableau, même si
 *  demande_id ne pointe jamais vers plus d'un projet : on aplatit. */
export function aplatirClient<T extends { demandes?: unknown }>(
  lignes: T[] | null | undefined
): (Omit<T, "demandes"> & { demandes: { nom_client?: string | null; adresse_client?: string | null } | null })[] {
  return (lignes ?? []).map((l) => ({
    ...l,
    demandes: (Array.isArray(l.demandes) ? l.demandes[0] ?? null : l.demandes ?? null) as {
      nom_client?: string | null;
      adresse_client?: string | null;
    } | null,
  }));
}

export function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}

const nombre = (v: number | string | null | undefined) => (v == null || v === "" ? null : Number(v));

/** Ce qui reste dû, maintenant : la même règle que le Bilan. */
export function resumerAEncaisser(
  factures: { statut?: string; type?: string; total_ttc?: number | string | null; date_echeance: string | null }[],
  maintenant = new Date()
): AEncaisser {
  const ouvertes = factures.filter((f) => f.statut === "emise" && f.type !== "avoir");
  // L'échéance est une date sans heure ("2026-09-21") : on la compare à la
  // date du jour à Paris, pas à celle d'UTC qui a un jour de retard avant
  // 2 h du matin.
  const jour = aujourdhuiParis(maintenant);
  const aujourdHui = `${jour.annee}-${String(jour.mois + 1).padStart(2, "0")}-${String(jour.jour).padStart(2, "0")}`;
  return {
    total: arrondi(ouvertes.reduce((s, f) => s + Number(f.total_ttc ?? 0), 0)),
    nombre: ouvertes.length,
    enRetard: ouvertes.filter((f) => f.date_echeance && f.date_echeance < aujourdHui).length,
  };
}

/** Le devis retenu pour un projet accepté : celui qui porte une signature
 *  s'il y en a une, sinon le dernier envoyé et non refusé. Partagé avec le
 *  Bilan (lib/activite.ts), pour que les montants soient les mêmes. */
export function devisRetenu<T extends { statut: string; envoye_le: string | null; signe_le?: string | null }>(
  devis: T[]
): T | null {
  const signe = devis.find((d) => d.signe_le);
  if (signe) return signe;
  const envoyes = devis
    .filter((d) => d.statut !== "refuse" && d.envoye_le)
    .sort((a, b) => (b.envoye_le ?? "").localeCompare(a.envoye_le ?? ""));
  return envoyes[0] ?? null;
}

function cleDe(metadata: unknown, champ: string): string | null {
  const v = (metadata as Record<string, unknown> | null)?.[champ];
  return typeof v === "string" ? v : null;
}

/**
 * « À facturer » (refonte 03/10 — duel B, lot 4, règle validée par le
 * fondateur) : un chantier terminé, dont le devis a été accepté, et dont
 * le solde reste positif après acomptes, factures et avoirs.
 *
 * - Le devis accepté est celui du Bilan (devisRetenu) : le montant affiché
 *   est le même que dans « Chantiers terminés ».
 * - Le déjà facturé additionne TOUTES les factures du projet, quel que soit
 *   leur statut, comme le fait la fiche (FacturesProjet.tsx) : une facture
 *   annulée et l'avoir qui l'annule s'y compensent ; filtrer les annulées
 *   compterait l'avoir sans la facture, et le solde serait faux.
 * - Un chantier terminé sans « oui » au devis (accepte_le vide) n'y est
 *   pas : Compyo ne sait pas ce qui a été vendu.
 */
function calculerAFacturer(
  projets: ProjetArgent[],
  devis: DevisArgent[],
  factures: FactureArgent[],
  maintenant: Date
): LigneAFacturer[] {
  const devisParProjet = new Map<string, DevisArgent[]>();
  for (const x of devis) {
    if (!x.demande_id) continue;
    devisParProjet.set(x.demande_id, [...(devisParProjet.get(x.demande_id) ?? []), x]);
  }
  const factureParProjet = new Map<string, number>();
  for (const f of factures) {
    factureParProjet.set(f.demande_id, (factureParProjet.get(f.demande_id) ?? 0) + Number(f.total_ttc ?? 0));
  }
  const nomParProjet = (id: string) => devis.find((x) => x.demande_id === id)?.demandes?.nom_client;

  return projets
    .filter((p) => p.statut === "termine" && p.accepte_le)
    .map((p) => {
      const retenu = devisRetenu(devisParProjet.get(p.id) ?? []);
      const montantDevis = nombre(retenu?.total_estime) ?? 0;
      const solde = arrondi(montantDevis - (factureParProjet.get(p.id) ?? 0));
      const fin = p.termine_le ?? p.accepte_le ?? null;
      return {
        demandeId: p.id,
        artisanId: p.artisan_id ?? null,
        jours: fin ? Math.max(0, Math.floor((maintenant.getTime() - Date.parse(fin)) / JOUR_MS)) : 0,
        nom: p.nom_client || nomParProjet(p.id) || "Client",
        montantDevis,
        solde,
        href: `/dashboard/demandes/${p.id}`,
      };
    })
    .filter((l) => l.montantDevis > 0 && l.solde > 0)
    .sort((a, b) => b.jours - a.jours);
}

export function calculerArgent(d: {
  devis: DevisArgent[];
  factures: FactureArgent[];
  /** Pour écarter les devis d'un chantier terminé (ses factures restent). */
  projets?: ProjetArgent[];
  /** Les traces `message_prepare` récentes, pour la pause après relance. */
  messages?: MessagePrepare[];
  /** Calculer « À facturer ». Il faut alors TOUTES les factures (pas
   *  seulement les émises), et les projets avec accepte_le et termine_le ;
   *  sinon le solde serait faux. L'accueil ne s'en sert pas. */
  avecAFacturer?: boolean;
  maintenant?: Date;
}): Argent {
  const maintenant = d.maintenant ?? new Date();
  const t = maintenant.getTime();
  const joursDepuis = (iso: string) => Math.floor((t - new Date(iso).getTime()) / JOUR_MS);

  const termines = new Set((d.projets ?? []).filter((p) => p.statut === "termine").map((p) => p.id));
  const devisActifs = d.devis.filter((x) => !x.demande_id || !termines.has(x.demande_id));
  // Un devis accepté garde le statut « envoye » (seul le projet passe à
  // « accepte », voir marquerDevisAccepte et repondre_devis) : sans ce
  // filtre, un chantier signé apparaissait en « Devis sans réponse ».
  const acceptes = new Set(
    (d.projets ?? []).filter((p) => ["accepte", "en_cours", "termine"].includes(p.statut)).map((p) => p.id)
  );

  // Les relances préparées depuis moins de sept jours.
  const recentes = (d.messages ?? []).filter((m) => t - Date.parse(m.created_at) < JOURS_PAUSE_RELANCE * JOUR_MS);
  const factureRelancee = (f: FactureArgent) =>
    recentes.some(
      (m) =>
        cleDe(m.metadata, "cle") === "relancePaiement" &&
        (cleDe(m.metadata, "facture_id") ? cleDe(m.metadata, "facture_id") === f.id : m.demande_id === f.demande_id)
    );
  // La trace d'une relance de devis ne porte que le projet (pas le devis) :
  // un projet n'a qu'un devis envoyé à la fois, en pratique.
  const devisRelance = (x: DevisArgent) =>
    recentes.some(
      (m) =>
        cleDe(m.metadata, "cle") === "relanceDevis" &&
        (cleDe(m.metadata, "devis_id") ? cleDe(m.metadata, "devis_id") === x.id : m.demande_id === x.demande_id)
    );

  // Une facture n'apparaît qu'une fois échue (ou, sans échéance, après
  // quinze jours). Un chantier terminé garde ses factures impayées : c'est
  // précisément là qu'elles comptent.
  const factures: LigneEnAttente[] = d.factures
    .filter((f) => f.statut === "emise" && f.type !== "avoir")
    .map((f) => {
      const jours = joursDepuis(f.date_echeance ?? f.date_emission);
      const affichee = f.date_echeance ? jours > 0 : jours >= JOURS_SANS_ECHEANCE;
      const aRelancer = f.date_echeance ? jours >= JOURS_APRES_ECHEANCE : jours >= JOURS_SANS_ECHEANCE;
      return { f, jours, affichee, aRelancer };
    })
    .filter((x) => x.affichee)
    .map(({ f, jours, aRelancer }) => ({
      id: f.id,
      genre: "facture" as const,
      demandeId: f.demande_id,
      artisanId: f.artisan_id ?? null,
      jours,
      nom: f.demandes?.nom_client || `Facture ${f.numero}`,
      quoi: "Facture impayée",
      montant: nombre(f.total_ttc),
      href: `/dashboard/demandes/${f.demande_id}`,
      relance: aRelancer ? `/dashboard/demandes/${f.demande_id}?message=relancePaiement&facture=${f.id}` : null,
      relanceeRecemment: factureRelancee(f),
    }));

  const devisEnAttente: LigneEnAttente[] = devisActifs
    .filter((x) => x.statut === "envoye" && x.envoye_le && !(x.demande_id && acceptes.has(x.demande_id)))
    .map((x) => ({ x, jours: joursDepuis(x.envoye_le as string) }))
    .filter(({ jours }) => jours >= JOURS_AFFICHAGE_DEVIS)
    .map(({ x, jours }) => ({
      id: x.id,
      genre: "devis" as const,
      demandeId: x.demande_id,
      artisanId: x.artisan_id ?? null,
      jours,
      nom: x.demandes?.nom_client || `Devis ${x.numero}`,
      quoi: "Devis sans réponse",
      montant: nombre(x.total_estime),
      href: x.demande_id ? `/dashboard/demandes/${x.demande_id}` : "/dashboard/devis",
      relance:
        x.demande_id && jours >= JOURS_RELANCE_DEVIS
          ? `/dashboard/demandes/${x.demande_id}?message=relanceDevis&devis=${x.id}`
          : null,
      relanceeRecemment: devisRelance(x),
    }));

  // Un devis à relire ou à envoyer s'ouvre sur le devis lui-même.
  const devisAEnvoyer: LigneDevisAEnvoyer[] = devisActifs
    .filter((x) => x.statut === "brouillon" || x.statut === "a_valider")
    .map((x) => ({
      id: x.id,
      demandeId: x.demande_id,
      artisanId: x.artisan_id ?? null,
      jours: x.created_at ? Math.max(0, joursDepuis(x.created_at)) : 0,
      nom: x.demandes?.nom_client || `Devis ${x.numero}`,
      quoi: x.statut === "brouillon" ? ("Devis à relire" as const) : ("Devis à envoyer" as const),
      montant: nombre(x.total_estime),
      href: `/dashboard/devis/${x.id}`,
    }))
    // À relire d'abord (c'est ce qui bloque l'envoi), puis le plus ancien.
    .sort((a, b) => (a.quoi === b.quoi ? b.jours - a.jours : a.quoi === "Devis à relire" ? -1 : 1));

  const aFacturer = d.avecAFacturer ? calculerAFacturer(d.projets ?? [], d.devis, d.factures, maintenant) : [];

  return {
    enAttente: [...factures, ...devisEnAttente].sort((a, b) => b.jours - a.jours),
    devisAEnvoyer,
    aEncaisser: resumerAEncaisser(d.factures, maintenant),
    aFacturer,
    totalAFacturer: arrondi(aFacturer.reduce((s, l) => s + l.solde, 0)),
  };
}

/** « 1 250 € » : sans centimes quand il n'y en a pas, comme on le dit. */
export function euros(montant: number): string {
  return montant.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(montant) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
