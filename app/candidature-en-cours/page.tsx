import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { BoutonDeconnexionAttente } from "./BoutonDeconnexionAttente";

// ============================================================
// Candidature en cours d'examen (Module 43, 21/09).
//
// Là où arrive un artisan dont le compte existe mais n'est pas encore
// accepté : juste après sa candidature, et chaque fois qu'il essaie
// d'entrer dans l'app avant la réponse (middleware.ts l'y renvoie).
//
// Le statut est relu à chaque affichage via getUser(), qui interroge le
// serveur d'authentification : dès qu'Axel a accepté, recharger cette
// page suffit à entrer — pas besoin de se déconnecter et reconnecter.
// ============================================================

export const metadata: Metadata = {
  title: "Candidature en cours d'examen",
  robots: { index: false, follow: false },
};

// Toujours relu à la demande : une page mise en cache pourrait montrer
// « en cours d'examen » à quelqu'un qui vient d'être accepté.
export const dynamic = "force-dynamic";

export default async function CandidatureEnCoursPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata?.acces !== "en_attente") redirect("/dashboard");

  const prenom = typeof user.user_metadata?.prenom === "string" ? user.user_metadata.prenom : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-16">
      <Card className="w-full max-w-md p-8 sm:p-10">
        <p className="font-display text-lg font-semibold">Compyo</p>
        <h1 className="mt-6 font-display text-2xl font-semibold leading-tight">
          Votre candidature est en cours d&apos;examen.
        </h1>
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink/70">
          <p>Merci pour votre demande d&apos;accès à Compyo{prenom ? `, ${prenom}` : ""}.</p>
          <p>Nous étudions actuellement votre candidature.</p>
          <p>Vous recevrez un email dès qu&apos;elle sera acceptée.</p>
          <p>En général, la réponse est donnée sous 48 heures.</p>
        </div>

        <div className="mt-8 border-t border-ink/10 pt-6 text-sm text-ink/55">
          <p>
            Votre compte est déjà prêt : une fois la candidature acceptée, connectez-vous avec
            <span className="font-medium text-ink/80"> {user.email} </span>
            et le mot de passe que vous avez choisi.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <BoutonDeconnexionAttente />
            <Link href="/" className="text-ink/55 underline hover:text-ink">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
