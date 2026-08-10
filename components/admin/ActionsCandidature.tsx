"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Candidature } from "@/types";

export function ActionsCandidature({ candidature }: { candidature: Candidature }) {
  const router = useRouter();
  const [chargement, setChargement] = useState<"accepter" | "refuser" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function agir(action: "accepter" | "refuser") {
    // Confirmation explicite avant d'agir : accepter crée réellement un
    // compte et envoie une invitation, refuser est définitif (pas de
    // "annuler" ensuite) — un clic accidentel ne doit jamais suffire.
    const confirme = window.confirm(
      action === "accepter"
        ? `Accepter ${candidature.prenom} ${candidature.nom} ? Un compte Compyo sera créé et un email d'invitation lui sera envoyé immédiatement.`
        : `Refuser ${candidature.prenom} ${candidature.nom} ? Cette action est définitive.`
    );
    if (!confirme) return;

    setErreur(null);
    setChargement(action);

    const res = await fetch(`/api/admin/candidatures/${candidature.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setChargement(null);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreur(data?.error ?? "Action impossible. Réessayez.");
      return;
    }

    router.refresh();
  }

  if (candidature.statut !== "pending") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
        {candidature.statut === "accepted" ? "Acceptée" : "Refusée"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {erreur && <p className="text-xs text-signal">{erreur}</p>}
      <Button
        variant="ghost"
        onClick={() => agir("refuser")}
        disabled={chargement !== null}
        className="!px-3 !py-1.5 text-xs"
      >
        {chargement === "refuser" ? "…" : "Refuser"}
      </Button>
      <Button
        onClick={() => agir("accepter")}
        disabled={chargement !== null}
        className="!px-3 !py-1.5 text-xs"
      >
        {chargement === "accepter" ? "…" : "Accepter"}
      </Button>
    </div>
  );
}
