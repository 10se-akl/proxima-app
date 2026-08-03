"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function DefinirMotDePassePage() {
  const router = useRouter();
  const supabase = createClient();

  const [pret, setPret] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    // Le lien d'invitation Supabase établit une session automatiquement
    // à l'arrivée sur cette page (token dans l'URL, lu par supabase-js).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setPret(true);
      } else {
        setErreur("Lien invalide ou expiré. Contactez-nous pour un nouveau lien.");
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
        <p className="font-display font-semibold text-lg">Proxima</p>
        <h1 className="mt-4 text-xl font-semibold">Bienvenue dans la bêta</h1>
        <p className="mt-2 text-sm text-ink/60">
          Votre candidature a été acceptée. Définissez votre mot de passe pour accéder à
          votre espace.
        </p>

        {pret ? (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Field
              label="Nouveau mot de passe"
              type="password"
              required
              minLength={6}
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
