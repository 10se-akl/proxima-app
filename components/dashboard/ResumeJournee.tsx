"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Bouton discret, jamais affiché tout seul comme un rapport imposé : c'est
// l'artisan qui décide de le consulter, en fin de journée. Purement factuel
// (aucun appel IA) — ça marche toujours, même sans crédit API.
export function ResumeJournee() {
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [lignes, setLignes] = useState<string[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ouvrirResume() {
    setOuvert(true);
    if (lignes) return; // déjà chargé cette session, pas besoin de le refaire
    setErreur(null);
    setChargement(true);
    try {
      const res = await fetch("/api/ai/resume-journee", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLignes(data.lignes ?? []);
    } catch {
      setErreur("Impossible de préparer le résumé pour l'instant. Réessayez.");
    } finally {
      setChargement(false);
    }
  }

  if (!ouvert) {
    return (
      // Auparavant un simple lien texte souligné faisant office de bouton —
      // trop discret pour être reconnu comme cliquable, et le texte du
      // lien ("Voir ce qui mérite mon attention avant de partir") ne
      // ressemblait pas à un libellé d'action (relevé directement par
      // l'artisan qui teste l'app). Séparation claire maintenant : la
      // carte explique CE QUE C'EST (texte, non cliquable), un vrai
      // bouton avec un verbe d'action ("Faire l'analyse") déclenche
      // l'action — deux rôles, deux éléments visuels distincts.
      <Card className="mt-6 p-5">
        <p className="text-sm font-medium text-ink">📋 À vérifier avant de partir</p>
        <p className="mt-1 text-[11px] text-ink/45">
          Nouveaux contacts, devis en attente, dossiers urgents sans rendez-vous — un
          contrôle en 20 secondes, rien de plus.
        </p>
        <Button onClick={ouvrirResume} variant="secondary" className="mt-3 text-xs px-4 py-2">
          Faire l&apos;analyse
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-6 p-5">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-steel mb-1">
        À vérifier avant de partir
      </p>
      <p className="text-[11px] text-ink/35 mb-3">
        Regroupe uniquement ce qui a besoin d&apos;une action — pas un compte rendu de ce
        que vous savez déjà.
      </p>
      {chargement && <p className="text-sm text-ink/50">Je prépare ça…</p>}
      {erreur && <p className="text-sm text-signal">{erreur}</p>}
      {lignes && lignes.length === 0 && (
        <p className="text-sm text-ink/60">
          Rien de particulier à signaler aujourd&apos;hui — tout est à jour. 👍
        </p>
      )}
      {lignes && lignes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {lignes.map((ligne, i) => (
            <p key={i} className="text-sm text-ink/80 leading-relaxed">
              {ligne}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
