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

  const { data, error } = await supabase
    .from("candidatures")
    .insert({
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
    })
    .select()
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la candidature" },
      { status: 500 }
    );
  }

  // Ne bloque jamais la réponse au visiteur si l'email échoue.
  notifierNouvelleCandidature(data as Candidature);

  return NextResponse.json({ ok: true });
}
