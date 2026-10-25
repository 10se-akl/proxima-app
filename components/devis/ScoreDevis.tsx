"use client";

import { useState } from "react";
import Link from "next/link";
import { IconeChevron } from "@/components/projet/icones";
import { BOUTON_TEXTE, CARTE_PLEINE, FOCUS } from "@/components/ui/recettes";
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

// Design v3 (25/10) : plus d'anneau ni de pourcentage. « 30 » dans un
// anneau rouge sonnait comme une note sanctionnée ; l'artisan veut savoir
// combien de points regarder, pas sa note. Le pourcentage reste calculé
// (lib/devis/qualite) mais ne s'affiche plus ici.
function Pastille({ aVerifier }: { aVerifier: number }) {
  const ok = aVerifier === 0;
  return (
    <span
      aria-hidden
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold ${
        ok ? "bg-succes-fond text-succes" : "bg-alerte-fond text-alerte-orange"
      }`}
    >
      {ok ? "✓" : "!"}
    </span>
  );
}

function Ligne({ point, completion }: { point: PointQualite; completion?: ContexteCompletion }) {
  const surPlace = point.niveau !== "ok" && completion && COMPLETIONS[point.id];
  const icone = point.niveau === "ok" ? "✓" : point.niveau === "attention" ? "!" : "•";
  // Design v3 (24/10) : des teintes opaques d'état (≥ 5,9:1), plus des
  // couleurs à 12 % d'opacité.
  const style =
    point.niveau === "ok"
      ? "bg-succes-fond text-succes"
      : point.niveau === "attention"
        ? "bg-signal-fond text-signal-fonce"
        : "bg-alerte-fond text-alerte-orange";
  return (
    <li className="flex gap-3 py-3">
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${style}`} aria-hidden>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        {/* L'état n'était porté que par la couleur de la pastille : on le dit
            aussi au lecteur d'écran. */}
        <p className={`text-base [text-wrap:pretty] ${point.niveau === "ok" ? "text-steel" : "font-semibold text-ink"}`}>
          <span className="sr-only">{point.niveau === "ok" ? "OK : " : "À corriger : "}</span>
          {point.libelle}
        </p>
        {surPlace ? (
          <CompletionMention pointId={point.id} contexte={completion} />
        ) : (
          point.niveau !== "ok" && <p className="mt-0.5 text-[15px] leading-relaxed text-steel [text-wrap:pretty]">{point.detail}</p>
        )}
        {point.lien && !surPlace && (
          <Link
            href={point.lien.href}
            className={`-ml-3 ${BOUTON_TEXTE}`}
          >
            {point.lien.texte}
            <IconeChevron className="h-4 w-4 text-steel" />
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
    <div className={CARTE_PLEINE}>
      {/* Design v3 (24/10) : plus de capitales espacées ni de gris pâle ;
          le chevron des autres listes au lieu du triangle. */}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className={`-m-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-[20px] p-2 text-left ${FOCUS}`}
      >
        <Pastille aVerifier={evaluation.aVerifier} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-steel">Avant d&apos;envoyer</p>
          <p
            className={`mt-0.5 font-display text-[17px] font-semibold ${
              evaluation.aVerifier === 0 ? "text-succes" : "text-alerte-orange"
            }`}
          >
            {evaluation.aVerifier === 0
              ? "Tout est en ordre"
              : `${evaluation.aVerifier} point${evaluation.aVerifier > 1 ? "s" : ""} à vérifier`}
          </p>
          <p className="mt-0.5 text-sm text-steel [text-wrap:pretty]">
            Vous restez libre d&apos;envoyer ce devis tel quel.
          </p>
        </div>
        <IconeChevron
          className={`h-5 w-5 shrink-0 text-steel motion-safe:transition-transform ${ouvert ? "rotate-90" : ""}`}
        />
      </button>

      {ouvert && (
        <div className="mt-4 border-t border-gris-clair pt-1">
          <ul className="divide-y divide-gris-clair">
            {aTrier(evaluation.conformite).map((p) => (
              <Ligne key={p.id} point={p} completion={completion} />
            ))}
          </ul>
          {evaluation.lisibilite.length > 0 && (
            <>
              <p className="mt-5 text-base font-semibold text-ink">Ce que votre client comprendra</p>
              <ul className="divide-y divide-gris-clair">
                {aTrier(evaluation.lisibilite).map((p) => (
                  <Ligne key={p.id} point={p} completion={completion} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
