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
    setErreur(null);
    setChargement(action);

    const res = await fetch(`/api/admin/candidatures/${candidature.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setChargement(null);

    if (!res.ok) {
      setErreur("Action impossible. Réessayez.");
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
