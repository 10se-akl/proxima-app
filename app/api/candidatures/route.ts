import { NextRequest, NextResponse } from "next/server";
import { notifierNouvelleCandidature } from "@/lib/email";
import { creerCompteCandidat, validerCandidat } from "@/lib/candidatures/creerCompteCandidat";

// ============================================================
// Demande d'accès (Module 43, 21/09) — la candidature crée le compte.
//
// Avant : la candidature n'était qu'une ligne en base ; le compte était
// créé à l'acceptation, puis l'artisan recevait un lien pour choisir son
// mot de passe. Maintenant, il choisit son mot de passe ici, et le compte
// naît « en attente » (voir lib/candidatures/creerCompteCandidat.ts).
//
// ⚠️ Ce corps de requête contient un mot de passe : il n'est JAMAIS
// journalisé, ni ici ni dans creerCompteCandidat. Ne pas ajouter de
// console.log(body) pour déboguer.
// ============================================================

export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => null);

  // Champ piège, invisible pour un humain (voir app/demander-acces) : un
  // robot qui remplit tous les champs le remplit aussi. On lui répond
  // comme à un vrai candidat, pour ne rien lui apprendre, sans rien créer.
  if (corps && typeof corps.siteWeb === "string" && corps.siteWeb.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const validation = validerCandidat(corps);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const resultat = await creerCompteCandidat(validation.donnees);
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

  return NextResponse.json({ ok: true });
}
