import type { Candidature } from "@/types";

// Notification optionnelle : si RESEND_API_KEY n'est pas configurée,
// la candidature est quand même enregistrée, seul l'email est sauté.
// L'admin peut toujours consulter /admin/candidatures manuellement.
export async function notifierNouvelleCandidature(candidature: Candidature) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Compyo <onboarding@resend.dev>",
        to: process.env.ADMIN_EMAIL,
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
  } catch (err) {
    // Une erreur d'email ne doit jamais faire échouer la candidature elle-même.
    console.error("Échec de l'email de notification admin :", err);
  }
}
