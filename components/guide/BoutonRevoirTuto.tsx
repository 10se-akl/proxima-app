"use client";

// Relance le mini-tuto du premier lancement (components/onboarding/
// TutoPremierProjet.tsx), monté dans le tableau de bord.
export function BoutonRevoirTuto() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("compyo:ouvrir-tuto"))}
      className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-ink px-5 text-base font-semibold text-paper active:bg-ink/80"
    >
      Refaire le tuto : créer un projet
    </button>
  );
}
