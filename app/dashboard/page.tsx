import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DemandeCard } from "@/components/dashboard/DemandeCard";
import { AConfirmer } from "@/components/dashboard/AConfirmer";
import { ConfirmerClotureProjet } from "@/components/dashboard/ConfirmerClotureProjet";
import { ResumeJournee } from "@/components/dashboard/ResumeJournee";
import { ConseilsCompagnon } from "@/components/dashboard/ConseilsCompagnon";
import { MiniApercu } from "@/components/dashboard/MiniApercu";
import { NotesRappelsAujourdhui } from "@/components/notes/NotesRappelsAujourdhui";
import { Avatar } from "@/components/ui/Avatar";
import { IconeCoeur, IconeDossier } from "@/components/ui/Icones";
import type { Projet } from "@/types";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation } from "@/lib/notes";

const SEUIL_RELANCE_JOURS = 7;

// Sans ça, Next.js peut servir une version mise en cache de cette page en
// revenant dessus après avoir changé d'onglet ou de page (cache de routeur
// côté navigateur, ~30 secondes par défaut) — ce qui donnait l'impression
// qu'une confirmation déjà traitée (rendez-vous, chantier terminé...)
// n'avait jamais été enregistrée. Cette page dépend d'un état qui change à
// chaque clic : elle doit toujours être recalculée, jamais servie en cache.
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const organisationId = await getOrganisationId(supabase, user?.id ?? "");

  const debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);
  const finAujourdhui = new Date(debutAujourdhui);
  finAujourdhui.setHours(23, 59, 59, 999);
  const maintenant = new Date();

  // Cinq requêtes indépendantes (aucune ne dépend du résultat d'une autre,
  // seulement de l'utilisateur déjà connu) : les lancer en parallèle plutôt
  // qu'en série réduit le temps de chargement d'autant, ce qui compte
  // vraiment sur un chantier avec un réseau mobile faible.
  const [
    { data: profil },
    { data: projets },
    { data: devisList },
    { data: evenementsAujourdhui },
    { data: aConfirmerBrut },
    { data: rdvConfirmesBrut },
    { data: evenementsFutursBrut },
    notesAvecRappel,
  ] = await Promise.all([
    supabase.from("profils").select("nom").eq("id", user?.id).single(),
    supabase.from("demandes").select("*").eq("organisation_id", organisationId),
    supabase
      .from("devis")
      .select("id, statut, numero, envoye_le, demande_id, demandes(nom_client)")
      .eq("organisation_id", organisationId),
    supabase
      .from("evenements_planning")
      .select("id, type, statut, titre, demande_id, date_heure, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .gte("date_heure", debutAujourdhui.toISOString())
      .lte("date_heure", finAujourdhui.toISOString())
      .neq("statut", "annule")
      .order("date_heure", { ascending: true }),
    // Événements passés jamais confirmés (ni "fait", ni "annulé") : on ne
    // suppose rien, on demande — voir composant AConfirmer. Ne filtre plus
    // seulement "avant aujourd'hui" : un rendez-vous de 16h10 à 17h
    // aujourd'hui doit déjà être proposé à la confirmation ce soir à
    // 20h15, pas attendre demain matin. On calcule ensuite l'heure de fin
    // estimée de chaque événement (durée renseignée, ou 60 min pour un
    // rendez-vous / 15 min pour une tâche par défaut) et on ne garde que
    // ceux déjà terminés.
    supabase
      .from("evenements_planning")
      .select("id, type, titre, demande_id, date_heure, duree_minutes, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "a_faire")
      .lt("date_heure", maintenant.toISOString())
      .order("date_heure", { ascending: false }),
    // Rendez-vous déjà confirmés "fait" (voir ConfirmerClotureProjet) : sert
    // de filet de sécurité pour la question "le chantier est-il terminé ?",
    // qui autrement ne vivait que dans un état d'écran perdable dès que
    // l'artisan change de page avant d'y répondre.
    supabase
      .from("evenements_planning")
      .select("demande_id")
      .eq("organisation_id", organisationId)
      .eq("type", "rendez_vous")
      .eq("statut", "termine"),
    supabase
      .from("evenements_planning")
      .select("demande_id")
      .eq("organisation_id", organisationId)
      .neq("statut", "annule")
      .gte("date_heure", maintenant.toISOString()),
    // Notes avec rappel (29/08, voir lib/notes/index.ts) — point 3 du
    // brief : "Aujourd'hui" et "En retard".
    organisationId
      ? listerNotesActivesOrganisation(supabase, organisationId, { avecRappelUniquement: true })
      : Promise.resolve([]),
  ]);

  // Supabase type "demandes(...)" comme un tableau au niveau TypeScript
  // (relation jointe), même si demande_id est une clé étrangère qui ne
  // pointe jamais vers plus d'un projet. On aplatit une bonne fois ici,
  // pour toute donnée qui embarque cette jointe, plutôt que de forcer des
  // casts un peu partout dans le JSX plus bas.
  function aplatirDemandes<T extends { demandes?: unknown }>(
    lignes: T[] | null
  ): (Omit<T, "demandes"> & { demandes?: { nom_client?: string; statut?: string } | null })[] {
    return (lignes ?? []).map((l) => ({
      ...l,
      demandes: Array.isArray(l.demandes) ? l.demandes[0] ?? null : (l.demandes as any),
    }));
  }

  const devisListPlat = aplatirDemandes(devisList);
  const evenementsAujourdhuiPlat = aplatirDemandes(evenementsAujourdhui);
  const aConfirmerBrutPlat = aplatirDemandes(aConfirmerBrut);

  // Marge de tolérance : un chantier déborde souvent sur l'horaire prévu.
  // Sans elle, on demanderait "avez-vous fini ?" alors que l'artisan est
  // encore sur place — faux et agaçant. On attend une heure de plus après
  // la fin estimée avant de considérer qu'une réponse est due.
  const MARGE_CONFIRMATION_MIN = 60;
  const aConfirmer = aConfirmerBrutPlat.filter((e) => {
    const dureeParDefaut = e.type === "rendez_vous" ? 60 : 15;
    const finEstimee =
      new Date(e.date_heure).getTime() +
      (e.duree_minutes ?? dureeParDefaut) * 60000 +
      MARGE_CONFIRMATION_MIN * 60000;
    return finEstimee < maintenant.getTime();
  });

  const listeProjets = (projets as Projet[] | null) ?? [];
  // Un chantier marqué "terminé" (quel que soit le chemin emprunté pour y
  // arriver — parcours guidé ou bouton "Marquer directement terminé") doit
  // disparaître de TOUTE section de l'accueil, pas seulement de la liste
  // des projets. Sans ça, un devis resté à l'état "envoyé" ou "à valider"
  // sur un projet déjà clôturé continue de s'afficher en évidence
  // (bordure colorée "Devis en attente") indéfiniment — c'est le bug
  // remonté : un chantier terminé restait "en gros plan" sur l'accueil.
  const idsProjetsTermines = new Set(
    listeProjets.filter((p) => p.statut === "termine").map((p) => p.id)
  );
  const devisListActifs = devisListPlat.filter(
    (d) => !d.demande_id || !idsProjetsTermines.has(d.demande_id)
  );
  // Idem pour les confirmations en attente : inutile de redemander "avez-vous
  // fait ce rendez-vous ?" pour un chantier déjà clôturé.
  const aConfirmerActifs = aConfirmer.filter(
    (e) => !e.demande_id || !idsProjetsTermines.has(e.demande_id)
  );

  // Filet de sécurité pour "le chantier est-il aussi terminé ?" (voir
  // ConfirmerClotureProjet) : tout projet actif dont au moins un
  // rendez-vous a été confirmé fait, et pour lequel plus rien n'est prévu
  // ensuite. Recalculé à chaque chargement — contrairement à la version
  // affichée juste après la confirmation (dans AConfirmer), celle-ci ne
  // peut pas se perdre si l'artisan change de page avant de répondre.
  const idsAvecRdvConfirme = new Set(
    (rdvConfirmesBrut ?? []).map((e) => e.demande_id).filter(Boolean)
  );
  const idsAvecEvenementFutur = new Set(
    (evenementsFutursBrut ?? []).map((e) => e.demande_id).filter(Boolean)
  );
  const projetsAConfirmerTermine = listeProjets
    .filter(
      (p) =>
        p.statut !== "termine" &&
        idsAvecRdvConfirme.has(p.id) &&
        !idsAvecEvenementFutur.has(p.id)
    )
    .map((p) => ({ id: p.id, nom_client: p.nom_client }));

  // Un rendez-vous confirmé "fait" (statut termine, via AConfirmer) n'a plus
  // rien à faire dans "Rendez-vous aujourd'hui" — sans ce filtre, confirmer
  // qu'un rendez-vous est passé ne le fait jamais disparaître de l'accueil.
  // On exclut aussi tout événement lié à un projet déjà clôturé.
  const rendezVousDuJour =
    evenementsAujourdhuiPlat?.filter(
      (e) =>
        e.type === "rendez_vous" &&
        e.statut !== "termine" &&
        (!e.demande_id || !idsProjetsTermines.has(e.demande_id))
    ) ?? [];
  const rappelsDuJour =
    evenementsAujourdhuiPlat?.filter(
      (e) =>
        e.type === "tache" &&
        e.statut === "a_faire" &&
        (!e.demande_id || !idsProjetsTermines.has(e.demande_id))
    ) ?? [];

  // Notes avec rappel (29/08) — "En retard" prime sur "Aujourd'hui" : une
  // note dont le rappel est passé y reste tant qu'elle n'est pas marquée
  // terminée (point 3 du brief), jamais reclassée automatiquement.
  const notesEnRetard = notesAvecRappel.filter(
    (n) => new Date(n.rappel_a as string).getTime() < maintenant.getTime()
  );
  const notesAujourdhui = notesAvecRappel.filter((n) => {
    const t = new Date(n.rappel_a as string).getTime();
    return t >= maintenant.getTime() && t <= finAujourdhui.getTime();
  });

  // Un projet fraîchement créé ("nouveau") n'a encore ni analyse ni devis :
  // rien d'autre ne le fait remonter ailleurs sur cette page. Sans section
  // dédiée et toujours visible, il peut rester invisible sur "Aujourd'hui"
  // dès qu'autre chose est prévu ce jour-là — ce qui s'est produit en
  // pratique et n'a aucun sens : un projet tout juste créé est justement
  // ce qu'il faut traiter en premier.
  const projetsNouveaux = listeProjets.filter((p) => p.statut === "nouveau");
  const projetsSansDevis = listeProjets.filter((p) => p.statut === "analyse");
  // Statuts introduits avec la validation du devis : un brouillon n'est pas
  // "prêt", il attend encore une relecture ; un devis refusé ne doit pas
  // apparaître comme "pas encore envoyé" — ce serait faux.
  const devisAValider = devisListActifs.filter((d) => d.statut === "brouillon");
  const devisPretsAEnvoyer = devisListActifs.filter((d) => d.statut === "a_valider");
  const devisRefuses = devisListActifs.filter((d) => d.statut === "refuse");

  const relances = devisListActifs
    .filter((d) => d.statut === "envoye" && d.envoye_le)
    .map((d) => ({
      ...d,
      joursDepuis: Math.floor(
        (maintenant.getTime() - new Date(d.envoye_le as string).getTime()) / 86400000
      ),
    }))
    .filter((d) => d.joursDepuis >= SEUIL_RELANCE_JOURS)
    .sort((a, b) => b.joursDepuis - a.joursDepuis);

  const premierPrenom = (profil?.nom ?? "").split(" ")[0];
  const rienAFaire =
    notesEnRetard.length === 0 &&
    notesAujourdhui.length === 0 &&
    rendezVousDuJour.length === 0 &&
    rappelsDuJour.length === 0 &&
    aConfirmerActifs.length === 0 &&
    projetsAConfirmerTermine.length === 0 &&
    projetsNouveaux.length === 0 &&
    projetsSansDevis.length === 0 &&
    devisAValider.length === 0 &&
    devisPretsAEnvoyer.length === 0 &&
    devisRefuses.length === 0 &&
    relances.length === 0;

  // "Que dois-je faire maintenant ?" — une seule ligne, calculée à partir
  // des mêmes données déjà chargées ci-dessus, sans appel IA. L'ordre
  // reflète ce qui bloque le plus le reste si on ne le traite pas
  // maintenant : une confirmation en attente avant un rendez-vous à venir,
  // avant un devis à relire, etc. Le but n'est pas d'être exhaustif — les
  // sections plus bas listent tout — mais de donner UNE réponse claire à
  // un artisan qui n'a que 20 secondes entre deux chantiers.
  const prochaineAction = determinerProchaineAction({
    aConfirmer: aConfirmerActifs,
    projetsAConfirmerTermine,
    rendezVousDuJour,
    devisAValider,
    projetsNouveaux,
    devisPretsAEnvoyer,
    rappelsDuJour,
    projetsSansDevis,
    devisRefuses,
    relances,
  });

  const ordrePriorite = { urgent: 0, important: 1, normal: 2 };
  // Les projets "nouveau" ont déjà leur propre section ci-dessous, toujours
  // visible — inutile de les répéter ici.
  const projetsPrioritaires = [...listeProjets]
    .filter((p) => p.statut !== "termine" && p.statut !== "nouveau")
    .sort(
      (a, b) =>
        (ordrePriorite[a.priorite ?? "normal"] ?? 2) -
        (ordrePriorite[b.priorite ?? "normal"] ?? 2)
    )
    .slice(0, 4);

  if (listeProjets.length === 0) {
    return (
      // Mise en page à deux colonnes sur grand écran : le contenu principal
      // reste étroit (max-w-2xl, plus lisible qu'une pleine largeur), et le
      // panneau de conseils comble l'espace qui restait vide à droite sur
      // un écran large (relevé directement par l'artisan qui teste l'app).
      // Colonne masquée sous lg : sur mobile/tablette, pas de vide à combler.
      <div className="p-8 max-w-6xl mx-auto flex gap-10 items-start">
        <div className="max-w-2xl flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold">
            Bonjour {premierPrenom} 👋
          </h1>
          <Card className="mt-8 p-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-signal/10 mb-4">
              <IconeCoeur taille={24} className="text-signal" />
            </span>
            <p className="font-display text-lg font-semibold">Bienvenue sur Compyo.</p>
            <p className="mt-2 text-sm text-ink/60 max-w-sm mx-auto">
              Tout commence par un projet. Créez le premier dès qu&apos;un client vous
              contacte — trente secondes suffisent, le reste se complète plus tard.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link href="/dashboard/demandes/nouvelle">
                <Button>+ Créer mon premier projet</Button>
              </Link>
            </div>
          </Card>
        </div>
        <aside className="hidden lg:block w-72 shrink-0">
          <ConseilsCompagnon />
          <MiniApercu />
        </aside>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto flex gap-10 items-start">
      <div className="max-w-2xl flex-1 min-w-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-semibold">
          Bonjour {premierPrenom} 👋
        </h1>
        <Link href="/dashboard/demandes/nouvelle">
          <Button>+ Nouveau projet</Button>
        </Link>
      </div>

      <ProchaineAction action={prochaineAction} />

      {/* Notes avec rappel (29/08) — point 3 du brief : "En retard" avant
          "Aujourd'hui", tout de suite après l'action prioritaire calculée
          ci-dessus, avant même les confirmations de rendez-vous — un
          rappel que l'artisan s'est lui-même fixé mérite au moins autant
          de visibilité qu'un rendez-vous du planning. */}
      <NotesRappelsAujourdhui titre="Notes en retard" notes={notesEnRetard} accent />
      <NotesRappelsAujourdhui titre="Notes à faire aujourd'hui" notes={notesAujourdhui} />

      <AConfirmer evenements={aConfirmerActifs} />

      <ConfirmerClotureProjet projets={projetsAConfirmerTermine} />

      {projetsNouveaux.length > 0 && (
        <Section titre="Nouveaux projets à cadrer">
          {projetsNouveaux.map((p) => (
            <LigneCliquable key={p.id} demandeId={p.id}>
              <Avatar nom={p.nom_client || "?"} taille={32} />
              <span className="text-sm text-ink/80">
                🆕 {p.nom_client}{" "}
                <span className="text-ink/40">— pas encore analysé</span>
              </span>
            </LigneCliquable>
          ))}
        </Section>
      )}

      {rienAFaire && (
        <div className="mt-8">
          <p className="text-sm text-ink/50 mb-4">
            Rien de prévu aujourd&apos;hui. Vos projets les plus prioritaires :
          </p>
          {projetsPrioritaires.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-signal/10">
                <IconeDossier taille={20} className="text-signal" />
              </span>
              <p className="text-sm text-ink/40">Aucun projet actif pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {projetsPrioritaires.map((p) => (
                <DemandeCard key={p.id} demande={p} />
              ))}
            </div>
          )}
          <Link
            href="/dashboard/demandes"
            className="mt-3 inline-block text-xs text-ink/50 hover:text-ink underline"
          >
            Voir tous mes projets →
          </Link>
        </div>
      )}

      {rendezVousDuJour.length > 0 && (
        <Section titre="Rendez-vous aujourd'hui">
          {rendezVousDuJour.map((e) => (
            <LigneCliquable key={e.id} demandeId={e.demande_id}>
              <span className="font-mono text-xs text-ink/40 w-12 shrink-0">
                {new Date(e.date_heure).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {nomClientDe(e) && <Avatar nom={nomClientDe(e) as string} taille={32} />}
              <span className="text-sm text-ink/80">
                {e.titre}
                {nomClientDe(e) && (
                  <span className="text-ink/40">
                    {" "}
                    — {nomClientDe(e)}
                  </span>
                )}
              </span>
            </LigneCliquable>
          ))}
        </Section>
      )}

      {rappelsDuJour.length > 0 && (
        <Section titre="Rappels aujourd'hui">
          {rappelsDuJour.map((r) => (
            <LigneCliquable key={r.id} demandeId={r.demande_id}>
              {nomClientDe(r) && <Avatar nom={nomClientDe(r) as string} taille={32} />}
              <span className="text-sm text-ink/80">
                📞 {r.titre}
                {nomClientDe(r) && (
                  <span className="text-ink/40">
                    {" "}
                    — {nomClientDe(r)}
                  </span>
                )}
              </span>
            </LigneCliquable>
          ))}
        </Section>
      )}

      {(projetsSansDevis.length > 0 ||
        devisAValider.length > 0 ||
        devisPretsAEnvoyer.length > 0) && (
        <Section titre="Devis à terminer">
          {projetsSansDevis.map((p) => (
            <LigneCliquable key={p.id} demandeId={p.id}>
              <Avatar nom={p.nom_client || "?"} taille={32} />
              <span className="text-sm text-ink/80">
                📄 {p.nom_client}{" "}
                <span className="text-ink/40">— devis pas encore généré</span>
              </span>
            </LigneCliquable>
          ))}
          {devisAValider.map((d) => (
            <LigneCliquable key={d.id} demandeId={d.demande_id}>
              {nomClientDe(d) && <Avatar nom={nomClientDe(d) as string} taille={32} />}
              <span className="text-sm text-ink/80">
                📄{" "}
                {nomClientDe(d) ?? d.numero}{" "}
                <span className="text-ink/40">— à relire et valider</span>
              </span>
            </LigneCliquable>
          ))}
          {devisPretsAEnvoyer.map((d) => (
            <LigneCliquable key={d.id} demandeId={d.demande_id}>
              {nomClientDe(d) && <Avatar nom={nomClientDe(d) as string} taille={32} />}
              <span className="text-sm text-ink/80">
                📄{" "}
                {nomClientDe(d) ?? d.numero}{" "}
                <span className="text-ink/40">— prêt, pas encore envoyé</span>
              </span>
            </LigneCliquable>
          ))}
        </Section>
      )}

      {devisRefuses.length > 0 && (
        <Section titre="Devis refusés">
          {devisRefuses.map((d) => (
            <LigneCliquable key={d.id} demandeId={d.demande_id} accent>
              {nomClientDe(d) && <Avatar nom={nomClientDe(d) as string} taille={32} />}
              <span className="text-sm text-ink/80">
                ✕{" "}
                {nomClientDe(d) ?? d.numero}{" "}
                <span className="text-ink/40">— à reprendre quand vous êtes prêt</span>
              </span>
            </LigneCliquable>
          ))}
        </Section>
      )}

      {relances.length > 0 && (
        <Section titre="Devis en attente de réponse">
          {relances.map((d) => (
            <LigneCliquable key={d.id} demandeId={d.demande_id} accent>
              {nomClientDe(d) && <Avatar nom={nomClientDe(d) as string} taille={32} />}
              <span className="text-sm text-ink/80">
                ⚠️{" "}
                {nomClientDe(d) ?? d.numero}{" "}
                <span className="text-ink/40">— envoyé depuis {d.joursDepuis} jours</span>
              </span>
            </LigneCliquable>
          ))}
        </Section>
      )}

      <ResumeJournee />
      </div>
      <aside className="hidden lg:block w-72 shrink-0">
        <ConseilsCompagnon />
        <MiniApercu />
      </aside>
    </div>
  );
}

type ActionSuggestion = { emoji: string; texte: string; demandeId: string | null };

function nomClientDe(item: unknown): string | undefined {
  return (item as { demandes?: { nom_client?: string } })?.demandes?.nom_client;
}

// Retourne UNE seule action, la plus utile à traiter maintenant, ou null
// s'il n'y a vraiment rien en attente. L'ordre des `if` EST la priorité :
// on s'arrête à la première catégorie non vide.
function determinerProchaineAction(listes: {
  aConfirmer: { id: string; titre: string; demande_id: string | null; demandes?: { nom_client?: string } | null }[];
  projetsAConfirmerTermine: { id: string; nom_client: string }[];
  rendezVousDuJour: { id: string; titre: string; demande_id: string | null; date_heure: string }[];
  devisAValider: { id: string; demande_id: string | null; numero: string }[];
  projetsNouveaux: Projet[];
  devisPretsAEnvoyer: { id: string; demande_id: string | null; numero: string }[];
  rappelsDuJour: { id: string; titre: string; demande_id: string | null }[];
  projetsSansDevis: Projet[];
  devisRefuses: { id: string; demande_id: string | null; numero: string }[];
  relances: { id: string; demande_id: string | null; numero: string; joursDepuis: number }[];
}): ActionSuggestion | null {
  const {
    aConfirmer,
    projetsAConfirmerTermine,
    rendezVousDuJour,
    devisAValider,
    projetsNouveaux,
    devisPretsAEnvoyer,
    rappelsDuJour,
    projetsSansDevis,
    devisRefuses,
    relances,
  } = listes;

  if (aConfirmer.length > 0) {
    const e = aConfirmer[0];
    const nom = nomClientDe(e);
    return {
      emoji: "✅",
      texte:
        aConfirmer.length > 1
          ? `Confirmer ${aConfirmer.length} rendez-vous passés`
          : `Le rendez-vous${nom ? ` chez ${nom}` : ""} est-il terminé ?`,
      demandeId: e.demande_id,
    };
  }
  if (projetsAConfirmerTermine.length > 0) {
    const p = projetsAConfirmerTermine[0];
    return {
      emoji: "✅",
      texte: `Le chantier ${p.nom_client} est-il terminé ?`,
      demandeId: p.id,
    };
  }
  if (rendezVousDuJour.length > 0) {
    const e = rendezVousDuJour[0];
    const heure = new Date(e.date_heure).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nom = nomClientDe(e);
    return {
      emoji: "🗓️",
      texte: `Rendez-vous à ${heure}${nom ? ` — ${nom}` : ""}`,
      demandeId: e.demande_id,
    };
  }
  if (devisAValider.length > 0) {
    const d = devisAValider[0];
    return {
      emoji: "📄",
      texte: `Relire et valider le devis ${nomClientDe(d) ?? d.numero}`,
      demandeId: d.demande_id,
    };
  }
  if (projetsNouveaux.length > 0) {
    const p = projetsNouveaux[0];
    return { emoji: "🆕", texte: `Cadrer le nouveau projet — ${p.nom_client}`, demandeId: p.id };
  }
  if (devisPretsAEnvoyer.length > 0) {
    const d = devisPretsAEnvoyer[0];
    return {
      emoji: "📤",
      texte: `Envoyer le devis ${nomClientDe(d) ?? d.numero}`,
      demandeId: d.demande_id,
    };
  }
  if (rappelsDuJour.length > 0) {
    const r = rappelsDuJour[0];
    return { emoji: "📞", texte: r.titre, demandeId: r.demande_id };
  }
  if (projetsSansDevis.length > 0) {
    const p = projetsSansDevis[0];
    return { emoji: "📝", texte: `Générer le devis de ${p.nom_client}`, demandeId: p.id };
  }
  if (devisRefuses.length > 0) {
    const d = devisRefuses[0];
    return {
      emoji: "✕",
      texte: `Reprendre le devis refusé — ${nomClientDe(d) ?? d.numero}`,
      demandeId: d.demande_id,
    };
  }
  if (relances.length > 0) {
    const d = relances[0];
    return {
      emoji: "⚠️",
      texte: `Relancer ${nomClientDe(d) ?? d.numero} — envoyé depuis ${d.joursDepuis} jours`,
      demandeId: d.demande_id,
    };
  }
  return null;
}

function ProchaineAction({ action }: { action: ActionSuggestion | null }) {
  if (!action) {
    return (
      <div className="mt-6 p-4 rounded-2xl border border-ink/10 bg-paper-warm text-sm text-ink/50">
        Rien d&apos;urgent pour l&apos;instant. 👍
      </div>
    );
  }
  const contenu = (
    <div className="mt-6 p-4 rounded-2xl border border-ink bg-ink text-paper flex items-center gap-3 transition-all duration-200 hover:bg-ink/90 hover:-translate-y-0.5 hover:shadow-lg">
      <span className="text-lg">{action.emoji}</span>
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-paper/50">
          Maintenant
        </p>
        <p className="text-sm font-medium">{action.texte}</p>
      </div>
    </div>
  );
  return action.demandeId ? (
    <Link href={`/dashboard/demandes/${action.demandeId}`}>{contenu}</Link>
  ) : (
    contenu
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
        {titre}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function LigneCliquable({
  demandeId,
  accent,
  children,
}: {
  demandeId: string | null;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const contenu = (
    // hover:border-signal/30 + léger décalage vers le haut : ces lignes
    // mènent toutes vers la fiche d'un projet, mais rien ne le signalait
    // visuellement avant (relevé : l'accueil "ne ressemble pas à des
    // boutons"). Cohérent avec l'effet déjà utilisé sur la landing page.
    <Card
      className={`p-3.5 flex items-center gap-3 transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink/[0.06] ${
        accent ? "border-signal/30 bg-signal/5" : ""
      }`}
    >
      {children}
    </Card>
  );
  return demandeId ? (
    <Link href={`/dashboard/demandes/${demandeId}`}>{contenu}</Link>
  ) : (
    contenu
  );
}
