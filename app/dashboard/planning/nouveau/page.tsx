import { redirect } from "next/navigation";
import FormulaireRdv from "./FormulaireRdv";

// Refonte (03/10, duel G, lot 3) — le formulaire reste pour « Modifier »
// (?eventId=), pour les tâches et pour « Autre… » (?date=). Mais cinq portes
// y menaient depuis un projet pour planifier un rendez-vous (la fiche, À
// confirmer, la clôture, la confirmation d'un rendez-vous) : elles passent
// maintenant par « Planifier » en trois appuis, sur le planning, sans qu'un
// seul de leurs fichiers change. ?formulaire=1 garde l'accès direct au
// formulaire, projet prérempli (titre, jour, heure).
export default function NouvelEvenementPage({
  searchParams,
}: {
  searchParams?: { projetId?: string; eventId?: string; formulaire?: string };
}) {
  if (searchParams?.projetId && !searchParams.eventId && !searchParams.formulaire) {
    redirect(`/dashboard/planning?projetId=${encodeURIComponent(searchParams.projetId)}`);
  }
  return <FormulaireRdv />;
}
