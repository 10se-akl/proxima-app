import { NextRequest, NextResponse } from "next/server";
import { notifierNouvelleCandidature } from "@/lib/email";
import { creerCompteCandidat, validerCandidat } from "@/lib/candidatures/creerCompteCandidat";
import { resteDesPlaces } from "@/lib/candidatures/places";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationEnCours } from "@/lib/equipe/serveur";

// ============================================================
// Demande d'accès (Module 43, 21/09) — la candidature crée le compte.
//
// Avant : la candidature n'était qu'une ligne en base ; le compte était
// créé à l'acceptation, puis l'artisan recevait un lien pour choisir son
// mot de passe. Maintenant, il choisit son mot de passe ici, et le compte
// naît « en attente » (voir lib/candidatures/creerCompteCandidat.ts).
//
// 12/11 — accès immédiat (décision d'Axel) : tant que la bêta a des places
// (20, lib/candidatures/places.ts), le compte s'ouvre aussitôt et
// l'artisan arrive dans son espace. Ensuite : liste d'attente.
//
// ⚠️ Ce corps de requête contient un mot de passe : il n'est JAMAIS
// journalisé, ni ici ni dans creerCompteCandidat. Ne pas ajouter de
// console.log(body) pour déboguer.
// ============================================================

// Garde-fou contre une vague d'inscriptions automatiques (le champ piège
// arrête les robots naïfs, pas un script écrit pour ce formulaire). Bien
// au-dessus de ce qu'une bêta reçoit en vrai.
const INSCRIPTIONS_MAX_PAR_HEURE = 20;
const INSCRIPTIONS_MAX_PAR_JOUR = 80;

async function afflux(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const ilYAUneHeure = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ilYAUnJour = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: heure, error: e1 }, { count: jour, error: e2 }] = await Promise.all([
    admin.from("candidatures").select("id", { count: "exact", head: true }).gte("created_at", ilYAUneHeure),
    admin.from("candidatures").select("id", { count: "exact", head: true }).gte("created_at", ilYAUnJour),
  ]);
  // Lecture impossible : on ne bloque pas un vrai artisan pour une panne.
  if (e1 || e2) return false;
  return (heure ?? 0) >= INSCRIPTIONS_MAX_PAR_HEURE || (jour ?? 0) >= INSCRIPTIONS_MAX_PAR_JOUR;
}

export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => null);

  // Champ piège, invisible pour un humain (voir app/demander-acces) : un
  // robot qui remplit tous les champs le remplit aussi. On lui répond
  // comme à un vrai candidat, pour ne rien lui apprendre, sans rien créer.
  if (corps && typeof corps.siteWeb === "string" && corps.siteWeb.trim() !== "") {
    return NextResponse.json({ ok: true, ouvert: false });
  }

  const validation = validerCandidat(corps);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const admin = createAdminClient();
  if (await afflux(admin)) {
    return NextResponse.json(
      { error: "Beaucoup d'inscriptions en ce moment. Réessayez dans une heure, ou écrivez-nous depuis la page Contact." },
      { status: 429 }
    );
  }

  // Une invitation d'équipe attend cette adresse : pas d'organisation à
  // soi, la personne rejoint l'équipe depuis /rejoindre. En cas de panne
  // de lecture, on fait comme s'il n'y en avait pas.
  let invitee = false;
  try {
    invitee = Boolean(await invitationEnCours(admin, validation.donnees.email));
  } catch (err) {
    console.error("Inscription : lecture des invitations impossible —", err);
  }

  const ouvrir = !invitee && (await resteDesPlaces(admin));
  const resultat = await creerCompteCandidat(validation.donnees, { ouvrir });
  if (!resultat.ok) {
    return NextResponse.json(
      { error: resultat.message, raison: resultat.raison },
      { status: resultat.raison === "email_existant" ? 409 : 500 }
    );
  }

  // Attendu avant de répondre : sur Vercel, un envoi non attendu peut être
  // coupé net dès que la réponse part. notifierNouvelleCandidature attrape
  // déjà ses propres erreurs : un email raté ne fait jamais échouer la
  // candidature, qui reste visible dans /admin/candidatures.
  await notifierNouvelleCandidature(resultat.candidature);

  // Où va l'artisan une fois connecté : son espace si le compte est
  // ouvert ; sinon /rejoindre (invité d'une équipe) ou la liste d'attente.
  const suite = resultat.ouvert ? "/dashboard" : invitee ? "/rejoindre" : "/candidature-en-cours";
  return NextResponse.json({ ok: true, ouvert: resultat.ouvert, suite });
}
