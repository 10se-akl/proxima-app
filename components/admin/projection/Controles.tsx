"use client";

import type { ReactNode } from "react";
import { libelleMois } from "@/lib/projection/moteur";

// ============================================================
// Les petites commandes de /admin/projection (06/10) : un nombre avec son
// unité, un curseur, une case, un choix de mois, une section repliable.
// Tout se règle au clavier comme à la souris ; rien n'est enregistré en
// base (les réglages restent dans le navigateur).
// ============================================================

export const CHAMP =
  "min-h-10 w-full rounded-lg border border-ink/15 bg-paper px-2.5 text-sm tabular-nums text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15";

export function Section({ titre, resume, ouverte = false, children }: { titre: string; resume?: ReactNode; ouverte?: boolean; children: ReactNode }) {
  return (
    <details open={ouverte} className="group rounded-2xl border border-ink/10 bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-display text-base font-semibold">{titre}</span>
          {resume && <span className="block truncate text-xs text-ink/55">{resume}</span>}
        </span>
        <span aria-hidden className="text-ink/40 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-ink/10 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

export function Nombre({
  label,
  valeur,
  onChange,
  suffixe,
  min,
  max,
  pas = 1,
  aide,
}: {
  label: string;
  valeur: number;
  onChange: (v: number) => void;
  suffixe?: string;
  min?: number;
  max?: number;
  pas?: number;
  aide?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-ink/60">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(valeur) ? valeur : 0}
          min={min}
          max={max}
          step={pas}
          onChange={(e) => {
            const v = e.target.value === "" ? 0 : Number(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className={CHAMP}
        />
        {suffixe && <span className="shrink-0 text-xs text-ink/50">{suffixe}</span>}
      </span>
      {aide && <span className="mt-0.5 block text-[11px] text-ink/45">{aide}</span>}
    </label>
  );
}

export function Curseur({ id, label, valeur, min, max, pas, suffixe, onChange, format }: {
  id: string; label: string; valeur: number; min: number; max: number; pas: number; suffixe?: string; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between gap-2 text-xs text-ink/60">
        {label}
        <output htmlFor={id} className="font-semibold tabular-nums text-ink">{format ? format(valeur) : `${valeur}${suffixe ?? ""}`}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={pas} value={valeur} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 h-8 w-full accent-signal" />
    </div>
  );
}

export function Interrupteur({ id, label, detail, actif, onChange }: { id: string; label: string; detail?: string; actif: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-ink/[0.03]">
      <input id={id} type="checkbox" checked={actif} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-signal" />
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {detail && <span className="block text-xs text-ink/50">{detail}</span>}
      </span>
    </label>
  );
}

/** Un mois de la projection (0 = novembre 2026). */
export function ChoixMois({
  label,
  valeur,
  onChange,
  nbMois,
  vide,
}: {
  label: string;
  valeur: number | null;
  onChange: (v: number | null) => void;
  nbMois: number;
  /** Le libellé de l'option « aucun mois » ; sans lui, un mois est obligatoire. */
  vide?: string;
}) {
  const max = Math.max(nbMois, (valeur ?? 0) + 1);
  return (
    <label className="block">
      <span className="block text-xs text-ink/60">{label}</span>
      <select
        value={valeur === null ? "" : String(valeur)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`mt-1 ${CHAMP}`}
      >
        {vide && <option value="">{vide}</option>}
        {Array.from({ length: max }, (_, m) => (
          <option key={m} value={m}>
            {libelleMois(m)} · mois {m + 1}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BoutonPetit({ children, onClick, plein = false, titre }: { children: ReactNode; onClick: () => void; plein?: boolean; titre?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titre}
      className={`min-h-10 rounded-lg px-3 text-xs font-medium transition-colors ${plein ? "bg-ink text-paper hover:bg-ink/85" : "border border-ink/15 bg-surface text-ink hover:border-ink/40"}`}
    >
      {children}
    </button>
  );
}

export function nouvelId() {
  return Math.random().toString(36).slice(2, 10);
}
