import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lignesDeVente } from "@/lib/moteur-metier/prixDeVente";
import type { DevisPublic, LigneDevisCalculee, MentionsLegales } from "@/types";

// ============================================================
// Signature électronique en ligne (08/09) — voir Module 31,
// supabase/schema.sql. Route PUBLIQUE, volontairement sans aucune
// vérification d'authentification : c'est le lien envoyé au client pour
// consulter son devis. Toute la sécurité (quelles colonnes exposer, quel
// état de devis reste consultable) vit dans la fonction Postgres
// obtenir_devis_public(), pas ici — jamais de client_admin (service_role),
// jamais de policy RLS publique sur la table devis elle-même.
//
// 17/09 — la réponse est désormais recopiée champ par champ (liste
// blanche) plutôt que transmise telle quelle : un champ ajouté un jour à
// la fonction ne part plus chez le client sans qu'on l'ait décidé ici.
// ============================================================

type LignePublique = DevisPublic["lignes"][number];

// Forme renvoyée par obtenir_devis_public AVANT le Module 42 (prix de
// revient, marge, coordonnées à plat). Tant que la migration n'est pas
// passée, on reconstruit ici la version client — sans jamais renvoyer ces
// champs tels quels. À retirer une fois le Module 42 appliqué partout.
type LigneAncienne = Partial<LigneDevisCalculee>;
type ReponseRpc = Record<string, unknown> & {
  lignes?: unknown;
  mentions_legales?: MentionsLegales | null;
};

const texte = (v: unknown): string | null => (typeof v === "string" ? v : null);
const nombre = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

function lignePublique(ligne: unknown): LignePublique {
  const l = (ligne ?? {}) as Record<string, unknown>;
  return {
    description: texte(l.description) ?? "",
    categorie: (texte(l.categorie) ?? "forfait") as LignePublique["categorie"],
    quantite: nombre(l.quantite) ?? 0,
    unite: texte(l.unite) ?? "",
    prix_unitaire: nombre(l.prix_unitaire) ?? 0,
    total: nombre(l.total) ?? 0,
  };
}

function versDevisPublic(d: ReponseRpc): DevisPublic {
  const avantModule42 = d.total_ht === undefined;
  const total = nombre(d.total_estime) ?? 0;
  const tva = nombre(d.montant_tva) ?? 0;

  const lignes = avantModule42
    ? lignesDeVente({
        lignes: ((d.lignes as LigneAncienne[] | null) ?? []).map((l) => ({
          description: l.description ?? "",
          categorie: l.categorie ?? "forfait",
          quantite: Number(l.quantite ?? 0),
          unite: l.unite ?? "",
          prix_unitaire: Number(l.prix_unitaire ?? 0),
          total: Number(l.total ?? 0),
          detail_calcul: "",
        })),
        deplacement: nombre(d.deplacement) ?? 0,
        marge_pct: nombre(d.marge_pct) ?? 0,
        total_estime: total,
        montant_tva: tva,
      })
    : ((d.lignes as unknown[] | null) ?? []).map(lignePublique);

  const mentions: MentionsLegales | null = avantModule42
    ? {
        nom_entreprise: texte(d.nom_entreprise),
        adresse: texte(d.adresse),
        telephone: texte(d.telephone),
        email: texte(d.email),
        siret: texte(d.siret),
        forme_juridique: texte(d.forme_juridique),
        numero_tva_intracommunautaire: null,
        mention_tva_non_applicable: false,
        assurance_decennale_compagnie: null,
        assurance_decennale_police: null,
        iban: null,
        bic: null,
        mention_tva_reduite: texte(d.mention_tva_reduite),
      }
    : (d.mentions_legales ?? null);

  const logo = texte(d.logo_url);

  return {
    numero: texte(d.numero) ?? "",
    lignes,
    lots: Array.isArray(d.lots) ? (d.lots as DevisPublic["lots"]) : [],
    total_ht: (Math.round(total * 100) - Math.round(tva * 100)) / 100,
    tva_pct: nombre(d.tva_pct) ?? 0,
    montant_tva: tva,
    total_estime: total,
    commentaires: texte(d.commentaires),
    mention_tva_reduite: texte(d.mention_tva_reduite),
    objet: texte(d.objet),
    adresse_chantier: texte(d.adresse_chantier),
    validite_jours: nombre(d.validite_jours),
    date_debut_prevue: texte(d.date_debut_prevue),
    duree_estimee: texte(d.duree_estimee),
    acompte_pct: nombre(d.acompte_pct),
    created_at: texte(d.created_at) ?? new Date().toISOString(),
    envoye_le: texte(d.envoye_le),
    devis_statut: (texte(d.devis_statut) ?? "envoye") as DevisPublic["devis_statut"],
    signe_le: texte(d.signe_le),
    demande_statut: texte(d.demande_statut) ?? "",
    accepte_le: texte(d.accepte_le),
    nom_client: texte(d.nom_client) ?? "",
    telephone_client: texte(d.telephone_client),
    adresse_client: texte(d.adresse_client),
    type_chantier: texte(d.type_chantier),
    // Le logo est stocké dans un bucket privé : la base ne renvoie qu'un
    // chemin de fichier, qu'un navigateur sans compte ne peut pas ouvrir.
    // Mieux vaut pas de logo qu'une image cassée en tête du devis.
    logo_url: logo && /^https?:\/\//.test(logo) ? logo : null,
    mentions_legales: mentions,
  };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc("obtenir_devis_public", { p_devis_id: params.id })
    .maybeSingle();

  if (error) {
    console.error("obtenir_devis_public a échoué :", error);
    return NextResponse.json({ error: "Impossible de charger ce devis." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Devis introuvable ou plus disponible." }, { status: 404 });
  }

  return NextResponse.json({ devis: versDevisPublic(data as ReponseRpc) });
}
