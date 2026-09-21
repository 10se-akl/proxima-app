import type { Candidature } from "@/types";
import type { BilanMensuel } from "@/lib/bilan-mensuel";

// Notification optionnelle : si RESEND_API_KEY n'est pas configurée,
// la candidature est quand même enregistrée, seul l'email est sauté.
// L'admin peut toujours consulter /admin/candidatures manuellement.
//
// NOTIFICATION_EMAIL est volontairement séparée d'ADMIN_EMAIL : ADMIN_EMAIL
// détermine qui a le droit d'accéder à /admin/candidatures (doit correspondre
// à un compte Compyo existant), alors que le domaine de test Resend
// (onboarding@resend.dev) n'a le droit d'envoyer qu'à l'adresse du compte
// Resend lui-même. Ces deux contraintes peuvent tomber sur des adresses
// différentes — les confondre a déjà cassé soit l'accès admin, soit l'envoi
// d'email selon laquelle des deux on utilisait. Si NOTIFICATION_EMAIL n'est
// pas définie, on retombe sur ADMIN_EMAIL pour ne rien casser par défaut.
async function envoyerViaResend(candidature: Candidature, destinataire: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Compyo <onboarding@resend.dev>",
      to: destinataire,
      subject: `Nouvelle candidature bêta — ${candidature.prenom} ${candidature.nom}`,
      text: `${candidature.prenom} ${candidature.nom} (${candidature.metier}) souhaite rejoindre la bêta privée de Compyo.

Entreprise : ${candidature.entreprise ?? "non précisé"}
Email : ${candidature.email}
Téléphone : ${candidature.telephone}
Employés : ${candidature.nb_employes ?? "non précisé"}
Devis/semaine : ${candidature.devis_par_semaine ?? "non précisé"}
Problème principal : ${candidature.probleme_principal}
Découverte : ${candidature.decouverte ?? "non précisé"}

Pour accepter ou refuser : ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/candidatures`,
    }),
  });

  // fetch() ne lève une exception que si la requête n'a pas pu partir du
  // tout (réseau coupé, etc.) — un refus de Resend (clé invalide, domaine
  // d'envoi non vérifié, adresse "to" rejetée...) revient avec un statut
  // HTTP en erreur mais SANS lever d'exception. Sans cette vérification,
  // ce genre d'échec est invisible dans les logs, ce qui rend le problème
  // impossible à diagnostiquer depuis l'extérieur.
  if (!res.ok) {
    const corpsErreur = await res.text().catch(() => "(corps illisible)");
    throw new Error(`Resend a répondu ${res.status} : ${corpsErreur}`);
  }
}

// Bilan mensuel (08/09) — contrairement à notifierNouvelleCandidature (qui
// envoie toujours à l'adresse du COMPTE Resend lui-même), cet email doit
// atteindre l'adresse de CHAQUE artisan — impossible avec le domaine de
// test "onboarding@resend.dev" (voir commentaire au-dessus de
// notifierNouvelleCandidature). RESEND_FROM_EMAIL n'existe que pour ça :
// tant qu'aucun domaine n'est vérifié sur Resend (ce qui suppose de
// posséder le domaine — voir compyo.fr, prévu séparément), cette variable
// reste vide et l'envoi est sauté silencieusement — le bilan reste
// consultable dans l'app, voir app/dashboard/bilan/page.tsx.
function texteBilanMensuel(bilan: BilanMensuel, prenom: string, urlBilan: string): string {
  const periode = new Date(bilan.debut).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const lignesDetail = bilan.detailHeures
    .map((d) => `  - ${d.libelle} : ${d.occurrences} × ${Math.round(d.minutes / d.occurrences)} min`)
    .join("\n");

  return `Bonjour ${prenom},

Voici votre relevé Compyo pour ${periode} :

Montant encaissé via les factures Compyo : ${bilan.montantEncaisse.toFixed(2)} €
Devis envoyés : ${bilan.devisEnvoyes}
Devis acceptés : ${bilan.devisAcceptes}
Temps estimé gagné : ${bilan.heuresGagnees} h
${lignesDetail ? `\nDétail du calcul :\n${lignesDetail}` : ""}

Voir le détail : ${urlBilan}`;
}

export async function envoyerBilanMensuel(params: {
  destinataire: string;
  prenom: string;
  bilan: BilanMensuel;
  urlBilan: string;
}) {
  const expediteur = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !expediteur) return;

  const periode = new Date(params.bilan.debut).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: expediteur,
      to: params.destinataire,
      subject: `Votre bilan Compyo — ${periode}`,
      text: texteBilanMensuel(params.bilan, params.prenom, params.urlBilan),
    }),
  });

  if (!res.ok) {
    const corpsErreur = await res.text().catch(() => "(corps illisible)");
    throw new Error(`Resend a répondu ${res.status} : ${corpsErreur}`);
  }
}

export async function notifierNouvelleCandidature(candidature: Candidature) {
  const destinataire = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;
  if (!process.env.RESEND_API_KEY || !destinataire) return;

  // Une coupure réseau ponctuelle entre Vercel et Resend (ECONNRESET
  // pendant la poignée de main TLS, déjà observée en pratique) ne doit pas
  // faire perdre une notification pour de bon — une deuxième tentative
  // absorbe ce genre d'aléa sans complexité excessive (pas de file d'attente,
  // juste un essai supplémentaire immédiat).
  for (let tentative = 1; tentative <= 2; tentative++) {
    try {
      await envoyerViaResend(candidature, destinataire);
      return;
    } catch (err) {
      const dernierEssai = tentative === 2;
      console.error(
        `Échec de l'email de notification admin (tentative ${tentative}/2)${
          dernierEssai ? ", abandon" : ", nouvel essai..."
        } :`,
        err
      );
    }
  }
}

// ============================================================
// Accès accepté (Module 43, 21/09) — l'email que reçoit l'artisan quand
// Axel accepte sa candidature. Plus de lien « définissez votre mot de
// passe » : il l'a choisi en candidatant, il se connecte directement.
//
// Comme le bilan mensuel, cet email part vers l'adresse de l'ARTISAN :
// il faut donc RESEND_FROM_EMAIL (un domaine vérifié sur Resend). Sans
// lui, rien ne part — et c'est dit à Axel au moment où il accepte (voir
// app/api/admin/candidatures/[id]/route.ts), pour qu'il prévienne
// l'artisan lui-même au lieu de croire que c'est fait.
// ============================================================
export async function envoyerAccesAccepte(params: {
  destinataire: string;
  prenom: string;
  urlConnexion: string;
}): Promise<"envoye" | "non_configure"> {
  const expediteur = process.env.RESEND_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !expediteur) return "non_configure";

  const texte = `Bonjour ${params.prenom},

Bonne nouvelle : votre candidature à la bêta de Compyo est acceptée.

Vous pouvez vous connecter dès maintenant, avec l'adresse email et le mot de passe que vous avez choisis en faisant votre demande :
${params.urlConnexion}

Si vous avez oublié votre mot de passe, la page de connexion vous permet d'en recevoir un nouveau.

À très vite sur Compyo,
Axel`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: expediteur,
      to: params.destinataire,
      subject: "Votre accès à Compyo est ouvert",
      text: texte,
    }),
  });

  if (!res.ok) {
    const corpsErreur = await res.text().catch(() => "(corps illisible)");
    throw new Error(`Resend a répondu ${res.status} : ${corpsErreur}`);
  }
  return "envoye";
}
