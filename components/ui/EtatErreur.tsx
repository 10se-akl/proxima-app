"use client";

import { BOUTON_CREUX, BOUTON_TEXTE } from "@/components/ui/recettes";

// ============================================================
// Sprint Robustesse (30/08) — voir audit-bugs-phase1.md, 🔴 "pages
// bloquées sur Chargement...". Plusieurs pages chargeaient leurs données
// sans jamais gérer l'échec : sur coupure réseau, l'écran restait
// indéfiniment sur "Chargement…", sans message, sans action possible —
// l'artisan ne pouvait que fermer l'app en pensant qu'elle était cassée.
//
// Ce composant est la réponse unique à ce problème, réutilisée partout où
// un chargement de page peut échouer : message compréhensible (jamais de
// jargon technique/code d'erreur brut) + un vrai bouton "Réessayer" qui
// relance la fonction de chargement d'origine. Toujours accompagné d'un
// lien de retour quand la page a un parent logique évident (passé par
// l'appelant, optionnel).
// ============================================================
export function EtatErreur({
  message = "Impossible de charger cette page. Vérifiez votre connexion.",
  onReessayer,
  chargement = false,
  className = "",
}: {
  message?: string;
  onReessayer: () => void;
  chargement?: boolean;
  className?: string;
}) {
  // Design v3 (24/10) : calme — une tuile d'icône neutre (pas de rond
  // d'alerte), la phrase en 17 px, et un seul
  // bouton « Réessayer » en creux (jamais plein : ce n'est pas l'action de
  // l'écran, c'est une reprise).
  return (
    <div className={`flex flex-col items-center px-4 py-14 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-paper-warm text-ink" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5" />
          <path d="M20 4v4.5h-4.5" />
          <path d="M20 12a8 8 0 0 1-13.66 5.66L4 15.5" />
          <path d="M4 20v-4.5h4.5" />
        </svg>
      </span>
      <p className="mt-4 max-w-sm text-[17px] font-semibold leading-snug text-ink" aria-live="polite">
        {message}
      </p>
      <button type="button" onClick={onReessayer} disabled={chargement} className={`mt-5 ${BOUTON_CREUX}`}>
        {chargement && (
          <span className="h-3.5 w-3.5 shrink-0 motion-safe:animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        )}
        Réessayer
      </button>
    </div>
  );
}

// Variante compacte pour une erreur locale à un bloc/une carte (pas toute
// la page) — même logique, empreinte visuelle plus légère.
export function ErreurInline({
  message,
  onReessayer,
  className = "",
}: {
  message: string;
  onReessayer?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-1 text-[15px] font-semibold text-signal-fonce dark:text-signal-clair ${className}`} aria-live="polite">
      <span>{message}</span>
      {onReessayer && (
        <button
          type="button"
          onClick={onReessayer}
          className={BOUTON_TEXTE}
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
