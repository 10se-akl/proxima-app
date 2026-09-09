import { Skeleton } from "@/components/ui/Skeleton";

export default function ChargementBilan() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-40 mt-2" />

      <div className="mt-6 rounded-2xl border border-ink/10 p-6 flex flex-col gap-6">
        <div>
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-8 w-32 mt-2" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-10 mt-2" />
          </div>
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-10 mt-2" />
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-6 w-16 mt-2" />
        </div>
      </div>
    </div>
  );
}
