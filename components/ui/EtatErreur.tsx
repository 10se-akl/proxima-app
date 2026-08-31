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
      <span className="grid h-12 w-12 place-items-center rounded-full bg-signal/10 text-signal text-xl" aria-hidden="true">
        !
      </span>
      <p className="max-w-sm text-sm text-ink/70">{message}</p>
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
    <div className={`flex flex-wrap items-center gap-2.5 text-sm text-signal ${className}`}>
      <span>{message}</span>
      {onReessayer && (
        <button
          type="button"
          onClick={onReessayer}
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
