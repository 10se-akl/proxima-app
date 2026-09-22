import { anneeParis } from "@/lib/moisParis";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import {
  genererLignesFactureComplete,
  genererLignesFactureAcompte,
  calculerTotauxFacture,
  figerMentionsLegales,
  formaterNumeroFacture,
} from "@/lib/moteur-metier/genererFacture";
import { PARAMETRES_PAR_DEFAUT } from "@/lib/moteur-metier/calculerDevis";
import type { Facture, ParametresEntreprise, TypeFacture } from "@/types";

// ============================================================
// Module 28 (06/09) — création d'une facture (ou d'une facture d'acompte)
// à partir d'un devis déjà accepté par le client. Aucun appel IA :
// génération 100% déterministe à partir de montants déjà validés (voir
// lib/moteur-metier/genererFacture.ts), donc pas de garde-fou de fréquence
// IA ici (verifierLimiteIA), comme /api/devis/dupliquer.
//
// Deux modes, choisis par le champ "type" du corps de la requête :
// - "acompte" : une facture pour une partie du devis, montant TTC saisi
//   par l'artisan (ex : "30% à la commande").
// - "facture" : la facture de solde, lignes du devis moins les acomptes
//   déjà facturés sur ce même devis (calculé ici, jamais saisi à la main).
// ============================================================

export async function POST(request: NextRequest) {
  let corps: { devisId?: string; type?: TypeFacture; montantAcompteTTC?: number; dateEcheance?: string };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { devisId, type, dateEcheance } = corps;

  if (!devisId || (type !== "facture" && type !== "acompte")) {
    return NextResponse.json({ error: "devisId et type ('facture' ou 'acompte') requis" }, { status: 400 });
  }
  // 21/09 — Un montant envoyé en texte ("300") passait le contrôle puis
  // faisait planter la génération ; un montant à trois décimales
  // produisait une facture au demi-centime. Nombre fini, arrondi au centime.
  const montantBrut = Number(corps.montantAcompteTTC);
  const montantAcompteTTC =
    type === "acompte" && Number.isFinite(montantBrut) ? Math.round(montantBrut * 100) / 100 : undefined;
  if (type === "acompte" && (!montantAcompteTTC || montantAcompteTTC <= 0)) {
    return NextResponse.json({ error: "montantAcompteTTC (> 0) requis pour une facture d'acompte" }, { status: 400 });
  }
  // Une échéance mal formée finissait en erreur générique de la base.
  if (dateEcheance && !/^\d{4}-\d{2}-\d{2}$/.test(dateEcheance)) {
    return NextResponse.json({ error: "Date d'échéance invalide." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.json({ error: "Aucune organisation associée à ce compte" }, { status: 400 });
  }

  // Filtre organisation_id explicite en plus de la RLS : défense en
  // profondeur, même discipline que le reste des routes serveur.
  const { data: devis, error: erreurDevis } = await supabase
    .from("devis")
    .select("*")
    .eq("id", devisId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (erreurDevis || !devis) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  // Facturer un devis suppose que le client l'a accepté — jamais un
  // brouillon ni un devis encore "à valider"/"envoyé sans réponse". On
  // vérifie le statut du PROJET (demande.statut = 'accepte'/'en_cours'/
  // 'termine'), pas seulement celui du devis : c'est cette valeur qui
  // reflète l'acceptation réelle par le client (voir marquerAccepte, app/
  // dashboard/demandes/[id]/page.tsx), le devis lui-même reste "envoye".
  const { data: projet, error: erreurProjet } = await supabase
    .from("demandes")
    .select("id, statut, nom_client, client_id")
    .eq("id", devis.demande_id)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (erreurProjet || !projet) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  if (!["accepte", "en_cours", "termine"].includes(projet.statut)) {
    return NextResponse.json(
      { error: "Ce devis n'a pas encore été accepté par le client — impossible de le facturer." },
      { status: 400 }
    );
  }
  if (devis.statut === "refuse") {
    return NextResponse.json({ error: "Ce devis a été refusé — impossible de le facturer." }, { status: 400 });
  }

  const { data: parametresBrutes } = await supabase
    .from("parametres_entreprise")
    .select("*")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!parametresBrutes) {
    return NextResponse.json(
      {
        error:
          "Complétez d'abord vos informations d'entreprise (Paramètres → Informations légales) avant de créer une facture.",
      },
      { status: 400 }
    );
  }
  const parametres = parametresBrutes as ParametresEntreprise;

  // Le SIRET est le minimum légal absolu pour qu'un document s'appelle
  // "facture" — sans lui, mieux vaut bloquer clairement que produire un
  // document non conforme sans que l'artisan ne le sache.
  if (!parametres.siret?.trim()) {
    return NextResponse.json(
      { error: "Renseignez votre SIRET dans Paramètres → Informations légales avant de créer une facture." },
      { status: 400 }
    );
  }

  // 21/09 — Franchise en base de TVA : aucune TVA sur la facture, jamais.
  // Avant, un devis resté à 20 % (taux par défaut) produisait une facture
  // enregistrée à 1 200 € TTC, que l'écran affichait pourtant à 1 000 €
  // « TVA non applicable » : le document légal et la base se
  // contredisaient, et le bilan comptait 200 € jamais encaissés.
  const enFranchise = Boolean(parametres.mention_tva_non_applicable);
  const tvaImposee = enFranchise ? 0 : undefined;
  // Plafond des acomptes : le total que le client paiera réellement — le HT
  // du devis quand il n'y a pas de TVA à facturer.
  const plafondAcomptes = enFranchise
    ? Math.round((devis.total_estime - (devis.montant_tva ?? 0)) * 100) / 100
    : devis.total_estime;

  let lignesEtTva: { lignes: ReturnType<typeof genererLignesFactureAcompte>["lignes"]; tva_pct: number };

  if (type === "acompte") {
    // Audit (11/09) — 🟡 défense en profondeur du même garde-fou que
    // FacturesProjet.tsx (contrôle client) : aucune limite haute n'existait
    // côté serveur non plus.
    const { data: acomptesExistants } = await supabase
      .from("factures")
      .select("total_ttc")
      .eq("devis_id", devisId)
      .eq("type", "acompte")
      .neq("statut", "annulee");
    const montantAcomptesExistants = (acomptesExistants ?? []).reduce((s, f) => s + f.total_ttc, 0);
    if (montantAcomptesExistants + montantAcompteTTC! > plafondAcomptes + 0.01) {
      return NextResponse.json(
        { error: "Ce montant d'acompte dépasse le total du devis." },
        { status: 400 }
      );
    }
    lignesEtTva = genererLignesFactureAcompte(devis, montantAcompteTTC!, tvaImposee);
  } else {
    // Garde-fou anti double-facturation : une seule facture de solde
    // (non annulée) par devis. Sans ce contrôle, un second clic sur
    // "Facture (solde)" recopierait une seconde fois toutes les lignes du
    // devis — le client se retrouverait facturé deux fois pour le même
    // chantier. Pour corriger une facture de solde déjà émise, la bonne
    // voie reste l'avoir (voir /api/factures/[id]/avoir), jamais une
    // seconde facture de solde qui s'ajouterait à la première.
    const { data: soldeExistant } = await supabase
      .from("factures")
      .select("id, numero")
      .eq("devis_id", devisId)
      .eq("type", "facture")
      .neq("statut", "annulee")
      .maybeSingle();
    if (soldeExistant) {
      return NextResponse.json(
        {
          error: `Une facture de solde (n° ${soldeExistant.numero}) existe déjà pour ce devis. Annulez-la (avoir) avant d'en créer une nouvelle.`,
        },
        { status: 409 }
      );
    }

    // Facture de solde : on déduit les acomptes déjà facturés sur CE devis
    // (jamais saisi à la main — recalculé à chaque fois depuis les factures
    // existantes, pour ne jamais pouvoir oublier ou dupliquer une déduction).
    const { data: acomptesLies } = await supabase
      .from("factures")
      .select("*")
      .eq("devis_id", devisId)
      .eq("type", "acompte")
      .neq("statut", "annulee");
    lignesEtTva = genererLignesFactureComplete(devis, (acomptesLies ?? []) as Facture[], tvaImposee);
  }

  const totaux = calculerTotauxFacture(lignesEtTva.lignes, lignesEtTva.tva_pct);

  // Un total à 0€ ou négatif (ex : solde entièrement déjà couvert par les
  // acomptes) n'a rien à faire dans une facture émise — même garde-fou que
  // ValiderDevis pour le devis initial.
  if (!Number.isFinite(totaux.total_ttc) || totaux.total_ttc <= 0) {
    return NextResponse.json(
      { error: "Le montant de cette facture serait nul ou négatif — vérifiez les acomptes déjà facturés." },
      { status: 400 }
    );
  }

  const annee = anneeParis() /* année à Paris, pas en UTC (21/09) */;

  // Numéro atomique, sans trou — voir prochain_numero_facture() dans
  // supabase/schema.sql. Contrairement au devis, aucune boucle de retry
  // ici : la fonction est déjà atomique (insert ... on conflict ...
  // returning verrouille la ligne), un seul appel suffit toujours.
  const { data: numeroSequentiel, error: erreurNumero } = await supabase.rpc("prochain_numero_facture", {
    p_organisation_id: organisationId,
    p_annee: annee,
  });

  if (erreurNumero || typeof numeroSequentiel !== "number") {
    console.error(erreurNumero);
    return NextResponse.json({ error: "Impossible d'attribuer un numéro de facture" }, { status: 500 });
  }

  const numero = formaterNumeroFacture(annee, numeroSequentiel);

  const { data: facture, error: erreurInsertion } = await supabase
    .from("factures")
    .insert({
      organisation_id: organisationId,
      demande_id: devis.demande_id,
      devis_id: devis.id,
      client_id: projet.client_id,
      artisan_id: user.id,
      type,
      numero,
      statut: "emise",
      lignes: lignesEtTva.lignes,
      sous_total_ht: totaux.sous_total_ht,
      tva_pct: lignesEtTva.tva_pct,
      montant_tva: totaux.montant_tva,
      total_ttc: totaux.total_ttc,
      mentions_legales: figerMentionsLegales(
        { ...PARAMETRES_PAR_DEFAUT, ...parametres },
        devis.mention_tva_reduite ?? null
      ),
      date_echeance: dateEcheance || null,
    })
    .select()
    .single();

  if (erreurInsertion || !facture) {
    console.error(erreurInsertion);
    // Audit (11/09) — 🔴 la vérification "soldeExistant" un peu plus haut
    // est une lecture-puis-écriture, pas atomique : deux membres de la même
    // organisation qui cliquent chacun "+ Facture (solde)" sur le même
    // devis à quelques centaines de ms d'écart passaient tous les deux ce
    // contrôle avant qu'aucun des deux INSERT n'ait committé, créant deux
    // factures de solde pour le même devis (le client facturé deux fois).
    // La contrainte réelle est désormais posée en base (index unique
    // partiel, voir supabase/schema.sql Module 39) — ce garde-fou capte sa
    // violation (23505) pour renvoyer le même message clair que le
    // pré-contrôle, plutôt qu'une erreur générique.
    if (erreurInsertion?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Une facture de solde existe déjà pour ce devis (créée entre-temps, peut-être par un autre membre de l'équipe). Rechargez la page.",
        },
        { status: 409 }
      );
    }
    // Le numéro a déjà été consommé par prochain_numero_facture() à ce
    // stade — c'est un trou dans la séquence si l'insertion échoue
    // ensuite. Assumé : la seule alternative (numéroter APRÈS l'insertion)
    // rouvrirait la fenêtre de course entre deux factures concurrentes que
    // ce module cherche justement à fermer. Un échec d'insertion juste
    // après une numérotation réussie doit rester rarissime (erreur réseau
    // pile à ce moment précis) — tracé en erreur serveur pour être visible.
    return NextResponse.json({ error: "Facture non enregistrée. Réessayez." }, { status: 500 });
  }

  await enregistrerEvenement(supabase, {
    demandeId: devis.demande_id,
    artisanId: user.id,
    organisationId,
    type: "facture_creee",
    titre: type === "acompte" ? `Facture d'acompte n° ${numero} créée` : `Facture n° ${numero} créée`,
    detail: `${totaux.total_ttc.toFixed(2)} € TTC`,
  });

  return NextResponse.json({ facture });
}
