"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Les boutons de l'en-tête de l'accueil « carnet » (01/11/2026). Même règle
// que l'en-tête du reste du site (components/marketing/Cadre.tsx) : un
// artisan déjà connecté voit « Mon espace », pas « Connexion ». Supabase
// n'est chargé que si un cookie de session existe : un visiteur anonyme ne
// télécharge rien de plus.
export function EnteteActions({ inscription }: { inscription: string }) {
  const [connecte, setConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    const cookieSession = document.cookie.split("; ").some((c) => c.startsWith("sb-") && c.includes("-auth-token"));
    if (!cookieSession) {
      setConnecte(false);
      return;
    }
    let annule = false;
    import("@/lib/supabase/client").then(({ createClient }) =>
      createClient()
        .auth.getUser()
        .then(({ data }) => {
          if (!annule) setConnecte(Boolean(data.user));
        })
    );
    return () => {
      annule = true;
    };
  }, []);

  if (connecte) {
    return (
      <div className="entete-actions">
        <Link href="/dashboard" className="btn btn-cordeau">
          Mon espace
        </Link>
      </div>
    );
  }
  return (
    <div className="entete-actions">
      <Link href="/login" className="lien-discret">
        Connexion
      </Link>
      <Link href={inscription} className="btn btn-cordeau">
        Rejoindre<span className="cache-tel">&nbsp;la bêta</span>
      </Link>
    </div>
  );
}
