import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import type { TypeChantier } from "@/types";

// La colonne "type_chantier" est un simple texte en base, sans contrainte
// enum côté SQL — rien n'empêche une valeur inattendue de s'y glisser (une
// réponse IA imprévue, ou une requête modifiée à la main) et de casser
// ensuite l'affichage des libellés ailleurs dans l'app. On revalide donc
// ici, côté serveur, avant d'écrire.
const TYPES_CHANTIER_VALIDES: TypeChantier[] = [
  "renovation_complete",
  "salle_de_bain",
  "cuisine",
  "peinture",
  "toiture",
  "electricite",
  "plomberie",
  "chauffage",
  "autre",
];

function typeChantierValide(valeur: string): TypeChantier {
  return (TYPES_CHANTIER_VALIDES as string[]).includes(valeur)
    ? (valeur as TypeChantier)
    : "autre";
}

// Reçoit la liste revue par l'artisan (une ligne par capture d'écran) et
// écrit réellement en base — c'est la seule route qui le fait pour ce
// parcours. Deux cas par ligne :
// - destination = null  → nouveau projet, comme /api/ai/importer-message
// - destination = <id>  → la capture concerne un chantier déjà suivi :
//   on ajoute le résumé dans les notes et dans la chronologie du projet,
//   on ne recrée jamais de doublon.
// Un rendez-vous éventuellement détecté n'est JAMAIS ajouté seul ici —
// contrairement à l'import d'un seul message, une capture par lot ne
// vérifie pas les conflits d'horaire ligne par ligne ; l'artisan
// planifie lui-même depuis la fiche du projet ensuite.
type LigneImport = {
  destination: string | null;
  nomClient: string;
  telephoneClient: string | null;
  typeChantier: string;
  descriptionResumee: string;
  // Sprint Beta Final (27/08) — 🔴H : jusqu'ici cette route écrivait le
  // texte fixe "Message d'origine : capture d'écran importée" à la place
  // du VRAI texte du message (perdu, jamais transmis par cette route) —
  // seule route d'import à ne pas conserver le texte brut, contrairement
  // au partage natif et au collage de message. Voir app/api/ai/
  // analyser-captures/route.ts pour l'extraction de ce champ.
  texteBrut: string;
  rdvDate: string | null;
  rdvHeure: string | null;
};

export async function POST(request: NextRequest) {
  const { lignes } = (await request.json()) as { lignes?: LigneImport[] };

  if (!lignes || lignes.length === 0) {
    return NextResponse.json({ error: "Rien à importer" }, { status: 400 });
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

  const resultats: { ok: boolean; projetId?: string; erreur?: string }[] = [];

  // Écritures indépendantes les unes des autres — une capture illisible
  // ou une ligne en échec ne doit pas empêcher les autres d'être
  // importées. On les fait en séquence (pas Promise.all) uniquement pour
  // garder des numéros de devis/logs lisibles à la relecture ; le volume
  // par artisan (quelques captures le matin) rend le coût négligeable.
  for (const ligne of lignes) {
    if (ligne.destination) {
      const { data: projetExistant, error: fetchError } = await supabase
        .from("demandes")
        .select("notes")
        .eq("id", ligne.destination)
        .eq("organisation_id", organisationId)
        .single();

      if (fetchError || !projetExistant) {
        resultats.push({ ok: false, erreur: "Projet introuvable pour une des captures." });
        continue;
      }

      // Texte brut si l'IA a pu le retranscrire, résumé en repli sinon
      // (image partiellement lisible) — jamais rien de vide.
      const noteAjoutee = `--- Message importé (capture d'écran) ---\n${
        ligne.texteBrut?.trim() || ligne.descriptionResumee
      }`;
      const notesMisesAJour = projetExistant.notes
        ? `${projetExistant.notes}\n\n${noteAjoutee}`
        : noteAjoutee;

      const { data: updateData, error: updateError } = await supabase
        .from("demandes")
        .update({ notes: notesMisesAJour, derniere_modification_le: new Date().toISOString() })
        .eq("id", ligne.destination)
        .select("id");

      if (updateError || !updateData || updateData.length === 0) {
        resultats.push({ ok: false, erreur: "Échec de l'ajout à un projet existant." });
        continue;
      }

      await enregistrerEvenement(supabase, {
        demandeId: ligne.destination,
        artisanId: user.id,
        organisationId,
        type: "message_importe",
        titre: "Message importé (capture d'écran)",
        detail: ligne.descriptionResumee,
      });

      resultats.push({ ok: true, projetId: ligne.destination });
      continue;
    }

    const { data: nouveauProjet, error: insertError } = await supabase
      .from("demandes")
      .insert({
        artisan_id: user.id,
        organisation_id: organisationId,
        nom_client: ligne.nomClient,
        telephone_client: ligne.telephoneClient,
        type_chantier: typeChantierValide(ligne.typeChantier),
        description: ligne.descriptionResumee,
        informations_disponibles: `Message d'origine (capture d'écran) :\n${
          ligne.texteBrut?.trim() || "texte non retranscrit"
        }`,
      })
      .select("id")
      .single();

    if (insertError || !nouveauProjet) {
      resultats.push({ ok: false, erreur: "Échec de la création d'un nouveau projet." });
      continue;
    }

    await enregistrerEvenement(supabase, {
      demandeId: nouveauProjet.id,
      artisanId: user.id,
      organisationId,
      type: "message_importe",
      titre: "Premier contact — capture d'écran importée",
      detail: ligne.descriptionResumee,
    });

    resultats.push({ ok: true, projetId: nouveauProjet.id });
  }

  return NextResponse.json({ resultats });
}
