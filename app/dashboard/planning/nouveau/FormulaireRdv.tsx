"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { Avatar } from "@/components/ui/Avatar";
import {
  BOUTON_CREUX,
  BOUTON_ICONE,
  BOUTON_PLEIN_LARGE,
  BOUTON_TEXTE,
  CARTE_PLEINE,
  CHAMP,
  ERREUR,
  LIBELLE,
  TITRE_ECRAN,
  puce,
} from "@/components/ui/recettes";
import { EtatErreur } from "@/components/ui/EtatErreur";
import type { TypeEvenement, Priorite } from "@/types";
import { SquelettePage } from "@/components/ui/Skeleton";
import { FeuilleMessageClient } from "@/components/projet/FeuilleMessageClient";
import { chargerCreneauParDefaut, titreParDefaut } from "@/components/planning/creneau";
import { cheminPrecedent, revenir } from "@/components/navigation/LienPrecedent";

type ProjetLeger = { id: string; nom_client: string; priorite: Priorite; type_chantier: string | null };

// Audit "vérification systématique" (10/09) — trouvé par un agent de
// recherche : les deux endroits qui préremplissaient date/heure à partir
// d'un `Date` (édition d'un événement existant, ou reprise du dernier RDV
// du projet choisi) utilisaient `toISOString()` (UTC) pour la date mais
// `toTimeString()` (heure locale du navigateur) pour l'heure — deux
// fuseaux différents dans le même formulaire. Pour un événement entre
// minuit et ~2h heure de Paris, la date UTC est encore celle de la veille :
// le champ "date" affichait alors le mauvais jour. Même logique locale
// pour les deux champs, cohérente avec l'heure réellement affichée à
// l'artisan (voir même idiome dans components/planning/GrilleAgenda.tsx,
// cleDateLocale).
function dateLocaleAAAAMMJJ(d: Date): string {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

// Next.js exige que tout composant utilisant useSearchParams() soit
// entouré d'une frontière <Suspense> — sinon le pré-rendu statique échoue
// au build (visible seulement au déploiement, pas en dev local).
export default function FormulaireRdv() {
  return (
    <Suspense fallback={null}>
      <NouvelEvenementForm />
    </Suspense>
  );
}

function NouvelEvenementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  // Les libellés reliés à leurs champs (Design v3, 24/10 : champs natifs
  // aux recettes CHAMP / LIBELLE au lieu de Field / TextareaField).
  const idTitre = useId();
  const idDate = useId();
  const idHeure = useId();
  const idNotes = useId();

  const eventId = searchParams.get("eventId");
  const enModeEdition = Boolean(eventId);

  const [type, setType] = useState<TypeEvenement>("rendez_vous");
  const [titre, setTitre] = useState("");
  // Refonte (03/10, duel G) — `?date=AAAA-MM-JJ` : le jour touché sur le
  // planning (« + » d'un jour vide, puis « Autre… »).
  const [date, setDate] = useState(() => {
    const d = searchParams.get("date");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  });
  const [heure, setHeure] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState(60);
  const [demandeId, setDemandeId] = useState(searchParams.get("projetId") ?? "");
  const [notes, setNotes] = useState("");
  const [projets, setProjets] = useState<ProjetLeger[]>([]);
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [chargementInitial, setChargementInitial] = useState(enModeEdition);
  const [erreur, setErreur] = useState<string | null>(null);
  // Refonte (02/10, duel G lot 1) — la date d'origine, pour proposer de
  // prévenir le client quand « Modifier » la change.
  const [dateHeureInitiale, setDateHeureInitiale] = useState<string | null>(null);
  const [prevenir, setPrevenir] = useState<{ demandeId: string; ancienneDate: string; nouvelleDate: string } | null>(null);
  // Sprint Robustesse (30/08) — erreur dédiée au chargement initial de
  // l'événement en édition (distincte de `erreur`, qui concerne la
  // soumission du formulaire) : elle affiche <EtatErreur /> à la place du
  // formulaire au lieu de laisser la page bloquée sur "Chargement…".
  const [erreurChargement, setErreurChargement] = useState(false);

  useEffect(() => {
    async function chargerProjets() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const organisationId = await getOrganisationId(supabase, user.id);
      const { data } = await supabase
        .from("demandes")
        .select("id, nom_client, priorite, type_chantier")
        .eq("organisation_id", organisationId)
        .neq("statut", "termine")
        .order("created_at", { ascending: false });
      const liste = (data as ProjetLeger[]) ?? [];

      // Refonte (03/10, duel G lot 1) — `?projetId=` ne se contentait que de
      // lier le projet : le titre, le jour et l'heure restaient vides, alors
      // que trois portes mènent ici depuis un projet (À confirmer, clôture,
      // confirmation de rendez-vous). On rejoue ce que fait le choix d'un
      // projet dans la liste. Un projet terminé n'est pas dans la liste (un
      // SAV après la clôture) : on le lit directement.
      const projetParam = searchParams.get("projetId");
      let depuisLien = projetParam ? liste.find((p) => p.id === projetParam) : undefined;
      if (projetParam && !depuisLien && !eventId) {
        const { data: unique } = await supabase
          .from("demandes")
          .select("id, nom_client, priorite, type_chantier")
          .eq("id", projetParam)
          .maybeSingle();
        if (unique) {
          depuisLien = unique as ProjetLeger;
          liste.unshift(depuisLien);
        }
      }
      setProjets(liste);
      if (depuisLien && !eventId) await choisirProjet(depuisLien);
    }
    chargerProjets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En mode édition, on précharge l'événement existant.
  useEffect(() => {
    if (!eventId) return;
    async function chargerEvenement() {
      setChargementInitial(true);
      setErreurChargement(false);
      // Sprint Robustesse (30/08) — 🔴 sans try/catch, une coupure réseau
      // ici (ou toute erreur Supabase) laissait la page bloquée sur
      // "Chargement…" pour toujours : aucun retour, aucun moyen de
      // réessayer. On affiche désormais <EtatErreur /> à la place du
      // formulaire, avec un bouton pour relancer le chargement.
      try {
        const { data, error } = await supabase
          .from("evenements_planning")
          .select("*")
          .eq("id", eventId)
          .single();

        if (error || !data) {
          setErreurChargement(true);
          return;
        }

        setType(data.type);
        setTitre(data.titre);
        setDateHeureInitiale(data.date_heure);
        const d = new Date(data.date_heure);
        setDate(dateLocaleAAAAMMJJ(d));
        setHeure(d.toTimeString().slice(0, 5));
        setDureeMinutes(data.duree_minutes ?? 60);
        setDemandeId(data.demande_id ?? "");
        setNotes(data.notes ?? "");
      } catch {
        setErreurChargement(true);
      } finally {
        setChargementInitial(false);
      }
    }
    chargerEvenement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const projetSelectionne = projets.find((p) => p.id === demandeId);

  async function choisirProjet(p: ProjetLeger) {
    setDemandeId(p.id);
    setSelecteurOuvert(false);
    if (!titre.trim()) {
      // Le client et le type du chantier (« Chantier Dupont · Salle de bain »).
      setTitre(titreParDefaut(p.nom_client, p.type_chantier));
    }

    // Avant : la date du prochain rendez-vous du projet, c'est-à-dire un
    // créneau déjà pris par ce même projet. Maintenant : demain, à l'heure
    // et pour la durée du dernier rendez-vous du projet, sinon 8 h pour 1 h
    // (voir components/planning/creneau.ts).
    if (!enModeEdition) {
      const c = await chargerCreneauParDefaut(supabase, p.id);
      setDate((d) => d || c.jour);
      setHeure((h) => h || c.heure);
      setDureeMinutes((m) => (m === 60 ? c.duree : m));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    // Sprint Robustesse (30/08) — repéré en revue de régression : toute la
    // fonction manquait d'un filet try/catch. Les branches d'erreur
    // "propres" (Supabase renvoie { error }) remettaient déjà bien
    // `chargement` à false, mais une exception brute (réseau coupé en
    // plein milieu d'un `await`) n'était rattrapée nulle part et laissait
    // le bouton bloqué sur "Enregistrement…" pour toujours — exactement
    // le défaut de classe que ce sprint corrige ailleurs (voir
    // NotesVocales.tsx, la fiche projet...).
    try {
      await soumettre(e);
    } catch {
      setErreur("Connexion perdue. Réessayez.");
      setChargement(false);
    }
  }

  async function soumettre(e: React.FormEvent) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !date || !heure) {
      setErreur("Merci de remplir la date et l'heure.");
      setChargement(false);
      return;
    }

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) {
      setErreur("Impossible de déterminer votre organisation. Réessayez ou contactez le support.");
      setChargement(false);
      return;
    }

    const debut = new Date(`${date}T${heure}`);
    const fin = new Date(debut.getTime() + (type === "rendez_vous" ? dureeMinutes : 15) * 60000);

    // Un rendez-vous ou une tâche à créer ne peut pas être daté dans le
    // passé — ça n'aurait aucun sens. On ne bloque en revanche jamais la
    // modification d'un événement déjà existant : corriger ou marquer
    // terminé un rendez-vous d'il y a trois jours doit rester possible.
    if (!enModeEdition && debut.getTime() < Date.now()) {
      setErreur("Impossible de planifier un événement à une date déjà passée.");
      setChargement(false);
      return;
    }

    // Audit pré-bêta (09/09), point 🟡 n°22 — aucune validation sur la
    // durée : 0, une valeur négative, ou un champ vidé (Number("") = 0)
    // passaient tous silencieusement, produisant un rendez-vous "instantané"
    // sur le planning.
    if (type === "rendez_vous" && (!Number.isFinite(dureeMinutes) || dureeMinutes <= 0)) {
      setErreur("La durée doit être supérieure à 0 minute.");
      setChargement(false);
      return;
    }
    // Audit "vérification systématique" (10/09) — trouvé par un agent de
    // recherche : aucun plafond, donc un rendez-vous saisi par erreur en
    // minutes au lieu d'heures (ou un simple faux clic) produisait un bloc
    // dont la hauteur (voir GrilleAgenda.tsx, HAUTEUR_HEURE * dureeMin/60)
    // dépassait largement la grille et débordait visuellement sur le reste
    // de la page. 1440 min = 24h, largement suffisant pour une intervention
    // exceptionnelle sur un seul jour ; au-delà, ça ressemble à une erreur
    // de saisie plutôt qu'à un vrai rendez-vous.
    if (type === "rendez_vous" && dureeMinutes > 1440) {
      setErreur("La durée d'un rendez-vous ne peut pas dépasser 24h (1440 minutes).");
      setChargement(false);
      return;
    }

    // Un artisan ne peut pas être à deux chantiers en même temps — on
    // exclut l'événement en cours d'édition de cette vérification.
    if (type === "rendez_vous") {
      const debutJour = new Date(date);
      debutJour.setHours(0, 0, 0, 0);
      const finJour = new Date(date);
      finJour.setHours(23, 59, 59, 999);

      const { data: evenementsJour, error: erreurConflit } = await supabase
        .from("evenements_planning")
        .select("id, titre, date_heure, duree_minutes")
        .eq("organisation_id", organisationId)
        .eq("type", "rendez_vous")
        .neq("statut", "annule")
        .gte("date_heure", debutJour.toISOString())
        .lte("date_heure", finJour.toISOString());

      // Sprint Robustesse (30/08) — 🔴 même correctif que
      // ConfirmationRdv.tsx : ne jamais traiter une vérification de
      // conflit échouée comme "aucun conflit".
      if (erreurConflit) {
        setErreur("Impossible de vérifier les créneaux déjà pris. Réessayez.");
        setChargement(false);
        return;
      }

      const conflit = (evenementsJour ?? [])
        .filter((ev) => ev.id !== eventId)
        .find((ev) => {
          const debutExistant = new Date(ev.date_heure);
          const finExistant = new Date(
            debutExistant.getTime() + (ev.duree_minutes ?? 60) * 60000
          );
          return debut < finExistant && fin > debutExistant;
        });

      if (conflit) {
        // Refonte (03/10, duel G lot 1) — le même mot partout (voir aussi
        // FeuilleDeplacer) : on ne dit plus « par quelqu'un d'autre de votre
        // équipe », ce qui laissait croire à un « Pour qui ? » qui n'existe
        // pas. La protection est celle de l'entreprise entière.
        setErreur("Déjà pris à cette heure.");
        setChargement(false);
        return;
      }
    }

    const dateHeure = debut.toISOString();
    const donnees = {
      demande_id: demandeId || null,
      titre,
      type,
      date_heure: dateHeure,
      duree_minutes: type === "rendez_vous" ? dureeMinutes : null,
      notes: notes || null,
    };

    const { error } = enModeEdition
      ? await supabase.from("evenements_planning").update(donnees).eq("id", eventId)
      : await supabase
          .from("evenements_planning")
          .insert({ ...donnees, artisan_id: user.id, organisation_id: organisationId });

    if (error) {
      // Audit pré-bêta (09/09), point 🟠 n°11 — la vérification de conflit
      // ci-dessus reste utile pour un message immédiat, mais seule la
      // contrainte d'exclusion côté base (voir supabase/schema.sql, Module
      // 35) empêche réellement un double rendez-vous en cas de validation
      // quasi simultanée par deux membres — code Postgres 23P01
      // (exclusion_violation) dans ce cas précis, message aussi clair que
      // celui du contrôle côté client ci-dessus.
      if (error.code === "23P01") {
        setErreur("Déjà pris à cette heure.");
        setChargement(false);
        return;
      }
      // Sprint Robustesse (30/08) — 🔴 `setChargement(false)` était appelé
      // ici inconditionnellement, avant l'enregistrement dans la timeline
      // et avant la redirection : le bouton redevenait cliquable pendant
      // cette fenêtre, ouvrant la porte à un double-clic créateur de
      // doublon. On ne le repasse à false que sur l'échec ; sur le succès,
      // la redirection démonte la page, donc inutile de le refaire.
      setErreur("Impossible d'enregistrer. Réessayez.");
      setChargement(false);
      return;
    }

    // Seuls les rendez-vous liés à un projet enrichissent sa timeline —
    // une tâche libre ("Rappeler Durand") n'apporte rien à la chronologie
    // du chantier et ajouterait du bruit inutile.
    if (demandeId && type === "rendez_vous") {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        organisationId,
        type: "rdv_planifie",
        titre: enModeEdition ? "Rendez-vous modifié" : "Rendez-vous planifié",
        // Une donnée écrite au journal : son format ne change pas.
        detail: `${titre} — ${new Date(dateHeure).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      });
    }

    // Refonte (02/10, duel G lot 1) — « Modifier » déplaçait un rendez-vous
    // client en silence. Si la date a changé, on propose de prévenir le
    // client, message prêt avec la nouvelle date ; on quitte la page ensuite.
    if (
      enModeEdition &&
      type === "rendez_vous" &&
      demandeId &&
      dateHeureInitiale &&
      Date.parse(dateHeureInitiale) !== Date.parse(dateHeure)
    ) {
      setChargement(false);
      setPrevenir({ demandeId, ancienneDate: dateHeureInitiale, nouvelleDate: dateHeure });
      return;
    }

    quitter();
  }

  // 08/10 (passe de finition) — ouvert depuis la fiche d'un projet (« À
  // faire »), on y revient : elle relit ses données en s'ouvrant. Sinon,
  // le planning, comme avant.
  function quitter() {
    const precedent = cheminPrecedent();
    if (precedent && /^\/dashboard\/demandes\/[0-9a-f-]{36}$/i.test(precedent)) {
      revenir(router);
      return;
    }
    router.push("/dashboard/planning");
    router.refresh();
  }

  if (chargementInitial) {
    return <SquelettePage />;
  }

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-lg lg:mr-auto lg:ml-[max(0px,calc((100%-72rem)/2))] lg:px-10">
      <h1 className={`${TITRE_ECRAN} [text-wrap:balance]`}>{enModeEdition ? "Modifier l'événement" : "Ajouter au planning"}</h1>

      {erreurChargement ? (
        // Sprint Robustesse (30/08) — page bloquée évitée : à la place du
        // formulaire (dont les champs seraient de toute façon vides), on
        // affiche l'état d'erreur standard avec un bouton "Réessayer" qui
        // relance le préchargement de l'événement.
        <EtatErreur
          message="Impossible de charger cet événement. Vérifiez votre connexion."
          onReessayer={() => {
            // Le useEffect de chargement dépend de `eventId`, qui ne change
            // pas d'un essai à l'autre : un simple re-render ne relancerait
            // donc rien. On recharge la page pour relancer proprement le
            // chargement, plus simple ici que d'extraire l'effet en fonction
            // rappelable.
            window.location.reload();
          }}
        />
      ) : (
      // Design v3 (24/10) : le formulaire dans une carte (CARTE_PLEINE), les
      // choix rapides en puce(), les champs en CHAMP, un seul plein en bas.
      // Les pastilles de priorité (rouge, orange, vert) devant chaque
      // chantier sont retirées : de la couleur sans mot, ici sans usage.
      <div className={`mt-5 sm:mt-8 sm:p-6 ${CARTE_PLEINE}`}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex gap-2" role="group" aria-label="Type">
            <button
              type="button"
              onClick={() => setType("rendez_vous")}
              aria-pressed={type === "rendez_vous"}
              className={`flex-1 justify-center ${puce(type === "rendez_vous")}`}
            >
              Rendez-vous
            </button>
            <button
              type="button"
              onClick={() => setType("tache")}
              aria-pressed={type === "tache"}
              className={`flex-1 justify-center ${puce(type === "tache")}`}
            >
              Tâche
            </button>
          </div>

          <div>
            <p className={LIBELLE}>Chantier (facultatif)</p>

            {projetSelectionne && (
              <div className="mb-2 flex items-center gap-2.5">
                <Avatar nom={projetSelectionne.nom_client || "?"} taille={32} />
                <span className="min-w-0 flex-1 break-words text-base font-semibold text-ink">{projetSelectionne.nom_client}</span>
                <button type="button" onClick={() => setDemandeId("")} className={`shrink-0 ${BOUTON_TEXTE}`}>
                  Retirer
                </button>
              </div>
            )}

            <button type="button" onClick={() => setSelecteurOuvert(!selecteurOuvert)} className={BOUTON_CREUX}>
              {projetSelectionne ? "Changer de chantier" : "Choisir un chantier"}
            </button>

            {selecteurOuvert && (
              <div className="mt-2 max-h-64 divide-y divide-gris-clair overflow-y-auto rounded-[14px] ring-1 ring-inset ring-contour">
                {projets.length === 0 && (
                  <p className="p-3 text-base text-steel">Aucun projet en cours.</p>
                )}
                {projets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choisirProjet(p)}
                    className="flex min-h-12 w-full items-center gap-2.5 px-3 text-left text-base text-ink active:bg-ink/[0.06] motion-safe:transition-colors sm:hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
                  >
                    <Avatar nom={p.nom_client || "?"} taille={28} />
                    {p.nom_client}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor={idTitre} className={LIBELLE}>
              Titre
            </label>
            <input
              id={idTitre}
              required
              placeholder={type === "rendez_vous" ? "Ex : Chantier Dupont" : "Ex : Rappeler Durand"}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className={CHAMP}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={idDate} className={LIBELLE}>
                Date
              </label>
              <input
                id={idDate}
                type="date"
                required
                min={enModeEdition ? undefined : dateLocaleAAAAMMJJ(new Date())}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={CHAMP}
              />
            </div>
            <div>
              <label htmlFor={idHeure} className={LIBELLE}>
                Heure
              </label>
              <input
                id={idHeure}
                type="time"
                required
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
                className={CHAMP}
              />
            </div>
          </div>

          {/* 27/09 — La durée en un appui (30 min, 1 h, 2 h, demi-journée,
              journée) plutôt qu'un nombre de minutes à taper.
              27/09 (Axel) — « 1 h 45, tu peux pas le choisir » : sous les
              boutons, − / + ajustent au quart d'heure, et la durée exacte
              est toujours écrite. */}
          {type === "rendez_vous" && (
            <fieldset>
              <legend className={LIBELLE}>Durée</legend>
              <div className="flex flex-wrap gap-2">
                {[
                  // 25/10 : espace insécable entre le nombre et l'unité.
                  { minutes: 30, libelle: "30 min" },
                  { minutes: 60, libelle: "1 h" },
                  { minutes: 120, libelle: "2 h" },
                  { minutes: 240, libelle: "½ journée" },
                  { minutes: 480, libelle: "Journée" },
                ].map((d) => (
                  <button
                    key={d.minutes}
                    type="button"
                    aria-pressed={dureeMinutes === d.minutes}
                    onClick={() => setDureeMinutes(d.minutes)}
                    className={puce(dureeMinutes === d.minutes)}
                  >
                    {d.libelle}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="15 minutes de moins"
                  onClick={() => setDureeMinutes((m) => Math.max(15, m - 15))}
                  disabled={dureeMinutes <= 15}
                  className={`bg-paper-warm text-xl disabled:opacity-60 ${BOUTON_ICONE}`}
                >
                  −
                </button>
                <span className="min-w-[5.5rem] text-center text-base font-semibold tabular-nums text-ink" aria-live="polite">
                  {dureeMinutes >= 60
                    ? `${Math.floor(dureeMinutes / 60)} h${dureeMinutes % 60 ? ` ${String(dureeMinutes % 60).padStart(2, "0")}` : ""}`
                    : `${dureeMinutes} min`}
                </span>
                <button
                  type="button"
                  aria-label="15 minutes de plus"
                  onClick={() => setDureeMinutes((m) => Math.min(1440, m + 15))}
                  disabled={dureeMinutes >= 1440}
                  className={`bg-paper-warm text-xl disabled:opacity-60 ${BOUTON_ICONE}`}
                >
                  +
                </button>
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor={idNotes} className={LIBELLE}>
              Notes (optionnel)
            </label>
            <textarea
              id={idNotes}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${CHAMP} resize-none py-3`}
            />
          </div>

          {erreur && (
            <p aria-live="polite" className={ERREUR}>
              {erreur}
            </p>
          )}

          <button type="submit" disabled={chargement} className={BOUTON_PLEIN_LARGE}>
            {chargement
              ? "Enregistrement…"
              : enModeEdition
              ? "Enregistrer les modifications"
              : type === "tache"
              ? "Ajouter la tâche"
              : "Ajouter le rendez-vous"}
          </button>
        </form>
      </div>
      )}

      {prevenir && (
        <FeuilleMessageClient
          ouverte
          surFermer={() => {
            setPrevenir(null);
            quitter();
          }}
          demandeId={prevenir.demandeId}
          demande={{ cle: "decalage", ancienneDate: prevenir.ancienneDate, nouvelleDate: prevenir.nouvelleDate }}
        />
      )}
    </div>
  );
}
