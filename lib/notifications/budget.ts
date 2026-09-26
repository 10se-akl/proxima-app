import type { SupabaseClient } from "@supabase/supabase-js";
import { AVERTISSEMENT_BROUILLON } from "@/lib/relances/templates";
import { aujourdhuiParis, minuitParis } from "@/lib/moisParis";
import { envoyerPush } from "./push";

// ============================================================
// Le budget de notifications (26/09 — « moins mais mieux », lot H.1).
//
// Une notification non urgente par artisan et par jour, au plus. Les
// rappels que l'artisan a programmés lui-même (app/api/cron/rappels) ne
// comptent pas : c'est lui qui les a demandés.
//
// Avant : une notification par devis (J+5, J+10) et une par facture, au
// même passage du cron — cinq devis et deux factures arrivés à échéance le
// même jour faisaient sept notifications d'affilée, et le tout premier
// passage après la mise en route pouvait en envoyer des dizaines.
//
// Maintenant, les deux crons de relance passent par ici :
//   - un passage regroupe tout ce qu'il a préparé pour un même artisan en
//     UNE notification (« 3 relances à préparer ») ;
//   - si une relance a déjà été préparée plus tôt dans la journée (par
//     l'autre cron, ou un passage précédent), pas de nouvelle
//     notification : la note existe, elle se voit dans l'application.
// Aucune migration : chaque relance crée déjà une note dont la
// description commence par AVERTISSEMENT_BROUILLON — c'est la trace.
// Aucun changement d'horaire côté cron-job.org.
// ============================================================

export type RelancePreparee = {
  artisanId: string;
  nomClient?: string;
  titre: string;
  corps: string;
  url: string;
};

// Sans virgule (les filtres PostgREST n'aiment pas les virgules) : le
// début de l'avertissement suffit à reconnaître une note de relance.
const DEBUT_AVERTISSEMENT = AVERTISSEMENT_BROUILLON.split(".")[0];

/** Une seule notification pour plusieurs relances. Pure : testable. */
export function notificationGroupee(liste: RelancePreparee[]): { titre: string; corps: string; url: string } {
  if (liste.length === 1) {
    const [r] = liste;
    return { titre: r.titre, corps: r.corps, url: r.url };
  }
  const noms = Array.from(new Set(liste.map((r) => r.nomClient).filter((n): n is string => Boolean(n))));
  const cites = noms.slice(0, 2);
  // Les relances des clients déjà cités ne comptent pas dans « et N autres ».
  const autres = liste.filter((r) => !r.nomClient || !cites.includes(r.nomClient)).length;
  const qui =
    cites.length === 0
      ? ""
      : autres > 0
        ? `${cites.join(", ")} et ${autres} autre${autres > 1 ? "s" : ""}`
        : cites.join(" et ");
  return {
    titre: `${liste.length} relances à préparer`,
    corps: qui ? `${qui} — les brouillons vous attendent.` : "Les brouillons vous attendent.",
    // L'accueil les liste dans « En attente du client », avec « Relancer ».
    url: "/dashboard",
  };
}

export async function notifierRelances(
  supabase: SupabaseClient,
  relances: RelancePreparee[],
  debutPassage: Date
): Promise<void> {
  const parArtisan = new Map<string, RelancePreparee[]>();
  for (const r of relances) parArtisan.set(r.artisanId, [...(parArtisan.get(r.artisanId) ?? []), r]);

  const jour = aujourdhuiParis(debutPassage);
  const minuit = minuitParis(jour.annee, jour.mois, jour.jour);

  await Promise.allSettled(
    Array.from(parArtisan.entries()).map(async ([artisanId, liste]) => {
      try {
        const { count, error } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("artisan_id", artisanId)
          .like("description", `${DEBUT_AVERTISSEMENT}%`)
          .gte("created_at", minuit.toISOString())
          .lt("created_at", debutPassage.toISOString());
        // En cas d'erreur de lecture, on notifie : mieux vaut une
        // notification de trop qu'une relance que personne ne voit.
        if (!error && (count ?? 0) > 0) return;
        await envoyerPush(supabase, { artisanId, ...notificationGroupee(liste) });
      } catch (err) {
        // La note existe déjà : un push manqué ne doit rien faire échouer.
        console.error("Notification de relance non envoyée (les notes existent)", artisanId, err);
      }
    })
  );
}
