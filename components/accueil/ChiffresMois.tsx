import Link from "next/link";

// ============================================================
// L'argent du mois, en haut de l'accueil (22/10, panel de 18 faux clients).
//
// « L'appli me dit quoi faire, jamais ce que j'ai gagné. » Trois chiffres,
// les mêmes que le Bilan (lib/activite.ts, calculerActivite) : signé ce
// mois-ci, encaissé ce mois-ci, et ce qui reste dû maintenant. Un appui
// ouvre le Bilan. Rien n'est estimé : si la lecture échoue, la bande ne
// s'affiche pas (un « 0 € » faux tromperait), et un compte qui n'a encore
// rien signé ni facturé ne la voit pas non plus.
// ============================================================

export type ChiffresDuMois = {
  /** « octobre » */
  nomMois: string;
  signe: number;
  encaisse: number;
  aEncaisser: { total: number; enRetard: number };
};

const euros = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0, minimumFractionDigits: 0 });

export function ChiffresMois({ chiffres }: { chiffres: ChiffresDuMois | null }) {
  if (!chiffres) return null;
  const { nomMois, signe, encaisse, aEncaisser } = chiffres;
  if (signe === 0 && encaisse === 0 && aEncaisser.total === 0) return null;

  // 22/10 (2e panel) — le mois et « TTC » une seule fois, en tête : les
  // libellés tiennent sur une ligne à 360 px, et on sait de quels montants
  // on parle (« HT ou TTC ? »).
  const cases = [
    { libelle: "Signé", valeur: euros(signe), detail: null as string | null },
    { libelle: "Encaissé", valeur: euros(encaisse), detail: null },
    {
      libelle: "À encaisser",
      valeur: euros(aEncaisser.total),
      detail: aEncaisser.enRetard > 0 ? `${aEncaisser.enRetard} ${aEncaisser.enRetard > 1 ? "factures" : "facture"} en retard` : null,
    },
  ];

  return (
    <Link
      href="/dashboard/bilan"
      aria-label={`${nomMois}, montants TTC : ${cases.map((c) => `${c.libelle} ${c.valeur}${c.detail ? `, ${c.detail}` : ""}`).join(" ; ")}. Voir le bilan.`}
      className="mt-5 block rounded-[20px] bg-surface pb-3.5 pt-3 ombre-douce active:bg-ink/[0.03] sm:hover:bg-ink/[0.02] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className="flex items-center justify-between gap-3 px-3 sm:px-5">
        <span className="text-sm font-semibold text-ink first-letter:uppercase">{nomMois}</span>
        <span className="text-xs text-steel">Montants TTC · Voir le bilan ›</span>
      </span>
      <span className="mt-2 grid grid-cols-3 divide-x divide-ink/10">
      {cases.map((c) => (
        <span key={c.libelle} className="min-w-0 px-2 min-[400px]:px-3 sm:px-5">
          <span className="block truncate text-xs text-steel sm:text-sm">{c.libelle}</span>
          {/* Un montant ne se coupe jamais (« 124 80… ») : il rapetisse. */}
          <span className="mt-0.5 block whitespace-nowrap font-display text-base font-bold tabular-nums tracking-[-0.01em] text-ink min-[400px]:text-lg sm:text-2xl">
            {c.valeur}
          </span>
          {c.detail && <span className="mt-0.5 block text-xs font-semibold leading-tight text-signal-fonce dark:text-signal-clair">{c.detail}</span>}
        </span>
      ))}
      </span>
    </Link>
  );
}
