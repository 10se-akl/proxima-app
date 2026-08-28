"use client";

import { useEffect, useState } from "react";
import { detecterPlateforme } from "@/lib/pwa/plateforme";
import { estDejaInstallee } from "@/lib/pwa/installPrompt";
import {
  peutAfficherAstucePartage,
  enregistrerAffichageAstucePartage,
  masquerAstucePartageDefinitivement,
} from "@/lib/onboarding/astuces";

// ============================================================
// "Premier contact sans friction" (27/08) — astuce contextuelle des
// premiers jours, Android uniquement : rappelle le parcours WhatsApp/SMS/
// Mail → Partager → Compyo à un artisan qui vient de créer un projet
// manuellement, sans jamais l'empêcher de continuer comme il veut. Ne
// s'affiche que si la PWA est installée (le partage natif ne fonctionne
// pas sinon, voir app/manifest.ts) et un nombre limité de fois — voir
// lib/onboarding/astuces.ts.
// ============================================================

export function AstucePartage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (detecterPlateforme() !== "android") return;
    if (!estDejaInstallee()) return;
    if (!peutAfficherAstucePartage()) return;

    setVisible(true);
    enregistrerAffichageAstucePartage();
  }, []);

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-signal/20 bg-signal/5 px-4 py-2.5">
      <p className="text-xs text-ink/70">
        💡 Astuce : la prochaine fois, essayez WhatsApp/SMS → <strong>Partager</strong> →{" "}
        <strong>Compyo</strong>. Le projet se crée tout seul.
      </p>
      <button
        onClick={() => {
          setVisible(false);
          masquerAstucePartageDefinitivement();
        }}
        aria-label="Masquer cette astuce"
        className="shrink-0 text-ink/40 hover:text-ink transition-colors text-sm"
      >
        ✕
      </button>
    </div>
  );
}
