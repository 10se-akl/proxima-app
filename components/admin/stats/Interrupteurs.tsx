"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CLE_NE_PAS_MESURER } from "@/components/MesureAudience";

// ============================================================
// Les deux réglages de /admin/statistiques (22/09) — pour que les tests
// d'Axel ne faussent rien.
// ============================================================

/** Exclure (ou réintégrer) un compte de toutes les statistiques d'usage. */
export function InterrupteurExclusion({
  organisationId,
  exclu,
  verrouille,
}: {
  organisationId: string;
  exclu: boolean;
  // Le compte d'Axel est toujours exclu : pas de bouton pour l'inclure.
  verrouille?: boolean;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  if (verrouille) {
    return <span className="text-xs text-ink/45">Toujours exclu (ton compte)</span>;
  }

  async function basculer() {
    setEnCours(true);
    setErreur(false);
    const res = await fetch("/api/admin/statistiques/exclusion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organisationId, exclu: !exclu }),
    }).catch(() => null);
    setEnCours(false);
    if (!res?.ok) {
      setErreur(true);
      return;
    }
    router.refresh();
  }

  return (
    <span className="flex items-center gap-2">
      {erreur && <span className="text-xs text-signal">Échec, réessaie</span>}
      <button
        type="button"
        onClick={basculer}
        disabled={enCours}
        className={`rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
          exclu
            ? "border-ink/15 text-ink/60 hover:border-ink/30 hover:text-ink"
            : "border-signal/30 text-signal hover:bg-signal/10"
        }`}
      >
        {enCours ? "…" : exclu ? "Réintégrer" : "Exclure (compte de test)"}
      </button>
    </span>
  );
}

/** Ne plus compter les visites de CET appareil (navigateur). À activer sur
 *  chaque téléphone et ordinateur avec lesquels Axel teste le site. */
export function InterrupteurAppareil() {
  const [exclu, setExclu] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setExclu(window.localStorage.getItem(CLE_NE_PAS_MESURER) === "1");
    } catch {
      setExclu(false);
    }
  }, []);

  function basculer() {
    try {
      if (exclu) window.localStorage.removeItem(CLE_NE_PAS_MESURER);
      else window.localStorage.setItem(CLE_NE_PAS_MESURER, "1");
      setExclu(!exclu);
    } catch {
      // Stockage bloqué (navigation privée stricte) : rien à faire.
    }
  }

  if (exclu === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink/70">
        {exclu
          ? "Cet appareil n'est pas compté dans les visites."
          : "Cet appareil est compté dans les visites."}
        <span className="block text-xs text-ink/45">
          Tes visites connecté sont déjà ignorées. Ce réglage couvre celles où tu n&apos;es pas
          connecté, sur ce navigateur précisément.
        </span>
      </p>
      <button
        type="button"
        onClick={basculer}
        className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm transition-colors hover:border-ink/30"
      >
        {exclu ? "Compter à nouveau" : "Ne plus compter cet appareil"}
      </button>
    </div>
  );
}
