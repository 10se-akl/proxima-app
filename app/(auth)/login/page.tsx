"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    setChargement(false);

    if (error) {
      setErreur("Email ou mot de passe incorrect.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm mb-4">
        <Link href="/" className="text-sm text-ink/60 transition-colors hover:text-ink">
          ← Retour à l&apos;accueil
        </Link>
      </div>
      <Card className="w-full max-w-sm p-8">
        <Link href="/" className="font-display font-semibold text-lg hover:opacity-70 transition-opacity">
          Compyo
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Se connecter</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Mot de passe"
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <Button type="submit" disabled={chargement} className="w-full mt-2">
            {chargement ? "Connexion…" : "Se connecter"}
          </Button>
          <Link href="/mot-de-passe-oublie" className="text-center text-sm text-ink/55 underline hover:text-ink">
            Mot de passe oublié ?
          </Link>
        </form>

        <p className="mt-6 text-sm text-ink/60 text-center">
          Pas encore de compte ?{" "}
          <Link
            href="/demander-acces"
            className="text-ink font-medium underline decoration-ink/30 underline-offset-2 transition-colors hover:text-signal hover:decoration-signal/50"
          >
            Demander l&apos;accès à la bêta
          </Link>
        </p>
      </Card>
    </main>
  );
}
