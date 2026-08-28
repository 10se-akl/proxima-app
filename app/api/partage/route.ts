import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";

// ============================================================
// Cible du Web Share Target (voir app/manifest.ts, champ "share_target").
// Android uniquement : c'est le navigateur qui pose lui-même Compyo dans
// le menu "Partager" du téléphone une fois la PWA installée, et qui fait
// un vrai POST HTML classique vers cette URL quand l'artisan choisit
// Compyo depuis WhatsApp/SMS/Mail/Photos — jamais un fetch JS pilotable
// par nous. On ne peut donc pas répondre directement avec le brouillon :
// on stocke le contenu reçu (voir Module 24, supabase/schema.sql) et on
// redirige vers une page normale qui, elle, lance l'IA (voir
// app/dashboard/demandes/partage/[id]/page.tsx).
//
// Pourquoi une redirection plutôt qu'un rendu direct ici : un Route
// Handler ne peut pas rendre un arbre React, et l'écran de revue du
// brouillon a besoin d'interactivité (édition des champs, validation) —
// une vraie page côté client est plus simple et plus robuste qu'essayer
// de fabriquer du HTML à la main dans cette route.
// ============================================================

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Un partage vers Compyo sans session active (artisan déconnecté) : on
  // renvoie vers la connexion plutôt que d'échouer silencieusement. Le
  // contenu partagé est alors perdu — cas rare (il faut être installé ET
  // déconnecté) et sans solution propre sans complexifier bien au-delà de
  // ce que ce cas mérite.
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const organisationId = await getOrganisationId(supabase, user.id);
  if (!organisationId) {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  let titre = "";
  let texte = "";
  let url = "";
  const images: string[] = [];

  // Sprint Beta Final (27/08) — corrections QA :
  // - `getAll("fichiers")` au lieu de `get(...)` : Android encode plusieurs
  //   entrées quand l'artisan partage plusieurs photos d'un coup depuis la
  //   galerie ; `get()` ne renvoyait que la première, les autres étaient
  //   perdues silencieusement. Chaque fichier est uploadé individuellement,
  //   un échec sur l'un n'empêche pas les autres (Promise.allSettled).
  // - Limite connue et non corrigeable depuis ce code : Vercel refuse tout
  //   corps de requête au-delà de sa limite de plan (par défaut 4,5 Mo sur
  //   Hobby) AVANT même que cette route ne s'exécute — une photo de
  //   téléphone dépassant cette taille ne déclenche jamais ce bloc, la
  //   requête échoue au niveau de la plateforme (413). Aucun try/catch ici
  //   ne peut intercepter ce cas ; seule une vraie compression côté client
  //   avant l'envoi le résoudrait, impossible ici car le partage natif est
  //   un POST HTML fait par l'OS, pas par notre JS (voir le commentaire en
  //   tête de fichier). Documenté dans le rapport de cycle, pas un oubli.
  try {
    const donnees = await request.formData();
    titre = String(donnees.get("titre") ?? "");
    texte = String(donnees.get("texte") ?? "");
    url = String(donnees.get("url") ?? "");

    const fichiers = donnees.getAll("fichiers").filter(
      (f): f is File => f instanceof File && f.size > 0
    );

    const resultats = await Promise.allSettled(
      fichiers.map(async (fichier, index) => {
        const extension = fichier.type === "image/png" ? "png" : "jpg";
        const chemin = `${user.id}/partage-${Date.now()}-${index}.${extension}`;
        const octets = new Uint8Array(await fichier.arrayBuffer());
        const { error: erreurUpload } = await supabase.storage
          .from("photos")
          .upload(chemin, octets, { contentType: fichier.type });
        if (erreurUpload) throw erreurUpload;
        return chemin;
      })
    );
    for (const resultat of resultats) {
      if (resultat.status === "fulfilled") images.push(resultat.value);
    }
  } catch (err) {
    // form-data illisible (partage sans contenu, format inattendu, ou
    // corps rejeté par la plateforme avant même d'atteindre ce code) : on
    // continue quand même vers la page de revue avec un texte vide plutôt
    // que d'échouer — l'artisan pourra compléter à la main. On trace
    // l'échec côté serveur (jamais visible par l'artisan) pour garder une
    // trace en cas de plainte répétée sur des partages "perdus".
    console.error("Échec de lecture du partage entrant :", err);
  }

  // Le texte partagé arrive dans des champs différents selon l'app source
  // (WhatsApp met le contenu dans "texte", certaines apps mettent tout
  // dans "titre" ou "url") — on les combine plutôt que de choisir un seul
  // champ et risquer de perdre une partie du message.
  const texteCombine = [titre, texte, url].filter(Boolean).join("\n").trim();

  const { data: partage, error: insertError } = await supabase
    .from("partages_entrants")
    .insert({
      organisation_id: organisationId,
      artisan_id: user.id,
      texte: texteCombine || null,
      images,
    })
    .select("id")
    .single();

  if (insertError || !partage) {
    return NextResponse.redirect(new URL("/dashboard/demandes/nouvelle", request.url), 303);
  }

  return NextResponse.redirect(
    new URL(`/dashboard/demandes/partage/${partage.id}`, request.url),
    303
  );
}
