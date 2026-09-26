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

    if (error) {
      setChargement(false);
      // 27/09 — Une coupure réseau n'est pas un mauvais mot de passe : le
      // dire évite de le retaper pour rien sur un chantier mal couvert.
      setErreur(
        error.status === 400 || error.status === 401
          ? "Email ou mot de passe incorrect."
          : "Connexion impossible pour le moment. Vérifiez votre réseau et réessayez."
      );
      return;
    }

    // L'écran demandé avant la connexion (notification, lien) : uniquement
    // un chemin interne de l'application, jamais une adresse extérieure.
    // Le bouton reste désactivé jusqu'à la navigation (pas de double envoi).
    const suite = new URLSearchParams(window.location.search).get("suite");
    router.push(suite && /^\/dashboard(\/|\?|$)/.test(suite) && !suite.startsWith("//") ? suite : "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm mb-4">
        <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-ink/60 transition-colors hover:text-ink">
          ← Retour à l&apos;accueil
        </Link>
      </div>
      <Card className="w-full max-w-sm p-8">
        <Link href="/" className="inline-flex min-h-11 items-center font-display font-semibold text-lg hover:opacity-70 transition-opacity">
          Compyo
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Se connecter</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Mot de passe"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <Button type="submit" disabled={chargement} className="w-full mt-2">
            {chargement ? "Connexion…" : "Se connecter"}
          </Button>
          <Link href="/mot-de-passe-oublie" className="flex min-h-11 items-center justify-center text-sm text-ink/55 underline hover:text-ink">
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
