import { Skeleton } from "@/components/ui/Skeleton";

export default function ChargementPlanning() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="mt-6 h-[420px] rounded-2xl" />
    </div>
  );
}
