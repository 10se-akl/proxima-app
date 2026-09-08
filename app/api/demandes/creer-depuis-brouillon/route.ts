import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { trouverOuCreerClient } from "@/lib/clients";
import type { BrouillonProjet, TypeChantier } from "@/types";

// ============================================================
// "Premier contact sans friction" (26/08) — dernière étape des deux portes
// d'entrée (partage natif ET import de message) : transforme un brouillon
// VALIDÉ PAR L'ARTISAN (potentiellement corrigé à la main) en vrai projet.
// Aucun appel IA ici — c'est une simple écriture, volontairement rapide et
// fiable, jamais soumise au garde-fou de fréquence des routes IA.
// ============================================================

// Revue métier (06/09) — liste élargie à 20 valeurs, voir types/index.ts.
const TYPES_CHANTIER_VALIDES: TypeChantier[] = [
  "renovation_complete",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "toiture",
  "electricite",
  "plomberie",
  "chauffage",
  "maconnerie",
  "terrassement",
  "facade",
  "serrurerie",
  "vitrerie",
  "charpente",
  "menuiserie",
  "plaquisterie",
  "carrelage",
  "amenagement_exterieur",
  "climatisation",
  "piscine",
  "autre",
];

function typeChantierValide(valeur: unknown): TypeChantier {
  return (TYPES_CHANTIER_VALIDES as string[]).includes(String(valeur))
    ? (valeur as TypeChantier)
    : "autre";
}

export async function POST(request: NextRequest) {
  // Sprint Beta Final (27/08) — QA a trouvé qu'un corps JSON malformé
  // (requête rejouée par le service worker, proxy qui tronque, etc.)
  // faisait planter cette route avec une erreur 500 générique au lieu du
  // message français structuré déjà prévu partout ailleurs dans ce
  // fichier. try/catch ajouté par précaution, coût minime.
  let corps: { brouillon: BrouillonProjet; partageId?: string; images?: string[] };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { brouillon, partageId, images } = corps;

  if (!brouillon || typeof brouillon !== "object") {
    return NextResponse.json({ error: "Brouillon manquant" }, { status: 400 });
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

  // Même garde-fou que l'ancien import direct : un nom client vide ferait
  // échouer l'insert sur la contrainte NOT NULL avec un message générique.
  // Ici l'artisan a déjà eu l'occasion de le compléter dans l'écran de
  // brouillon — si le champ est resté vide, on met un texte explicite
  // plutôt que de bloquer la création (principe de friction minimale
  // demandé : le bouton de validation ne doit jamais être bloqué).
  const nomClient = brouillon.nomClient?.valeur?.trim() || "Client à identifier";
  const resume = brouillon.resume?.valeur?.trim() || "Projet créé depuis un partage — à compléter.";
  const telephoneClient = brouillon.telephoneClient?.valeur?.trim() || null;
  const adresseClient = brouillon.adresseClient?.valeur?.trim() || null;

  // Sprint Beta Final (27/08) — fondation du point 2 du brief (voir
  // lib/clients/index.ts) : chaque nouveau projet est rattaché à un client
  // stable dès sa création, dès qu'un téléphone exploitable est connu.
  // Aucun rapprochement par nom seul ici (faux positifs trop coûteux) —
  // sans téléphone, le projet reste simplement sans client_id.
  const clientId = await trouverOuCreerClient(supabase, {
    organisationId,
    nom: nomClient,
    telephoneBrut: telephoneClient,
    adresse: adresseClient,
  });

  const { data: projet, error: insertError } = await supabase
    .from("demandes")
    .insert({
      artisan_id: user.id,
      organisation_id: organisationId,
      nom_client: nomClient,
      telephone_client: telephoneClient,
      adresse_client: adresseClient,
      client_id: clientId,
      type_chantier: typeChantierValide(brouillon.typeChantier?.valeur),
      description: resume,
      priorite: brouillon.priorite?.valeur === "urgent" ? "urgent" : "normal",
      informations_disponibles: brouillon.texteOrigine
        ? `Message d'origine :\n${brouillon.texteOrigine}`
        : null,
      // Sprint Beta Final (27/08) — QA a trouvé qu'une photo partagée sans
      // texte était uploadée puis jamais rattachée à rien (image_path/
      // images écrit dans partages_entrants mais jamais relu). Les photos
      // déjà uploadées (voir app/api/partage/route.ts) sont maintenant
      // transmises par l'écran de revue et rattachées dès la création.
      photos: Array.isArray(images) ? images : [],
    })
    .select("id")
    .single();

  if (insertError || !projet) {
    return NextResponse.json({ error: "Le projet n'a pas pu être enregistré" }, { status: 500 });
  }

  await enregistrerEvenement(supabase, {
    demandeId: projet.id,
    artisanId: user.id,
    organisationId,
    type: "message_importe",
    titre: "Premier contact — projet créé depuis un partage",
    detail: resume,
  });

  let rdvPropose: { date: string; heure: string } | null = null;
  const rdvDate = brouillon.rdvDate?.valeur;
  if (rdvDate) {
    const heure = brouillon.rdvHeure?.valeur || "09:00";
    const dateHeure = new Date(`${rdvDate}T${heure}`);
    if (!isNaN(dateHeure.getTime())) {
      rdvPropose = { date: rdvDate, heure };
    }
  }

  // Nettoyage du partage temporaire (voir Module 24, supabase/schema.sql) —
  // RLS garantit déjà qu'on ne peut supprimer que ses propres lignes, mais
  // on ne bloque jamais la création du projet si cette suppression échoue
  // pour une raison quelconque : c'est un ménage, pas une étape critique.
  if (partageId) {
    await supabase.from("partages_entrants").delete().eq("id", partageId);
  }

  return NextResponse.json({ projetId: projet.id, nomClient, rdvPropose });
}
