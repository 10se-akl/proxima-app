"use client";

import { Button } from "@/components/ui/Button";

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
  return (
    <div className={`flex flex-col items-center gap-3 py-16 text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink/10 text-xl font-semibold text-ink" aria-hidden="true">
        !
      </span>
      <p className="max-w-sm text-base text-steel" aria-live="polite">{message}</p>
      <Button onClick={onReessayer} loading={chargement} variant="ghost">
        Réessayer
      </Button>
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
    <div className={`flex flex-wrap items-center gap-2.5 text-sm font-semibold text-signal-fonce dark:text-signal-clair ${className}`} aria-live="polite">
      <span>{message}</span>
      {onReessayer && (
        <button
          type="button"
          onClick={onReessayer}
          className="inline-flex min-h-12 items-center font-semibold text-ink underline decoration-ink/30 underline-offset-4"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
