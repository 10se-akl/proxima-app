// La priorité d'un projet, dite partout de la même façon (25/10) : un point
// de 8 px et le mot, en couleur. Avant : une pastille sur la fiche, un point
// dans les listes. « Urgent » en terracotta foncé, « Important » en orange :
// deux couleurs franchement distinctes (la légende du planning les confondait).
export function Priorite({ niveau, className = "" }: { niveau: "urgent" | "important" | string | null | undefined; className?: string }) {
  if (niveau !== "urgent" && niveau !== "important") return null;
  const urgent = niveau === "urgent";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold ${
        urgent ? "text-signal-fonce" : "text-alerte-orange"
      } ${className}`}
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${urgent ? "bg-signal" : "bg-alerte-orange"}`} />
      {urgent ? "Urgent" : "Important"}
    </span>
  );
}
