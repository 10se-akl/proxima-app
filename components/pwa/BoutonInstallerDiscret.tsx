"use client";

import { useEffect, useState } from "react";
import {
  demanderAffichageManuel,
  estDejaInstallee,
  peutProposerInstallation,
} from "@/lib/pwa/installPrompt";

// ============================================================
// Petit lien texte, discret par nature — pas un bouton mis en avant —
// présent en permanence dans la Sidebar (mobile et desktop) pour
// l'artisan qui a ignoré ou refusé la carte automatique de InstallPWA.tsx
// et voudrait installer Compyo plus tard, sans attendre une nouvelle
// proposition spontanée qui, elle, ne revient jamais toute seule.
//
// Se masque tout seul dans trois cas : l'app est déjà installée,
// l'installation n'est pas possible sur ce navigateur (Firefox desktop
// par exemple, qui n'implémente pas l'installation de PWA), ou pas encore
// possible à cet instant précis (événement "beforeinstallprompt" pas
// encore arrivé) — dans ce dernier cas il réapparaît de lui-même dès que
// l'événement arrive, sans qu'il soit nécessaire de recharger la page.
// ============================================================

export function BoutonInstallerDiscret({
  className = "",
  // "compact" : icône seule avec title/aria-label, pour s'aligner dans une
  // rangée d'actions (ThemeToggle, déconnexion...) plutôt qu'un lien texte
  // séparé — voir Sidebar.tsx. Le lien texte complet reste la variante par
  // défaut, réutilisable ailleurs si besoin d'un point d'entrée plus explicite.
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function evaluer() {
      setVisible(!estDejaInstallee() && peutProposerInstallation());
    }
    evaluer();
    window.addEventListener("compyo:install-prompt-pret", evaluer);
    window.addEventListener("compyo:install-terminee", evaluer);
    return () => {
      window.removeEventListener("compyo:install-prompt-pret", evaluer);
      window.removeEventListener("compyo:install-terminee", evaluer);
    };
  }, []);

  if (!visible) return null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => demanderAffichageManuel()}
        title="Installer l'application"
        aria-label="Installer l'application"
        className={className || "text-white/60 hover:text-white transition-colors"}
      >
        <span aria-hidden="true">📲</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => demanderAffichageManuel()}
      className={`text-xs text-white/60 hover:text-white underline ${className}`}
    >
      Installer l&apos;application
    </button>
  );
}
