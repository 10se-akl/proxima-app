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
  title: "Liste d'attente",
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
        {/* 12/11 — accès immédiat : on n'arrive ici que si la bêta est
            complète (20 places, lib/candidatures/places.ts) ou si
            l'ouverture automatique a raté. Axel ouvre le compte à la main. */}
        <h1 className="mt-6 font-display text-2xl font-semibold leading-tight">
          Vous êtes sur la liste d&apos;attente.
        </h1>
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-steel">
          <p>Merci{prenom ? `, ${prenom}` : ""} : votre compte est créé.</p>
          <p>Les places de la bêta sont prises pour l&apos;instant. Dès qu&apos;une place s&apos;ouvre, votre compte est ouvert et vous recevez un email.</p>
        </div>

        <div className="mt-8 border-t border-ink/10 pt-6 text-sm text-ink/55">
          <p>
            Votre compte est déjà prêt : une fois ouvert, connectez-vous avec
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
