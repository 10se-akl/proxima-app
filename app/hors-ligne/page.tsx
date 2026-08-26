"use client";

// ============================================================
// Page de secours du service worker (public/sw.js) quand une navigation
// échoue sans réseau ET sans version en cache de la page demandée — par
// exemple un artisan qui ouvre un lien jamais visité alors qu'il est en
// sous-sol sans réseau. 100% statique, même logique que app/maintenance :
// aucun appel Supabase, doit pouvoir s'afficher tel quel depuis le cache
// du service worker sans aucune donnée dynamique.
//
// Ce n'est PAS l'expérience "hors ligne" normale d'une page déjà ouverte
// (celle-ci continue de fonctionner avec les données déjà chargées en
// mémoire, sans intervention du service worker) — uniquement le filet de
// sécurité pour une navigation impossible à satisfaire autrement. Voir le
// rapport de cycle PWA pour le détail de la stratégie de cache complète.
// ============================================================

// Pas d'export "metadata" ici : réservé aux composants serveur. Cette
// page n'a de toute façon pas vocation à être indexée ou partagée — elle
// n'existe que comme filet de secours interne du service worker.
export default function HorsLignePage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-signal/10 border border-signal/20 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">
            📡
          </span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">
          Pas de connexion pour l&apos;instant
        </h1>
        <p className="mt-3 text-sm text-ink/60 leading-relaxed">
          Cette page n&apos;a encore jamais été ouverte sans réseau, donc Compyo ne peut pas
          l&apos;afficher pour le moment. Les projets déjà consultés récemment, eux, restent
          accessibles — revenez à l&apos;écran précédent ou réessayez dès que le réseau revient.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-ink text-paper text-sm font-medium px-4 py-2.5 transition-colors hover:bg-signal"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
