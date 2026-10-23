import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

// ============================================================
// Une ligne de devis ou de facture (22/10, panel de 18 faux clients).
//
// Sur téléphone, la ligne compacte d'avant : le client et le montant, puis
// le numéro, la date et l'état. Sur ordinateur (1024 px et plus), un vrai
// tableau : Client · Date · État · Montant TTC, avec l'en-tête de colonnes
// (EnTeteColonnes) — « une liste de téléphone étirée » ne se lisait pas
// pour celles et ceux qui font les papiers sur un grand écran.
// ============================================================

/** Les colonnes du tableau, partagées par l'en-tête et les lignes. */
const COLONNES = "lg:grid lg:grid-cols-[minmax(0,1fr)_8.5rem_10.5rem_9rem] lg:gap-4";

export const formatEuros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function EnTeteColonnes() {
  return (
    <div
      aria-hidden
      className={`hidden px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-steel ${COLONNES}`}
    >
      <span>Client</span>
      <span>Date</span>
      <span>État</span>
      <span className="text-right">Montant TTC</span>
    </div>
  );
}

export function LigneDocument({
  href,
  client,
  numero,
  date,
  montant,
  etat,
}: {
  href: string;
  client: string;
  /** « D-2026-087 », « Acompte F-2026-031 »… */
  numero: string;
  /** « envoyé le 16 oct. », « émise le 2 oct. ». */
  date: string;
  /** TTC. */
  montant: number;
  etat: { texte: string; classe: string };
}) {
  // « envoyé le 16 oct. » → « 16 oct. » sur téléphone : la place manque.
  const dateCourte = date.replace(/^\S+ le /, "");
  const pastille = <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${etat.classe}`}>{etat.texte}</span>;
  return (
    <Link
      href={href}
      className={`flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink lg:items-center ${COLONNES}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar nom={client} taille={40} carre />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-base font-semibold text-ink">{client}</span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink lg:hidden">
              {formatEuros(montant)} <span className="text-xs font-normal text-steel">TTC</span>
            </span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-3">
            {/* Sur téléphone, la date d'abord (« 16 oct. ») : c'est le
                numéro qui se coupe s'il manque de place, jamais la date. */}
            <span className="truncate text-sm text-steel">
              <span className="lg:hidden">{dateCourte} · </span>
              {numero}
            </span>
            <span className="shrink-0 lg:hidden">{pastille}</span>
          </span>
        </span>
      </span>
      <span className="hidden text-sm text-steel lg:block">{date}</span>
      <span className="hidden lg:block">{pastille}</span>
      <span className="hidden text-right text-base font-semibold tabular-nums text-ink lg:block">{formatEuros(montant)}</span>
    </Link>
  );
}
