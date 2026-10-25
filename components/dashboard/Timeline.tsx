import { dateEtHeure } from "@/lib/heure";

const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
export type TimelineItem = {
  date: string;
  label: string;
  detail?: string;
};

// Composant purement visuel, réutilisable partout où un fil chronologique
// est utile (fiche projet aujourd'hui, autre écran demain). Ne sait rien
// de la provenance des données : le tri et les libellés sont décidés en
// amont (voir lib/timeline.ts et app/dashboard/demandes/[id]/page.tsx).
export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    // Design v3 (24/10) : le gris de texte unique, plus d'opacité d'encre.
    return <p className="text-[15px] text-steel">Aucun événement pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 text-[15px]">
          <span className="w-32 shrink-0 tabular-nums text-steel">
            {dateEtHeure(item.date, JOUR_MOIS)}
          </span>
          <div>
            <p className="text-ink">{item.label}</p>
            {item.detail && <p className="mt-0.5 text-sm text-steel">{item.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
