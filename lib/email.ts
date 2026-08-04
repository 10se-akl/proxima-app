import type { Candidature } from "@/types";

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
export async function notifierNouvelleCandidature(candidature: Candidature) {
  const destinataire = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;
  if (!process.env.RESEND_API_KEY || !destinataire) return;

  try {
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
      console.error(
        `Échec de l'email de notification admin — Resend a répondu ${res.status} : ${corpsErreur}`
      );
    }
  } catch (err) {
    // Une erreur d'email ne doit jamais faire échouer la candidature elle-même.
    console.error("Échec de l'email de notification admin :", err);
  }
}
