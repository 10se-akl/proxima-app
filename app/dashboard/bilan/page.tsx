import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/organisation";
import { calculerActivite } from "@/lib/activite";
import { estimerTempsGagne } from "@/lib/bilan-mensuel";
import { avant, bornes, depuisCle, memeMois, moisCourant } from "@/lib/moisParis";
import { VueBilan } from "@/components/dashboard/VueBilan";

// ============================================================
// Le bilan (refonte du 21/09).
//
// Ce qui a changé, et pourquoi :
//   - la page s'ouvre sur le MOIS EN COURS, pas sur le mois précédent.
//     Un artisan qui vient d'accepter deux devis veut les voir ; lui
//     montrer août le 21 septembre, c'était lui dire que rien ne s'était
//     passé ;
//   - on navigue de mois en mois (‹ ›), et l'email mensuel ouvre
//     directement le mois dont il parle (?mois=2026-08) ;
//   - chaque chiffre se compare au mois précédent, À PÉRIODE ÉGALE quand
//     le mois est en cours (du 1er au 21 contre du 1er au 21) ;
//   - six mois d'historique en barres, ce qui reste à encaisser, et les
//     chantiers terminés avec leur montant par jour de chantier — la
//     réponse honnête à « où ai-je passé trop de temps pour trop peu ».
//
// Ce qui n'a pas changé : le ton. Pas de « Bravo ! », pas de flèche rouge
// alarmiste, pas de chiffre qui ne se vérifie pas. Une baisse s'affiche
// en gris, pas en rouge : un mois calme n'est pas une faute.
// ============================================================

export default async function BilanPage({ searchParams }: { searchParams: { mois?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  if (!organisationId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-sm text-ink/50">Aucune organisation associée à ce compte.</p>
      </div>
    );
  }

  const courant = moisCourant();
  const demande = depuisCle(searchParams.mois);
  // Un mois futur n'a rien à montrer : on retombe sur le mois en cours.
  const mois = demande && !avant(courant, demande) ? demande : courant;
  const { debut, fin } = bornes(mois);

  const [activite, temps] = await Promise.all([
    calculerActivite(supabase, organisationId, mois),
    estimerTempsGagne(supabase, organisationId, debut, finDuDecompte(mois, fin)),
  ]);

  return <VueBilan activite={activite} temps={temps} mois={mois} courant={courant} />;
}

// Le temps gagné du mois en cours s'arrête à maintenant : rien ne se
// compte dans le futur.
function finDuDecompte(mois: ReturnType<typeof moisCourant>, fin: Date): Date {
  return memeMois(mois, moisCourant()) ? new Date() : fin;
}
