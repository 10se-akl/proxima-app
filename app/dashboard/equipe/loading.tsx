import { SquelettePage } from "@/components/ui/Skeleton";

// Design v3 (24/10) : /dashboard/equipe mène à Paramètres › Équipe ; le
// squelette est celui des Paramètres (titre, carte de lignes).
export default function ChargementEquipe() {
  return <SquelettePage lignes={4} />;
}
