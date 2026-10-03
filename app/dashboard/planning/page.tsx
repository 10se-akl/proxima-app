import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { GrilleAgenda } from "@/components/planning/GrilleAgenda";
import { AgendaMobile } from "@/components/planning/AgendaMobile";
import { PlanifierDepuisLien } from "@/components/planning/PlanifierDepuisLien";
import { getOrganisationId } from "@/lib/organisation";
import { recupererAlertesMeteoSemaine } from "@/lib/meteo";
import {
  fenetreGlissante,
  fenetreSemaine,
  instantParis,
  nomDuMois,
  numeroDuJour,
  type Fenetre,
} from "@/components/planning/semaine";

// Plus loin que deux ans dans un sens ou dans l'autre, ce n'est plus un
// planning : un `?semaine=` absurde ne doit pas produire de dates absurdes.
const OFFSET_MAX = 104;

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: { semaine?: string; rdvCree?: string; projetId?: string };
}) {
  // Refonte (03/10, duel G lot 2) — le serveur tourne en UTC : « aujourd'hui »,
  // le lundi et minuit se calculaient à deux heures près l'été, et la
  // fenêtre se trompait de jour entre minuit et 2 h. Tout passe maintenant
  // par l'heure de Paris (components/planning/semaine.ts).
  const brut = Math.trunc(Number(searchParams.semaine ?? "0"));
  const offset = Number.isFinite(brut) ? Math.max(-OFFSET_MAX, Math.min(OFFSET_MAX, brut)) : 0;
  const maintenant = new Date();
  // Téléphone : sept jours glissants à partir d'aujourd'hui (?semaine= avance
  // de sept jours). Ordinateur : la semaine du lundi au dimanche (?semaine=
  // avance d'une semaine). Une seule requête couvre les deux.
  const glissante = fenetreGlissante(maintenant, offset);
  const calendaire = fenetreSemaine(maintenant, offset);
  const debut = new Date(Math.min(glissante.debut.getTime(), calendaire.debut.getTime()));
  const fin = new Date(Math.max(glissante.fin.getTime(), calendaire.fin.getTime()));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  // Audit performance (11/09) — les deux requêtes ci-dessous sont
  // indépendantes (seule l'appel météo, plus bas, dépend du résultat de la
  // seconde) : lancées en parallèle plutôt qu'en série, un aller-retour
  // réseau économisé à chaque ouverture du planning.
  const [{ data: evenementsBrut }, { data: parametres }] = await Promise.all([
    supabase
      .from("evenements_planning")
      .select("*, demandes(nom_client, priorite, type_chantier, telephone_client, adresse_client)")
      .eq("organisation_id", organisationId)
      .gte("date_heure", debut.toISOString())
      .lt("date_heure", fin.toISOString())
      .neq("statut", "annule")
      .order("date_heure", { ascending: true }),
    // Alerte météo (06/09) — approximation par la ville du siège de
    // l'entreprise, voir lib/meteo.ts pour le raisonnement.
    supabase.from("parametres_entreprise").select("adresse").eq("organisation_id", organisationId).maybeSingle(),
  ]);

  // Supabase type "demandes(...)" comme un tableau (relation jointe), même
  // si demande_id ne pointe jamais vers plus d'un projet — on aplatit pour
  // correspondre au type attendu par GrilleAgenda (voir même remarque dans
  // app/dashboard/page.tsx et app/dashboard/devis/page.tsx).
  const evenements = (evenementsBrut ?? []).map((e) => ({
    ...e,
    demandes: Array.isArray(e.demandes) ? e.demandes[0] ?? null : e.demandes,
  }));
  const dans = (f: Fenetre) =>
    evenements.filter((e) => {
      const t = Date.parse(e.date_heure);
      return t >= f.debut.getTime() && t < f.fin.getTime();
    });

  // ?projetId= (la fiche, À confirmer, la clôture…) : « Planifier » s'ouvre,
  // déjà remplie pour ce projet (components/planning/PlanifierDepuisLien.tsx).
  // Un identifiant qui n'a pas la forme d'un uuid n'interroge rien.
  const idProjet = searchParams.projetId && /^[0-9a-f-]{36}$/i.test(searchParams.projetId) ? searchParams.projetId : null;
  const { data: projetAPlanifier } = idProjet
    ? await supabase
        .from("demandes")
        .select("id, nom_client, type_chantier")
        .eq("id", idProjet)
        .eq("organisation_id", organisationId)
        .maybeSingle()
    : { data: null };

  const alertesMeteoBrut = await recupererAlertesMeteoSemaine(parametres?.adresse);
  const alertesMeteo = Object.fromEntries(alertesMeteoBrut);

  const joursGlissants = glissante.jours.map((c) => instantParis(c));
  const joursSemaine = calendaire.jours.map((c) => instantParis(c));
  const evenementsSemaine = dans(calendaire);
  const premier = calendaire.jours[0];
  const dernier = calendaire.jours[6];
  const libelleSemaine = `${numeroDuJour(premier)} ${nomDuMois(premier)} — ${numeroDuJour(dernier)} ${nomDuMois(dernier)}`;

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-5xl">
      <PlanifierDepuisLien projet={projetAPlanifier} />

      {searchParams.rdvCree === "1" && (
        <div className="mb-4 rounded-xl bg-succes/10 border border-succes/30 px-4 py-3 text-sm text-ink/80">
          ✓ Un rendez-vous a été ajouté au planning à partir du message du client.
        </div>
      )}

      {/* Téléphone : la semaine en sept lignes (sept jours glissants à partir
          d'aujourd'hui). La grille de la semaine reste pour l'ordinateur. */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">Planning</h1>
          <Link
            href="/dashboard/planning/nouveau"
            className="inline-flex min-h-12 items-center rounded-full px-4 text-base font-semibold text-ink ring-1 ring-inset ring-ink/60 active:bg-ink/10"
          >
            + Ajouter
          </Link>
        </div>
        <div className="mt-2">
          <AgendaMobile key={offset} jours={joursGlissants} evenements={dans(glissante)} meteoParJour={alertesMeteo} offset={offset} />
        </div>
      </div>

      <div className="hidden sm:block">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Planning</h1>
          <p className="mt-1 text-sm text-ink/50">{libelleSemaine}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/planning?semaine=${offset - 1}`}>
            <Button variant="ghost">← Semaine préc.</Button>
          </Link>
          <Link href="/dashboard/planning">
            <Button variant="ghost">Aujourd&apos;hui</Button>
          </Link>
          <Link href={`/dashboard/planning?semaine=${offset + 1}`}>
            <Button variant="ghost">Semaine suiv. →</Button>
          </Link>
          <Link href="/dashboard/planning/nouveau">
            <Button>+ Ajouter</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4 text-xs text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C23B22]" /> Urgent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D9861A]" /> Important
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2F8F5B]" /> Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-ink/40" /> Tâche sans projet
        </span>
        {Object.values(alertesMeteo).some((m) => m.risque) && (
          <span className="flex items-center gap-1.5">
            ⚠️ Météo à risque sur un chantier extérieur — cliquez le rendez-vous pour prévenir le client
          </span>
        )}
      </div>

      {/* Audit pré-bêta (09/09), point 🟡 n°24 — convention calendrier
          standard : sans ce message, une semaine vide donnait une grille
          totalement nue sans confirmer que c'est bien "rien de prévu" et
          pas un chargement raté. */}
      {evenementsSemaine.length === 0 && (
        <p className="mt-4 text-sm text-ink/40">Rien de prévu cette semaine.</p>
      )}

      <div className="mt-4">
        <GrilleAgenda jours={joursSemaine} evenements={evenementsSemaine} meteoParJour={alertesMeteo} />
      </div>
      </div>
    </div>
  );
}
