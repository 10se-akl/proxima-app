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
    return <p className="text-sm text-ink/40">Aucun événement pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <span className="font-mono text-xs text-ink/40 w-32 shrink-0 pt-0.5">
            {new Date(item.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <div>
            <p className="text-ink/80">{item.label}</p>
            {item.detail && <p className="text-ink/50 text-xs mt-0.5">{item.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
