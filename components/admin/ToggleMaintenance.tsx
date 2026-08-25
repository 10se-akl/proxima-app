"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// ============================================================
// Bouton on/off pour l'écran de maintenance (voir app/api/admin/maintenance
// et middleware.ts). Effet immédiat, sans redéploiement : le middleware lit
// le flag en base à chaque requête, en "no-store".
// ============================================================
export function ToggleMaintenance({ actifInitial }: { actifInitial: boolean }) {
  const [actif, setActif] = useState(actifInitial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function basculer() {
    setEnCours(true);
    setErreur(null);
    const res = await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !actif }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de mettre à jour l'état. Réessayez.");
      return;
    }
    setActif(!actif);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className={`w-2.5 h-2.5 rounded-full ${actif ? "bg-signal animate-pulse" : "bg-emerald-500"}`}
        />
        <p className="text-sm text-ink/80">
          {actif
            ? "Le site affiche actuellement l'écran de maintenance à tout le monde sauf toi."
            : "Le site est accessible normalement à tous les visiteurs."}
        </p>
      </div>
      <Button
        variant={actif ? "ghost" : "danger"}
        onClick={basculer}
        disabled={enCours}
        className="mt-4"
      >
        {enCours ? "…" : actif ? "Désactiver la maintenance" : "Activer la maintenance"}
      </Button>
      {erreur && <p className="mt-2 text-xs text-signal">{erreur}</p>}
    </div>
  );
}
