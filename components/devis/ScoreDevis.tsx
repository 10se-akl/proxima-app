"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { EvaluationDevis, PointQualite } from "@/lib/devis/qualite";
import { COMPLETIONS, CompletionMention, type ContexteCompletion } from "./CompletionMention";

// ============================================================
// Le score du devis, tel que l'artisan le voit (17/09).
//
// Il informe, il ne bloque rien : aucun bouton n'est désactivé par ce
// score, et on le dit noir sur blanc. Replié quand tout va bien, ouvert
// quand un point juridique manque vraiment.
//
// 26/09 (lot F) — une mention manquante se complète ici même : le champ,
// une raison d'une ligne, « Enregistrer » (voir CompletionMention). Le
// lien vers les paramètres ne reste que pour ce qui ne se règle pas d'un
// champ (une TVA contradictoire).
// ============================================================

function couleur(score: number) {
  if (score >= 90) return { texte: "text-succes", anneau: "rgb(var(--c-succes))" };
  if (score >= 70) return { texte: "text-alerte-orange", anneau: "rgb(var(--c-alerte-orange))" };
  return { texte: "text-signal", anneau: "rgb(var(--c-signal))" };
}

function Anneau({ score }: { score: number }) {
  const rayon = 22;
  const circonference = 2 * Math.PI * rayon;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
        <circle cx="26" cy="26" r={rayon} fill="none" stroke="rgb(var(--c-ink) / 0.1)" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={rayon}
          fill="none"
          stroke={couleur(score).anneau}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(circonference * score) / 100} ${circonference}`}
        />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center text-[13px] font-semibold ${couleur(score).texte}`}
      >
        {score}
      </span>
    </div>
  );
}

function Ligne({ point, completion }: { point: PointQualite; completion?: ContexteCompletion }) {
  const surPlace = point.niveau !== "ok" && completion && COMPLETIONS[point.id];
  const icone = point.niveau === "ok" ? "✓" : point.niveau === "attention" ? "!" : "•";
  const style =
    point.niveau === "ok"
      ? "bg-succes/12 text-succes"
      : point.niveau === "attention"
        ? "bg-signal/12 text-signal"
        : "bg-alerte-orange/15 text-alerte-orange";
  return (
    <li className="flex gap-3 py-2">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${style}`}>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${point.niveau === "ok" ? "text-ink/55" : "font-medium text-ink"}`}>{point.libelle}</p>
        {surPlace ? (
          <CompletionMention pointId={point.id} contexte={completion} />
        ) : (
          point.niveau !== "ok" && <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{point.detail}</p>
        )}
        {point.lien && !surPlace && (
          <Link
            href={point.lien.href}
            className="mt-1 inline-block text-xs font-medium text-signal underline-offset-2 hover:underline max-sm:mt-0 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
          >
            {point.lien.texte} →
          </Link>
        )}
      </div>
    </li>
  );
}

export function ScoreDevis({ evaluation, completion }: { evaluation: EvaluationDevis; completion?: ContexteCompletion }) {
  const manquesImportants = evaluation.conformite.some((p) => p.niveau === "attention");
  const [ouvert, setOuvert] = useState(manquesImportants);

  const aTrier = (points: PointQualite[]) =>
    [...points].sort((a, b) => {
      const ordre = { attention: 0, conseil: 1, ok: 2 };
      return ordre[a.niveau] - ordre[b.niveau];
    });

  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="flex w-full items-center gap-4 text-left"
      >
        <Anneau score={evaluation.score} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-ink/50">Avant d&apos;envoyer</p>
          <p className="mt-0.5 font-display text-[17px] font-semibold">
            {evaluation.aVerifier === 0
              ? "Tout est en ordre"
              : `${evaluation.aVerifier} point${evaluation.aVerifier > 1 ? "s" : ""} à vérifier`}
          </p>
          <p className="text-xs text-ink/50">
            Conformité du document : {evaluation.score} %. Vous restez libre d&apos;envoyer ce devis tel quel.
          </p>
        </div>
        <span className={`shrink-0 text-ink/40 transition-transform ${ouvert ? "" : "-rotate-90"}`}>▾</span>
      </button>

      {ouvert && (
        <div className="mt-4 border-t border-ink/10 pt-2">
          <ul className="divide-y divide-ink/5">
            {aTrier(evaluation.conformite).map((p) => (
              <Ligne key={p.id} point={p} completion={completion} />
            ))}
          </ul>
          {evaluation.lisibilite.length > 0 && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink/50">
                Ce que votre client comprendra
              </p>
              <ul className="divide-y divide-ink/5">
                {aTrier(evaluation.lisibilite).map((p) => (
                  <Ligne key={p.id} point={p} completion={completion} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
