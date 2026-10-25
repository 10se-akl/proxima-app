"use client";

import { useEffect, useState } from "react";
import { detecterPlateforme } from "@/lib/pwa/plateforme";
import { estDejaInstallee } from "@/lib/pwa/installPrompt";
import {
  peutAfficherAstucePartage,
  enregistrerAffichageAstucePartage,
  masquerAstucePartageDefinitivement,
} from "@/lib/onboarding/astuces";
import { IconeFermer } from "@/components/projet/icones";
import { BOUTON_ICONE, CREUX, BOUTON_ICONE_DISCRET } from "@/components/ui/recettes";

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

  // Design v3 (24/10) : un encart en creux (plus de saumon ni d'émoji), le
  // texte en 15 px lisible, la croix en vrai bouton de 48 px.
  return (
    <div className={`mb-4 flex items-center justify-between gap-2 py-1 pl-4 pr-1 ${CREUX}`}>
      <p className="py-2 text-[15px] leading-snug text-ink [text-wrap:pretty]">
        <span className="font-semibold">Astuce&nbsp;:</span> la prochaine fois, essayez WhatsApp/SMS →{" "}
        <strong>Partager</strong> → <strong>Compyo</strong>. Compyo prépare le projet, vous validez.
      </p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          masquerAstucePartageDefinitivement();
        }}
        aria-label="Masquer cette astuce"
        className={BOUTON_ICONE_DISCRET}
      >
        <IconeFermer className="h-5 w-5" />
      </button>
    </div>
  );
}
