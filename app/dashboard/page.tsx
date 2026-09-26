import { createClient } from "@/lib/supabase/server";
import type { ElementJour } from "@/components/accueil/ListeAujourdhui";
import { VueAccueil, type ActionAccueil } from "@/components/accueil/VueAccueil";
import type { Projet } from "@/types";
import { getOrganisationId } from "@/lib/organisation";
import { listerNotesActivesOrganisation } from "@/lib/notes";

// ============================================================
// L'accueil (26/09 — « moins mais mieux », lot B).
//
// Une seule question : qu'est-ce que je dois faire ? Un jour chargé
// empilait jusqu'à douze blocs sur téléphone (quatorze sur ordinateur),
// dont trois conseillers. Maintenant, cinq blocs au plus, chacun affiché
// seulement s'il a quelque chose à dire :
//   1. Maintenant           — la prochaine action, une seule ;
//   2. À confirmer          — des questions oui / non ;
//   3. Aujourd'hui          — une liste triée par heure (rendez-vous,
//                             notes, rappels ; le retard en tête) ;
//   4. À faire de votre côté — ce que l'artisan doit produire ;
//   5. En attente du client — devis sans réponse, factures impayées.
// Sortis : la mini-démonstration et le panneau de conseils (l'artisan
// utilise déjà l'application), les devis refusés (aucune action à faire,
// ils restent dans la liste des devis), les paragraphes d'explication.
// Principe : une information n'apparaît que si elle risque d'être oubliée.
// ============================================================

// Un devis envoyé apparaît dans « En attente du client » à partir de trois
// jours sans réponse (au-delà, sans relance, il est souvent perdu), et
// propose « Relancer » au premier palier des relances existantes (voir
// app/api/cron/relance-devis/route.ts).
const JOURS_AFFICHAGE_DEVIS = 3;
const JOURS_RELANCE_DEVIS = 5;
// Les factures : mêmes seuils que app/api/cron/relance-factures/route.ts.
const JOURS_APRES_ECHEANCE = 3;
const JOURS_SANS_ECHEANCE = 15;

// Sans ça, Next.js peut servir une version mise en cache de cette page en
// revenant dessus après avoir changé d'onglet ou de page (cache de routeur
// côté navigateur, ~30 secondes par défaut) — ce qui donnait l'impression
// qu'une confirmation déjà traitée (rendez-vous, chantier terminé...)
// n'avait jamais été enregistrée. Cette page dépend d'un état qui change à
// chaque clic : elle doit toujours être recalculée, jamais servie en cache.
export const dynamic = "force-dynamic";

const JOUR_MS = 86400000;

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

  // Requêtes indépendantes (aucune ne dépend du résultat d'une autre,
  // seulement de l'utilisateur déjà connu) : en parallèle, ce qui compte
  // vraiment sur un chantier avec un réseau mobile faible.
  const [
    { data: profil },
    { data: projets },
    { data: devisList },
    { data: evenementsAujourdhui },
    { data: aConfirmerBrut },
    { data: rdvConfirmesBrut },
    { data: evenementsFutursBrut },
    { data: journalEvenementsBrut },
    { data: facturesDuesBrut },
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
    // suppose rien, on demande — voir composant AConfirmer. On calcule
    // ensuite l'heure de fin estimée de chaque événement (durée
    // renseignée, ou 60 min pour un rendez-vous / 15 min pour une tâche
    // par défaut) et on ne garde que ceux déjà terminés.
    supabase
      .from("evenements_planning")
      .select("id, type, titre, demande_id, date_heure, duree_minutes, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "a_faire")
      .lt("date_heure", maintenant.toISOString())
      .order("date_heure", { ascending: false }),
    // Rendez-vous déjà confirmés "fait" (voir ConfirmerClotureProjet) : filet
    // de sécurité pour la question "le chantier est-il terminé ?".
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
    // Journal chantier vocal (06/09) — second signal de clôture en plus du
    // rendez-vous confirmé "fait", voir components/dashboard/NotesVocales.tsx.
    supabase
      .from("evenements_projet")
      .select("demande_id, metadata")
      .eq("organisation_id", organisationId)
      .eq("type", "journal_chantier_interprete")
      .order("created_at", { ascending: false }),
    // 26/09 — les factures encore dues, pour « En attente du client ».
    supabase
      .from("factures")
      .select("id, numero, demande_id, date_emission, date_echeance, demandes(nom_client)")
      .eq("organisation_id", organisationId)
      .eq("statut", "emise")
      .neq("type", "avoir"),
    organisationId
      ? listerNotesActivesOrganisation(supabase, organisationId, { avecRappelUniquement: true })
      : Promise.resolve([]),
  ]);

  // Supabase type "demandes(...)" comme un tableau au niveau TypeScript
  // (relation jointe), même si demande_id ne pointe jamais vers plus d'un
  // projet. On aplatit une bonne fois ici.
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
  const facturesDues = aplatirDemandes(facturesDuesBrut);

  // Marge de tolérance : un chantier déborde souvent sur l'horaire prévu.
  // On attend une heure de plus après la fin estimée avant de demander.
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
  // Un chantier marqué "terminé" disparaît de TOUTE section de l'accueil.
  const idsProjetsTermines = new Set(listeProjets.filter((p) => p.statut === "termine").map((p) => p.id));
  const devisListActifs = devisListPlat.filter((d) => !d.demande_id || !idsProjetsTermines.has(d.demande_id));
  const aConfirmerActifs = aConfirmer.filter((e) => !e.demande_id || !idsProjetsTermines.has(e.demande_id));

  // Filet de sécurité pour "le chantier est-il aussi terminé ?" (voir
  // ConfirmerClotureProjet) : tout projet actif dont au moins un
  // rendez-vous a été confirmé fait, et pour lequel plus rien n'est prévu.
  const idsAvecRdvConfirme = new Set((rdvConfirmesBrut ?? []).map((e) => e.demande_id).filter(Boolean));
  const idsAvecEvenementFutur = new Set((evenementsFutursBrut ?? []).map((e) => e.demande_id).filter(Boolean));

  // Journal chantier vocal (06/09) — au moins deux comptes-rendus vocaux
  // consécutifs signalant "chantier_semble_termine".
  const SEUIL_SIGNAUX_CLOTURE = 2;
  const signauxParProjet = new Map<string, boolean[]>();
  for (const e of journalEvenementsBrut ?? []) {
    if (!e.demande_id) continue;
    const liste = signauxParProjet.get(e.demande_id) ?? [];
    liste.push(Boolean((e.metadata as { chantier_semble_termine?: boolean } | null)?.chantier_semble_termine));
    signauxParProjet.set(e.demande_id, liste);
  }
  const idsAvecSignalCloture = new Set(
    Array.from(signauxParProjet.entries())
      .filter(([, signaux]) => signaux.length >= SEUIL_SIGNAUX_CLOTURE && signaux.slice(0, SEUIL_SIGNAUX_CLOTURE).every(Boolean))
      .map(([id]) => id)
  );

  const projetsAConfirmerTermine = listeProjets
    .filter(
      (p) =>
        p.statut !== "termine" &&
        (idsAvecRdvConfirme.has(p.id) || idsAvecSignalCloture.has(p.id)) &&
        !idsAvecEvenementFutur.has(p.id)
    )
    .map((p) => ({ id: p.id, nom_client: p.nom_client }));

  // Un rendez-vous confirmé "fait" n'a plus rien à faire dans la journée.
  const rendezVousDuJour =
    evenementsAujourdhuiPlat?.filter(
      (e) => e.type === "rendez_vous" && e.statut !== "termine" && (!e.demande_id || !idsProjetsTermines.has(e.demande_id))
    ) ?? [];
  const rappelsDuJour =
    evenementsAujourdhuiPlat?.filter(
      (e) => e.type === "tache" && e.statut === "a_faire" && (!e.demande_id || !idsProjetsTermines.has(e.demande_id))
    ) ?? [];

  // Notes avec rappel (29/08) — "En retard" prime sur "Aujourd'hui" : une
  // note dont le rappel est passé y reste tant qu'elle n'est pas faite.
  const notesEnRetard = notesAvecRappel.filter((n) => new Date(n.rappel_a as string).getTime() < maintenant.getTime());
  const notesAujourdhui = notesAvecRappel.filter((n) => {
    const t = new Date(n.rappel_a as string).getTime();
    return t >= maintenant.getTime() && t <= finAujourdhui.getTime();
  });

  const projetsNouveaux = listeProjets.filter((p) => p.statut === "nouveau");
  const projetsSansDevis = listeProjets.filter((p) => p.statut === "analyse");
  const devisAValider = devisListActifs.filter((d) => d.statut === "brouillon");
  const devisPretsAEnvoyer = devisListActifs.filter((d) => d.statut === "a_valider");

  const joursDepuis = (iso: string) => Math.floor((maintenant.getTime() - new Date(iso).getTime()) / JOUR_MS);

  const devisEnAttente = devisListActifs
    .filter((d) => d.statut === "envoye" && d.envoye_le)
    .map((d) => ({ ...d, jours: joursDepuis(d.envoye_le as string) }))
    .filter((d) => d.jours >= JOURS_AFFICHAGE_DEVIS);

  // Une facture n'apparaît qu'une fois échue (ou, sans échéance, après
  // quinze jours) : avant, elle n'est pas « impayée », juste en cours.
  // Un chantier terminé garde ses factures impayées : c'est précisément là
  // qu'elles comptent.
  const facturesImpayees = facturesDues
    .map((f) => {
      const reference = f.date_echeance ?? f.date_emission;
      const jours = joursDepuis(reference);
      const aRelancer = f.date_echeance ? jours >= JOURS_APRES_ECHEANCE : jours >= JOURS_SANS_ECHEANCE;
      const affichee = f.date_echeance ? jours > 0 : jours >= JOURS_SANS_ECHEANCE;
      return { ...f, jours, aRelancer, affichee };
    })
    .filter((f) => f.affichee);

  const prochaineAction = determinerProchaineAction({
    rendezVousDuJour,
    devisAValider,
    projetsNouveaux,
    devisPretsAEnvoyer,
    rappelsDuJour,
    projetsSansDevis,
    devisEnAttente,
    facturesImpayees,
    maintenant,
  });
  // L'élément mis en avant dans « Maintenant » n'est pas répété plus bas.
  const pasMisEnAvant = (id: string) => prochaineAction?.id !== id;

  // ---- 3. Aujourd'hui : une seule liste triée par heure -----------------
  const elementsJour: ElementJour[] = [
    ...notesEnRetard.map((n) => ({
      cle: `note-${n.id}`,
      genre: "note" as const,
      noteId: n.id,
      date: n.rappel_a as string,
      enRetard: true,
      principal: n.titre,
      secondaire: n.demandes?.nom_client,
      href: n.demande_id ? `/dashboard/demandes/${n.demande_id}` : "/dashboard/notes",
    })),
    ...[
      ...rendezVousDuJour.filter((e) => pasMisEnAvant(e.id)).map((e) => ({
        cle: `rdv-${e.id}`,
        genre: "rdv" as const,
        date: e.date_heure,
        enRetard: false,
        principal: nomClientDe(e) ?? e.titre,
        secondaire: nomClientDe(e) ? e.titre : undefined,
        href: e.demande_id ? `/dashboard/demandes/${e.demande_id}` : "/dashboard/planning",
      })),
      ...notesAujourdhui.map((n) => ({
        cle: `note-${n.id}`,
        genre: "note" as const,
        noteId: n.id,
        date: n.rappel_a as string,
        enRetard: false,
        principal: n.titre,
        secondaire: n.demandes?.nom_client,
        href: n.demande_id ? `/dashboard/demandes/${n.demande_id}` : "/dashboard/notes",
      })),
      ...rappelsDuJour.filter((e) => pasMisEnAvant(e.id)).map((e) => ({
        cle: `tache-${e.id}`,
        genre: "tache" as const,
        date: e.date_heure,
        enRetard: false,
        principal: e.titre,
        secondaire: nomClientDe(e),
        href: e.demande_id ? `/dashboard/demandes/${e.demande_id}` : "/dashboard/planning",
      })),
    ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
  ];

  // ---- 4. À faire de votre côté ------------------------------------------
  const aProduire = [
    ...projetsNouveaux.map((p) => ({ id: p.id, demandeId: p.id, nom: p.nom_client, verbe: "Nouveau projet à cadrer" })),
    ...projetsSansDevis.map((p) => ({ id: p.id, demandeId: p.id, nom: p.nom_client, verbe: "Devis à préparer" })),
    ...devisAValider.map((d) => ({ id: d.id, demandeId: d.demande_id, nom: nomClientDe(d) ?? d.numero, verbe: "Devis à relire" })),
    ...devisPretsAEnvoyer.map((d) => ({ id: d.id, demandeId: d.demande_id, nom: nomClientDe(d) ?? d.numero, verbe: "Devis à envoyer" })),
  ].filter((l) => pasMisEnAvant(l.id));

  // ---- 5. En attente du client --------------------------------------------
  const enAttente = [
    ...facturesImpayees.map((f) => ({
      id: f.id,
      jours: f.jours,
      nom: nomClientDe(f) ?? `Facture ${f.numero}`,
      quoi: "Facture impayée",
      href: `/dashboard/demandes/${f.demande_id}`,
      relance: f.aRelancer ? `/dashboard/demandes/${f.demande_id}?message=relancePaiement&facture=${f.id}` : null,
    })),
    ...devisEnAttente.map((d) => ({
      id: d.id,
      jours: d.jours,
      nom: nomClientDe(d) ?? `Devis ${d.numero}`,
      quoi: "Devis sans réponse",
      href: d.demande_id ? `/dashboard/demandes/${d.demande_id}` : "/dashboard/devis",
      relance:
        d.demande_id && d.jours >= JOURS_RELANCE_DEVIS
          ? `/dashboard/demandes/${d.demande_id}?message=relanceDevis&devis=${d.id}`
          : null,
    })),
  ]
    .filter((l) => pasMisEnAvant(l.id))
    .sort((a, b) => b.jours - a.jours);

  const premierPrenom = (profil?.nom ?? "").split(" ")[0];
  const dateDuJour = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  const rienAFaire =
    !prochaineAction &&
    elementsJour.length === 0 &&
    aConfirmerActifs.length === 0 &&
    projetsAConfirmerTermine.length === 0 &&
    aProduire.length === 0 &&
    enAttente.length === 0;

  return (
    <VueAccueil
      dateDuJour={dateDuJour}
      titre={listeProjets.length === 0 ? "Bienvenue sur Compyo." : `Bonjour ${premierPrenom}`}
      premierProjet={listeProjets.length === 0}
      prochaineAction={prochaineAction}
      aConfirmer={aConfirmerActifs}
      chantiersAConfirmer={projetsAConfirmerTermine}
      elementsJour={elementsJour}
      aProduire={aProduire}
      enAttente={enAttente}
      rienAFaire={rienAFaire}
    />
  );
}

function nomClientDe(item: unknown): string | undefined {
  return (item as { demandes?: { nom_client?: string } })?.demandes?.nom_client;
}

// UNE seule action, la plus utile à traiter maintenant, ou null. L'ordre
// des `if` EST la priorité. Les confirmations n'y figurent plus : elles ont
// leur bloc juste en dessous, avec les boutons pour y répondre.
function determinerProchaineAction(listes: {
  rendezVousDuJour: { id: string; titre: string; demande_id: string | null; date_heure: string }[];
  devisAValider: { id: string; demande_id: string | null; numero: string }[];
  projetsNouveaux: Projet[];
  devisPretsAEnvoyer: { id: string; demande_id: string | null; numero: string }[];
  rappelsDuJour: { id: string; titre: string; demande_id: string | null }[];
  projetsSansDevis: Projet[];
  devisEnAttente: { id: string; demande_id: string | null; numero: string; jours: number }[];
  facturesImpayees: { id: string; demande_id: string; numero: string; jours: number; aRelancer: boolean }[];
  maintenant: Date;
}): ActionAccueil | null {
  const lien = (demandeId: string | null, repli: string) => (demandeId ? `/dashboard/demandes/${demandeId}` : repli);

  const prochainRdv = listes.rendezVousDuJour.find((e) => new Date(e.date_heure) >= new Date(listes.maintenant.getTime() - 60 * 60000));
  if (prochainRdv) {
    const heure = new Date(prochainRdv.date_heure)
      .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
      .replace(":", "h");
    return {
      id: prochainRdv.id,
      texte: nomClientDe(prochainRdv) ? `${heure} — ${nomClientDe(prochainRdv)}` : `${heure} — ${prochainRdv.titre}`,
      detail: nomClientDe(prochainRdv) ? prochainRdv.titre : undefined,
      href: lien(prochainRdv.demande_id, "/dashboard/planning"),
    };
  }
  const devis = listes.devisAValider[0];
  if (devis) return { id: devis.id, texte: `Relire le devis ${nomClientDe(devis) ?? devis.numero}`, href: lien(devis.demande_id, "/dashboard/devis") };
  const nouveau = listes.projetsNouveaux[0];
  if (nouveau) return { id: nouveau.id, texte: `Cadrer le projet ${nouveau.nom_client}`, href: `/dashboard/demandes/${nouveau.id}` };
  const pret = listes.devisPretsAEnvoyer[0];
  if (pret) return { id: pret.id, texte: `Envoyer le devis ${nomClientDe(pret) ?? pret.numero}`, href: lien(pret.demande_id, "/dashboard/devis") };
  const rappel = listes.rappelsDuJour[0];
  if (rappel) return { id: rappel.id, texte: rappel.titre, href: lien(rappel.demande_id, "/dashboard/planning") };
  const sansDevis = listes.projetsSansDevis[0];
  if (sansDevis) return { id: sansDevis.id, texte: `Préparer le devis de ${sansDevis.nom_client}`, href: `/dashboard/demandes/${sansDevis.id}` };
  const facture = listes.facturesImpayees.find((f) => f.aRelancer);
  if (facture)
    return {
      id: facture.id,
      texte: `Relancer ${nomClientDe(facture) ?? `la facture ${facture.numero}`}`,
      detail: `Facture ${facture.numero} impayée depuis ${facture.jours} j`,
      href: `/dashboard/demandes/${facture.demande_id}?message=relancePaiement&facture=${facture.id}`,
    };
  const relance = listes.devisEnAttente.find((d) => d.jours >= JOURS_RELANCE_DEVIS);
  if (relance)
    return {
      id: relance.id,
      texte: `Relancer ${nomClientDe(relance) ?? `le devis ${relance.numero}`}`,
      detail: `Devis sans réponse depuis ${relance.jours} j`,
      href: relance.demande_id
        ? `/dashboard/demandes/${relance.demande_id}?message=relanceDevis&devis=${relance.id}`
        : "/dashboard/devis",
    };
  return null;
}
