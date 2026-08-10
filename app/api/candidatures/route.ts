import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifierNouvelleCandidature } from "@/lib/email";
import type { Candidature } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    nom,
    prenom,
    entreprise,
    metier,
    telephone,
    email,
    nbEmployes,
    devisParSemaine,
    problemePrincipal,
    decouverte,
  } = body;

  if (!nom || !prenom || !metier || !telephone || !email || !problemePrincipal) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const supabase = createClient();

  // Pas de .select() après l'insert : la règle de sécurité interdit
  // volontairement à un visiteur anonyme de relire les candidatures (pour
  // protéger la liste des candidats). Demander une relecture ici ferait
  // échouer .single() même quand l'insertion elle-même a réussi.
  const { error } = await supabase.from("candidatures").insert({
    nom,
    prenom,
    entreprise: entreprise || null,
    metier,
    telephone,
    email,
    nb_employes: nbEmployes || null,
    devis_par_semaine: devisParSemaine || null,
    probleme_principal: problemePrincipal,
    decouverte: decouverte || null,
  });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la candidature" },
      { status: 500 }
    );
  }

  // IMPORTANT : on attend la fin de l'envoi avant de répondre. Sur un
  // environnement serverless (Vercel), le traitement peut être coupé net
  // dès que la réponse HTTP est envoyée — un appel "en tâche de fond" sans
  // await n'a alors aucune garantie de se terminer, ce qui rendait l'envoi
  // aléatoire (parfois reçu, parfois non, sans aucune erreur visible nulle
  // part, puisque le processus était tué avant même d'avoir pu échouer
  // proprement). notifierNouvelleCandidature() attrape déjà ses propres
  // erreurs en interne, donc l'attendre ici ne fait toujours pas échouer la
  // candidature si l'email a un problème — juste que l'envoi a maintenant
  // la garantie de réellement se terminer.
  await notifierNouvelleCandidature({
    nom,
    prenom,
    entreprise: entreprise || null,
    metier,
    telephone,
    email,
    nb_employes: nbEmployes || null,
    devis_par_semaine: devisParSemaine || null,
    probleme_principal: problemePrincipal,
    decouverte: decouverte || null,
  } as Candidature);

  return NextResponse.json({ ok: true });
}
