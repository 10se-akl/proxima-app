import type { Metadata } from "next";

// ============================================================
// Écran de maintenance (Module 23, supabase/schema.sql + middleware.ts).
// Volontairement 100% statique — aucun appel Supabase, aucune donnée
// dynamique : c'est justement la page qui doit continuer à s'afficher
// correctement même si le reste du site (ou Supabase) est en train de
// planter pendant qu'Axel travaille dessus.
// ============================================================

export const metadata: Metadata = {
  // SEO (05/09) — voir même correctif que /fonctionnalites : le layout
  // racine applique déjà "%s — Compyo", garder le suffixe ici le dupliquait.
  title: "Maintenance en cours",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-signal/10 border border-signal/20 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">
            🛠️
          </span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">
          Compyo fait une petite pause
        </h1>
        <p className="mt-3 text-sm text-ink/60 leading-relaxed">
          Une mise à jour est en cours. Ça ne devrait durer que quelques minutes — revenez
          juste après, vos données n&apos;ont bougé nulle part.
        </p>
        <p className="mt-6 font-mono text-[11px] tracking-[0.15em] uppercase text-steel">
          De retour très bientôt
        </p>
      </div>
    </div>
  );
}
