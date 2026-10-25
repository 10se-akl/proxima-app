import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EnTetePage } from "@/components/ui/EnTetePage";
import { BOUTON_CREUX, BOUTON_ICONE, BOUTON_PLEIN } from "@/components/ui/recettes";
import { IconeChevron, IconeCoche } from "@/components/projet/icones";
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
  // 25/10 : espaces insécables, la date ne se coupe pas entre le jour et le mois.
  const libelleSemaine = `${numeroDuJour(premier)}\u00a0${nomDuMois(premier)} —\u00a0${numeroDuJour(dernier)}\u00a0${nomDuMois(dernier)}`;

  return (
    <div className="mx-auto px-4 pt-5 pb-8 sm:p-8 max-w-5xl lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10">
      <PlanifierDepuisLien projet={projetAPlanifier} />

      {searchParams.rdvCree === "1" && (
        // Design v3 (24/10) : teinte opaque (succes-fond), plus de contour ni d'encre pâlie.
        <div className="mb-4 flex items-start gap-3 rounded-[20px] bg-succes-fond px-4 py-3 text-[15px] text-ink">
          <IconeCoche className="mt-0.5 h-5 w-5 shrink-0 text-succes" />
          <p>Un rendez-vous a été ajouté au planning à partir du message du client.</p>
        </div>
      )}

      {/* Le titre posé sur le fond (EnTetePage). Sur ordinateur, la semaine
          et ses flèches y vivent ; sur téléphone, les sept jours glissants
          gardent leurs flèches juste en dessous.
          Design v3 (24/10) : flèches en BOUTON_ICONE, « Aujourd'hui » en
          creux, « + Ajouter » seul plein de l'écran. */}
      <EnTetePage
        titre="Planning"
        sousTitre={<span className="hidden lg:inline">{libelleSemaine}</span>}
        actions={
          <>
            <Link
              href={`/dashboard/planning?semaine=${offset - 1}`}
              aria-label="Semaine précédente"
              className={`hidden lg:grid ${BOUTON_ICONE}`}
            >
              <IconeChevron className="h-5 w-5 rotate-180" />
            </Link>
            <Link href="/dashboard/planning" className={`hidden lg:inline-flex ${BOUTON_CREUX}`}>
              Aujourd&apos;hui
            </Link>
            <Link
              href={`/dashboard/planning?semaine=${offset + 1}`}
              aria-label="Semaine suivante"
              className={`hidden lg:grid ${BOUTON_ICONE}`}
            >
              <IconeChevron className="h-5 w-5" />
            </Link>
            <Link href="/dashboard/planning/nouveau" className={BOUTON_PLEIN}>
              + Ajouter
            </Link>
          </>
        }
      />

      {/* Téléphone : la semaine en sept lignes (sept jours glissants à partir
          d'aujourd'hui). La grille de la semaine reste pour l'ordinateur.
          13/10 — à partir de 1024 px : en dessous, avec la barre latérale,
          chaque jour de la grille n'avait que 60 à 100 px de large. */}
      <div className="lg:hidden">
        <div className="mt-3">
          <AgendaMobile key={offset} jours={joursGlissants} evenements={dans(glissante)} meteoParJour={alertesMeteo} offset={offset} />
        </div>
      </div>

      <div className="hidden lg:block">
        {/* Design v3 (24/10) : la légende en hexadécimal (pastilles rouge,
            orange, vert) faisait doublon avec celle de la grille
            (GrilleAgenda, LEGENDE, en jetons) et ne prenait pas les mêmes
            couleurs : retirée. Reste la phrase météo, quand elle sert. */}
        {Object.values(alertesMeteo).some((m) => m.risque) && (
          <p className="mt-5 text-[15px] text-steel">
            <span className="font-semibold text-signal-fonce">Météo à risque</span> sur un chantier extérieur&nbsp;:
            cliquez le rendez-vous pour prévenir le client.
          </p>
        )}

        {/* Audit pré-bêta (09/09), point 🟡 n°24 — convention calendrier
            standard : sans ce message, une semaine vide donnait une grille
            totalement nue sans confirmer que c'est bien "rien de prévu" et
            pas un chargement raté. */}
        {evenementsSemaine.length === 0 && (
          <p className="mt-4 text-[15px] text-steel">Rien de prévu cette semaine.</p>
        )}

        <div className="mt-5">
          <GrilleAgenda jours={joursSemaine} evenements={evenementsSemaine} meteoParJour={alertesMeteo} />
        </div>
      </div>
    </div>
  );
}
