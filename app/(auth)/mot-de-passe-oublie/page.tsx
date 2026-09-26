"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// ============================================================
// Mot de passe oublié (Module 43, 21/09).
//
// Devenu indispensable avec la nouvelle demande d'accès : l'artisan choisit
// son mot de passe en candidatant, et ne s'en sert que quelques jours plus
// tard, une fois accepté. Avant, il le choisissait le jour même de son
// acceptation. Sans cette page, un mot de passe oublié entre-temps
// bloquait l'accès pour de bon.
//
// L'email est envoyé par Supabase Auth lui-même (comme les invitations),
// pas par Resend : il fonctionne sans domaine d'envoi configuré. Le lien
// mène à /definir-mot-de-passe, déjà autorisé comme adresse de retour.
//
// Même réponse que le compte existe ou non : sinon ce formulaire
// servirait à tester quelles adresses ont un compte Compyo.
// ============================================================

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/definir-mot-de-passe`,
    });
    setChargement(false);

    // Seule une limite d'envoi mérite d'être dite : c'est la seule erreur
    // sur laquelle l'artisan peut agir (attendre). Toute autre erreur est
    // traitée comme un succès, pour ne rien révéler sur l'adresse.
    if (error && /rate|limit|too many/i.test(error.message)) {
      setErreur("Trop de demandes d'un coup. Réessayez dans quelques minutes.");
      return;
    }
    setEnvoye(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm mb-4">
        <Link href="/login" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-ink/60 transition-colors hover:text-ink">
          ← Retour à la connexion
        </Link>
      </div>
      <Card className="w-full max-w-sm p-8">
        <p className="font-display font-semibold text-lg">Compyo</p>
        <h1 className="mt-4 text-xl font-semibold">Mot de passe oublié</h1>

        {envoye ? (
          <div className="mt-4 space-y-3 text-sm text-ink/70 leading-relaxed">
            <p>
              Si un compte existe pour <span className="font-medium text-ink">{email}</span>, un email
              vient de partir avec un lien pour choisir un nouveau mot de passe.
            </p>
            <p className="text-ink/55">
              Ouvrez-le sur ce même téléphone ou ordinateur. Pensez à regarder dans les courriers
              indésirables.
            </p>
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-ink/60">
              Indiquez l&apos;email de votre compte : vous recevrez un lien pour en choisir un
              nouveau.
            </p>
            <Field
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {erreur && <p className="text-sm text-signal">{erreur}</p>}
            <Button type="submit" disabled={chargement} className="w-full mt-2">
              {chargement ? "Envoi…" : "Recevoir un lien"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
