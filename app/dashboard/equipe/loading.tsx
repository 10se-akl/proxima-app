import { Skeleton, SkeletonCarte } from "@/components/ui/Skeleton";

export default function ChargementEquipe() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-4 w-72 mt-2" />
      <div className="mt-6 flex flex-col gap-2.5">
        <SkeletonCarte />
        <SkeletonCarte />
      </div>
    </div>
  );
}
