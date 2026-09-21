"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

// Se déconnecter depuis la page d'attente : utile sur un téléphone partagé,
// ou pour se connecter avec un autre compte.
export function BoutonDeconnexionAttente() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function deconnecter() {
    setEnCours(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={deconnecter} loading={enCours} className="px-4 py-2 text-sm">
      Se déconnecter
    </Button>
  );
}
