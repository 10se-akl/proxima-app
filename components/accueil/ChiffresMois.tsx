import Link from "next/link";
import { euros } from "@/components/ui/recettes";

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


export function ChiffresMois({ chiffres }: { chiffres: ChiffresDuMois | null }) {
  if (!chiffres) return null;
  const { nomMois, signe, encaisse, aEncaisser } = chiffres;
  if (signe === 0 && encaisse === 0 && aEncaisser.total === 0) return null;
  const retard =
    aEncaisser.enRetard > 0 ? `${aEncaisser.enRetard} ${aEncaisser.enRetard > 1 ? "factures" : "facture"} en retard` : null;

  // Design v3 (23/10, 7 visions) : la récompense en UN gros chiffre — ce
  // qui doit rentrer — et le mois en une ligne dessous. Plus de tableau à
  // trois colonnes (« relevé de banque »).
  return (
    <Link
      href="/dashboard/bilan"
      aria-label={`À encaisser : ${euros(aEncaisser.total)} TTC${retard ? `, dont ${retard}` : ""}. ${nomMois} : ${euros(signe)} signés, ${euros(encaisse)} encaissés. Voir le bilan.`}
      className="mt-4 block rounded-[20px] bg-surface p-5 ombre-douce active:bg-ink/[0.03] sm:hover:bg-ink/[0.02] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-steel">À encaisser</span>
        <span className="text-[13px] text-steel">TTC · Bilan ›</span>
      </span>
      <span className="mt-1 block whitespace-nowrap font-display text-[2rem] font-bold leading-10 tracking-[-0.03em] tabular-nums text-ink min-[400px]:text-[2.25rem]">
        {euros(aEncaisser.total)}
      </span>
      {retard && (
        <span className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-signal-fonce">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-signal" />
          dont {retard}
        </span>
      )}
      <span className="mt-4 block border-t border-gris-clair pt-3 text-[15px] leading-snug text-steel">
        {nomMois.charAt(0).toUpperCase() + nomMois.slice(1)} : {/* 25/10 — chaque montant reste collé à son mot : la ligne se coupe
            au « · », jamais avant « encaissés ». */}
        <span className="whitespace-nowrap"><span className="font-semibold tabular-nums text-ink">{euros(signe)}</span> signés</span> ·{" "}
        <span className="whitespace-nowrap"><span className="font-semibold tabular-nums text-succes">{euros(encaisse)}</span> encaissés</span>
      </span>
    </Link>
  );
}
