"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Candidature } from "@/types";

export function ActionsCandidature({ candidature }: { candidature: Candidature }) {
  const router = useRouter();
  const [chargement, setChargement] = useState<"accepter" | "refuser" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Message à ne pas rater après une action réussie — typiquement : « accès
  // ouvert, mais aucun email n'est parti, préviens-le toi-même ».
  const [info, setInfo] = useState<string | null>(null);

  // Module 43 (21/09) — une candidature avec compte (nouveau formulaire)
  // et une ancienne (sans compte) ne font pas la même chose : le texte de
  // confirmation doit dire exactement ce qui va se passer.
  const avecCompte = Boolean(candidature.user_id);

  async function agir(action: "accepter" | "refuser") {
    // Confirmation explicite avant d'agir : accepter ouvre réellement un
    // accès, refuser est définitif (pas de "annuler" ensuite) — un clic
    // accidentel ne doit jamais suffire.
    const nom = `${candidature.prenom} ${candidature.nom}`;
    const confirme = window.confirm(
      action === "accepter"
        ? avecCompte
          ? `Accepter ${nom} ? Son compte est ouvert immédiatement : il se connecte avec le mot de passe qu'il a choisi, et reçoit un email de confirmation.`
          : `Accepter ${nom} ? Un compte Compyo sera créé et un email d'invitation lui sera envoyé immédiatement.`
        : avecCompte
          ? `Refuser ${nom} ? Son compte sera supprimé. Cette action est définitive.`
          : `Refuser ${nom} ? Cette action est définitive.`
    );
    if (!confirme) return;
    setInfo(null);

    setErreur(null);
    setChargement(action);

    const res = await fetch(`/api/admin/candidatures/${candidature.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setChargement(null);

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErreur(data?.error ?? "Action impossible. Réessayez.");
      return;
    }
    if (data?.info) setInfo(data.info);

    router.refresh();
  }

  if (candidature.statut !== "pending") {
    return (
      <div className="flex max-w-xs flex-col items-end gap-1.5 text-right">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
          {candidature.statut === "accepted" ? "Acceptée" : "Refusée"}
        </span>
        {info && (
          <p role="status" className="rounded-lg bg-alerte-orange/10 px-2.5 py-1.5 text-xs text-ink/80">
            {info}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {erreur && <p className="text-xs text-signal">{erreur}</p>}
      <Button
        variant="ghost"
        onClick={() => agir("refuser")}
        disabled={chargement !== null}
        className="!px-3 !py-1.5 text-xs"
      >
        {chargement === "refuser" ? "…" : "Refuser"}
      </Button>
      <Button
        onClick={() => agir("accepter")}
        disabled={chargement !== null}
        className="!px-3 !py-1.5 text-xs"
      >
        {chargement === "accepter" ? "…" : "Accepter"}
      </Button>
    </div>
  );
}
