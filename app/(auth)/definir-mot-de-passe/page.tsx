"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Module 43 (21/09) — cette page sert désormais à deux choses : le lien
// d'invitation (anciennes candidatures, employés invités) et le lien
// « mot de passe oublié » (voir app/(auth)/mot-de-passe-oublie). Le jeton
// de session dit lequel des deux a ouvert la page : Supabase y inscrit la
// méthode d'authentification ("amr"), "recovery" pour une réinitialisation.
// Plus sûr qu'un paramètre dans l'adresse de retour, qui aurait pu faire
// refuser le lien par la liste d'adresses autorisées de Supabase.
function viaReinitialisation(jeton: string): boolean {
  try {
    const charge = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Array.isArray(charge.amr) && charge.amr.some((m: { method?: string }) => m.method === "recovery");
  } catch {
    return false;
  }
}

export default function DefinirMotDePassePage() {
  const router = useRouter();
  const supabase = createClient();

  const [pret, setPret] = useState(false);
  const [reinitialisation, setReinitialisation] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    // Le lien Supabase (invitation ou réinitialisation) établit une session
    // automatiquement à l'arrivée sur cette page.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPret(true);
        setReinitialisation(viaReinitialisation(data.session.access_token));
      } else {
        setErreur("Lien invalide ou expiré. Demandez-en un nouveau depuis la page de connexion.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);

    const { error } = await supabase.auth.updateUser({ password: motDePasse });

    setChargement(false);

    if (error) {
      setErreur("Impossible d'enregistrer ce mot de passe. Réessayez.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <Card className="w-full max-w-sm p-8">
        <p className="font-display font-semibold text-lg">Compyo</p>
        <h1 className="mt-4 text-xl font-semibold">
          {reinitialisation ? "Nouveau mot de passe" : "Bienvenue dans la bêta"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {reinitialisation
            ? "Choisissez un nouveau mot de passe pour votre compte Compyo."
            : "Votre candidature a été acceptée. Définissez votre mot de passe pour accéder à votre espace."}
        </p>

        {pret ? (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Field
              label="Nouveau mot de passe"
              type="password"
              required
              autoComplete="new-password"
              // 8, comme à la demande d'accès (Module 43).
              minLength={8}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            {erreur && <p className="text-sm text-signal">{erreur}</p>}
            <Button type="submit" disabled={chargement} className="w-full mt-2">
              {chargement ? "Enregistrement…" : "Accéder à mon espace"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-signal">{erreur ?? "Vérification du lien…"}</p>
        )}
      </Card>
    </main>
  );
}
