"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import { marquerRendezVousDuChantierFaits } from "@/components/planning/actionsEvenement";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { FacturesProjet } from "@/components/dashboard/FacturesProjet";
import { NotesVocales } from "@/components/dashboard/NotesVocales";
import { PropositionUrgence } from "@/components/dashboard/PropositionUrgence";
import { ChampAppareil, EtatEnvoiPhotos, PhotosProjet, idChampAppareil, useEnvoiPhotos } from "@/components/dashboard/PhotosProjet";
import type { TimelineItem } from "@/components/dashboard/Timeline";
import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { adresseEspaceDevis, dupliquerDevis as creerNouvelleVersion } from "@/lib/devis/actions";
import { obtenirChecklist } from "@/lib/checklistsMetier";
import {
  listerNotesProjet,
  marquerNoteTerminee,
  creerNote,
  creerRappelRecurrentClient,
  TYPES_CHANTIER_RAPPEL_RECURRENT,
  PRESETS_RAPPEL_RECURRENT,
} from "@/lib/notes";
import { FormulaireNote } from "@/components/notes/FormulaireNote";
// Sprint Robustesse (30/08) — outils partagés pour les mutations Supabase
// (voir lib/supabase/resultat.ts) et pour l'affichage d'un échec de
// chargement de page (voir components/ui/EtatErreur.tsx).
import { executerMutation } from "@/lib/supabase/resultat";
import { EtatErreur, ErreurInline } from "@/components/ui/EtatErreur";
import type { Projet, Devis, NoteVocale, EvenementProjet, EvenementPlanning, ParametresEntreprise, Note } from "@/types";
import { VueProjet } from "@/components/projet/VueProjet";
import { Feuille } from "@/components/projet/Feuille";
import type { IdAction } from "@/components/projet/prochaineAction";
import { Skeleton, SquelettePage } from "@/components/ui/Skeleton";
import { empreinte, lireBrouillon, ecrireBrouillon, effacerBrouillon } from "@/lib/brouillonLocal";
import { ouvrirMessage, type Canal } from "@/lib/messagesClient";
import { tracerMessagePrepare } from "@/components/projet/FeuilleMessageClient";
import { BOUTON_CONTOUR, BOUTON_TEXTE } from "@/components/projet/Blocs";
import { IconeCoche } from "@/components/projet/icones";

// Refonte (03/10, duel D lot 1) — le texte écrit avec l'IA, une fois
// retouché, est gardé sur le téléphone (lib/brouillonLocal.ts) jusqu'à ce
// qu'il parte dans les SMS ou WhatsApp. Il n'a pas d'équivalent en base :
// la « base » du brouillon est une constante.
const BASE_MESSAGE_IA = "1";
type MessageIA = { texte: string; genre: "reponse" | "relanceDevis"; contexte?: string };

// Revue métier (06/09) — dérivé de LABEL_TYPE_CHANTIER (components/
// dashboard/DemandeCard.tsx) plutôt que dupliqué ici : une seule liste à
// tenir à jour désormais (l'ancienne copie ne comptait que 9 des 20
// valeurs possibles, oubliée lors de l'élargissement aux 18 métiers).
const TYPES_CHANTIER: { value: string; label: string }[] = Object.entries(LABEL_TYPE_CHANTIER).map(
  ([value, label]) => ({ value, label: label || "Autre" })
);

// Titre unique de la note de tâches restantes : sert de clé pour la
// retrouver et la remplacer à chaque analyse, au lieu d'empiler une note de
// plus à chaque fois (quatre notes quasi identiques sur un même chantier,
// constaté le 13/09).
const TITRE_NOTE_TACHES = "Tâches restantes";

export default function DetailDemandePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const router = useRouter();

  const [demande, setDemande] = useState<Projet | null>(null);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [nomArtisan, setNomArtisan] = useState("");
  const [metierArtisan, setMetierArtisan] = useState<string | null>(null);
  const [chargementAnalyse, setChargementAnalyse] = useState(false);
  const [chargementDevis, setChargementDevis] = useState(false);
  const [chargementReponse, setChargementReponse] = useState(false);
  const [brouillonReponse, setBrouillonReponse] = useState("");
  const [copie, setCopie] = useState(false);
  // Refonte (03/10, duel D lot 1) — la feuille IA ouvre maintenant les SMS
  // ou WhatsApp de l'artisan, texte prêt, au lieu de le faire copier puis
  // coller. `genreReponse` dit ce que la trace écrira dans le Carnet
  // (réponse ou relance du devis), `contexteReponse` permet de redemander
  // une autre version du même message.
  const [genreReponse, setGenreReponse] = useState<MessageIA["genre"]>("reponse");
  const [contexteReponse, setContexteReponse] = useState<string | undefined>(undefined);
  const [reponseGardee, setReponseGardee] = useState(false);
  const [erreurEnvoiReponse, setErreurEnvoiReponse] = useState(false);
  const cleMessageIA = `compyo:message-ia:${params.id}`;
  // Constaté le 13/09 sur un vrai projet : un seul échec (génération de
  // devis) affichait le même message d'erreur QUATRE fois sur la page —
  // sous "Cadrer le besoin", sous "Générer un devis", sous "Préparer une
  // réponse", et en bas de page. L'intention d'origine était bonne (que
  // l'erreur reste visible sans avoir à scroller), mais dupliquer
  // l'affichage d'un état partagé la montre partout à la fois, ce qui
  // donne l'impression que tout est cassé alors qu'une seule action a
  // échoué.
  //
  // On retient donc AUSSI la section qui a produit l'erreur. Les appels
  // existants `setErreur("…")` continuent de fonctionner tels quels (pas
  // de section => bandeau de bas de page, comme avant) ; seules les trois
  // actions IA précisent leur section pour s'afficher au bon endroit.
  const [urgenceProposee, setUrgenceProposee] = useState(false);
  const [tachesProposees, setTachesProposees] = useState<string[] | null>(null);
  const [infosAConfirmer, setInfosAConfirmer] = useState<string[] | null>(null);
  const [ajoutTachesEnCours, setAjoutTachesEnCours] = useState(false);
  const [erreurDetaillee, setErreurDetaillee] = useState<{
    message: string;
    section: "analyse" | "devis" | "reponse" | null;
  } | null>(null);
  const erreur = erreurDetaillee?.message ?? null;
  const sectionErreur = erreurDetaillee?.section ?? null;
  const setErreur = useCallback(
    (message: string | null, section: "analyse" | "devis" | "reponse" | null = null) => {
      setErreurDetaillee(message ? { message, section } : null);
    },
    []
  );
  const [notesVocales, setNotesVocales] = useState<NoteVocale[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [rappelRecurrentEnCours, setRappelRecurrentEnCours] = useState<number | null>(null);
  const [rappelRecurrentCree, setRappelRecurrentCree] = useState<number | null>(null);
  const [evenementsProjet, setEvenementsProjet] = useState<EvenementProjet[]>([]);
  // Fiche projet (24/09) — les rendez-vous et tâches du planning liés à ce
  // projet : l'ancienne fiche ne les montrait pas du tout (seulement un
  // bouton « + Planifier »), alors que « quand je repasse ? » est une des
  // premières questions qu'on se pose en ouvrant un chantier.
  const [rendezVous, setRendezVous] = useState<EvenementPlanning[]>([]);
  const [urlsPhotos, setUrlsPhotos] = useState<Record<string, string>>({});
  const [feuilleReponse, setFeuilleReponse] = useState(false);
  const [maintenant, setMaintenant] = useState(() => new Date());
  // "Mémoire client" (06/09) — voir chargerDonnees() : null tant que non
  // chargé, pour ne jamais afficher "0 autre projet" pendant une fraction
  // de seconde avant que la vraie valeur n'arrive.
  const [nbAutresProjetsClient, setNbAutresProjetsClient] = useState<number | null>(null);
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [parametres, setParametres] = useState<ParametresEntreprise | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Audit Cycle 2 (Agent Destructeur) : les boutons "Marquer comme
  // envoyé/accepté/refusé/démarré/terminé" n'avaient aucun état
  // "disabled" pendant l'appel réseau — un double-clic (ou un clic répété
  // par frustration sur un réseau lent de chantier) déclenchait plusieurs
  // mutations + plusieurs entrées de timeline en double. Un seul drapeau
  // partagé suffit : ces actions sont mutuellement exclusives dans le
  // temps (on ne clique jamais deux boutons d'action à la fois).
  const [actionEnCours, setActionEnCours] = useState(false);
  // Audit Cycle 2 (Agent Destructeur) : un lien cassé, un projet supprimé,
  // ou un ID d'une autre organisation (RLS le bloque) faisait rester la
  // page indéfiniment sur "Chargement…" — .single() lève une erreur jamais
  // vérifiée, et demandeData restait "undefined" sans jamais mettre à jour
  // demande. .maybeSingle() + ce drapeau distinguent maintenant "encore en
  // train de charger" de "vraiment introuvable".
  const [introuvable, setIntrouvable] = useState(false);
  // Sprint Robustesse (30/08) — chargerDonnees() (Promise.all de ~6 requêtes)
  // n'était protégée par aucun try/catch : une coupure réseau pendant le
  // chargement initial faisait rejeter le Promise.all sans jamais mettre à
  // jour "demande", laissant la page bloquée sur "Chargement…" à l'infini,
  // sans message ni action possible pour l'artisan. Ce drapeau permet de
  // distinguer "encore en train de charger" (demande === null, pas
  // d'erreur) de "le chargement a échoué" (à afficher avec EtatErreur, qui
  // propose un vrai bouton "Réessayer" relançant chargerDonnees).
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  // Cycle "Release Candidate" 1 (26/08) — annulation propre des appels IA :
  // si l'artisan quitte cette fiche projet (navigation, fermeture d'onglet)
  // pendant qu'un appel à l'analyse/au devis/à la réponse IA est en cours,
  // on annule le fetch au démontage plutôt que de le laisser tourner pour
  // un résultat que personne ne verra jamais. L'annulation remonte jusqu'à
  // la route Next.js (request.signal) puis jusqu'à l'appel Anthropic
  // lui-même (voir lib/ai/client.ts) — inutile de payer un appel IA dont le
  // résultat est certain de ne jamais être affiché.
  const controleursIARef = useRef<Set<AbortController>>(new Set());

  // Refonte (03/10, duel D lot 2) — l'envoi des photos est tenu ici, une
  // seule fois pour la fiche : la tuile « Photo » (champ de l'appareil hors
  // des feuilles) et la feuille « Photos » (galerie) le partagent, avec sa
  // trace et son « Réessayer ».
  const envoiPhotos = useEnvoiPhotos({
    demandeId: params.id,
    onChemins: (photos) => void surNouvellesPhotos(photos),
  });

  useEffect(() => {
    return () => {
      controleursIARef.current.forEach((c) => c.abort());
      controleursIARef.current.clear();
    };
  }, []);

  async function chargerDonnees() {
    // Sprint Robustesse (30/08) — try/catch autour de tout le chargement :
    // sans ça, une exception (fetch rejeté par coupure réseau, timeout...)
    // sur n'importe lequel des appels ci-dessous remontait jusqu'au
    // useEffect appelant sans jamais être rattrapée, et la page restait
    // bloquée sur "Chargement…" indéfiniment (voir rendu plus bas). On
    // efface d'abord une éventuelle erreur précédente : un "Réessayer" qui
    // réussit doit repartir sur un état propre.
    setErreurChargement(null);
    try {
      // Audit performance (11/09) — auth.getUser() sorti du Promise.all
      // ci-dessous et attendu en premier (résout depuis la session déjà
      // connue, quasi immédiat, jamais un aller-retour aussi lent que les
      // requêtes de contenu) pour pouvoir lancer getOrganisationId() EN
      // PARALLÈLE de ces requêtes plutôt qu'après leur avoir toutes
      // attendu — avant ce correctif, une requête indépendante (memberships)
      // attendait inutilement la fin des 5 autres avant même de démarrer.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Ces six appels sont indépendants les uns des autres (aucun ne dépend
      // du résultat d'un autre) : les lancer en parallèle plutôt qu'en série
      // réduit d'autant le temps de chargement de la fiche projet — sensible
      // sur un chantier avec un réseau mobile faible.
      const [
        { data: demandeData },
        { data: devisData },
        { data: notesData },
        { data: evenementsData },
        notesProjet,
        orgId,
        { data: rdvData },
      ] = await Promise.all([
        supabase.from("demandes").select("*").eq("id", params.id).maybeSingle(),
        supabase
          .from("devis")
          .select("*")
          .eq("demande_id", params.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("notes_vocales")
          .select("*")
          .eq("demande_id", params.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("evenements_projet")
          .select("*")
          .eq("demande_id", params.id)
          .order("created_at", { ascending: true }),
        // Notes professionnelles (29/08, voir lib/notes/index.ts) — point 2
        // du brief : section dédiée dans la fiche projet.
        listerNotesProjet(supabase, params.id),
        user ? getOrganisationId(supabase, user.id) : Promise.resolve(null),
        supabase
          .from("evenements_planning")
          .select("*")
          .eq("demande_id", params.id)
          .order("date_heure", { ascending: true }),
      ]);

      if (!demandeData) {
        setIntrouvable(true);
        return;
      }
      setDemande(demandeData as Projet);
      setDevis(devisData as Devis | null);
      setNotesVocales((notesData as NoteVocale[]) ?? []);
      setEvenementsProjet((evenementsData as EvenementProjet[]) ?? []);
      setNotes(notesProjet);
      setRendezVous((rdvData as EvenementPlanning[]) ?? []);
      setMaintenant(new Date());

      if (user) {
        setArtisanId(user.id);
        setOrganisationId(orgId);

        // Ces trois-là dépendent de l'utilisateur (donc après le lot
        // ci-dessus), mais restent indépendantes les unes des autres.
        const [{ data: profil }, { data: parametresData }, comptageAutresProjets] = await Promise.all([
          // Sprint Beta Final (27/08) — 🔴G : "metier" en plus de "nom",
          // pour relier la checklist au métier déclaré (voir
          // lib/checklistsMetier.ts, obtenirChecklist).
          supabase.from("profils").select("nom, metier").eq("id", user.id).single(),
          orgId
            ? supabase
                .from("parametres_entreprise")
                .select("*")
                .eq("organisation_id", orgId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          // "Mémoire client" (06/09) — met en avant un rapprochement déjà
          // fait en interne (table clients, voir lib/clients/index.ts) mais
          // jamais montré à l'artisan jusqu'ici : combien d'AUTRES projets
          // partagent le même client_id. Aucune nouvelle donnée, juste un
          // comptage sur ce qui existe déjà.
          orgId && (demandeData as Projet).client_id
            ? supabase
                .from("demandes")
                .select("id", { count: "exact", head: true })
                .eq("organisation_id", orgId)
                .eq("client_id", (demandeData as Projet).client_id as string)
                .neq("id", params.id)
            : Promise.resolve({ count: 0 }),
        ]);
        setNomArtisan(profil?.nom ?? "");
        setMetierArtisan(profil?.metier ?? null);
        setParametres((parametresData as ParametresEntreprise) ?? null);
        setNbAutresProjetsClient(comptageAutresProjets.count ?? 0);

        if (parametresData?.logo_url) {
          const { data: signe } = await supabase.storage
            .from("logos")
            .createSignedUrl(parametresData.logo_url, 3600);
          setLogoUrl(signe?.signedUrl ?? null);
        } else {
          setLogoUrl(null);
        }
      }
    } catch {
      // Fetch rejeté (réseau coupé, DNS, timeout) — jamais une erreur
      // Supabase "métier" propre, donc message générique de connexion.
      setErreurChargement("Impossible de charger cette fiche projet. Vérifiez votre connexion et réessayez.");
    }
  }

  useEffect(() => {
    chargerDonnees();
    // Un texte IA retouché puis laissé (un appel, l'application fermée)
    // revient tel quel : il n'est pas réécrit par l'IA à la réouverture.
    const garde = lireBrouillon<MessageIA>(`compyo:message-ia:${params.id}`, BASE_MESSAGE_IA);
    if (garde?.texte) {
      setBrouillonReponse(garde.texte);
      setGenreReponse(garde.genre);
      setContexteReponse(garde.contexte);
      setReponseGardee(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Les photos du Carnet : un seul appel groupé pour toutes les URLs
  // signées (le stockage est privé). On garde celles déjà obtenues pour ne
  // pas faire clignoter les miniatures à chaque rechargement.
  const cheminsPhotos = (demande?.photos ?? []).join("|");
  useEffect(() => {
    const chemins = demande?.photos ?? [];
    if (chemins.length === 0) return;
    let annule = false;
    supabase.storage
      .from("photos")
      .createSignedUrls(chemins, 3600)
      .then(({ data }) => {
        if (annule || !data) return;
        const urls: Record<string, string> = {};
        for (const item of data) if (item.signedUrl && !item.error && item.path) urls[item.path] = item.signedUrl;
        setUrlsPhotos((avant) => ({ ...avant, ...urls }));
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheminsPhotos]);

  async function surNouvellesPhotos(photos: string[]) {
    if (!demande) return;
    setDemande({ ...demande, photos });
    if (!demande.photos_ajoutees_le) {
      await supabase
        .from("demandes")
        .update({ photos_ajoutees_le: new Date().toISOString() })
        .eq("id", demande.id);
    }
    await signalerModification();
    await chargerDonnees();
  }

  // Marque le projet comme modifié depuis le dernier devis — utilisé pour
  // proposer (jamais imposer) une mise à jour du devis.
  async function signalerModification() {
    await supabase
      .from("demandes")
      .update({ derniere_modification_le: new Date().toISOString() })
      .eq("id", params.id);
  }

  async function terminerNote(noteId: string, terminee: boolean) {
    // termine_le aussi : c'est la date sous laquelle la tâche faite apparaît
    // dans le Carnet (« Aujourd'hui », pas le jour de sa création).
    const avant = notes.find((n) => n.id === noteId);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, statut: terminee ? "terminee" : "active", termine_le: terminee ? new Date().toISOString() : null }
          : n
      )
    );
    const ok = await marquerNoteTerminee(supabase, noteId, terminee);
    if (!ok && avant) {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? avant : n)));
      setErreur("La tâche n'a pas pu être mise à jour. Réessayez.");
    }
  }

  async function analyserDemande() {
    setErreur(null);
    setChargementAnalyse(true);
    const controleur = new AbortController();
    controleursIARef.current.add(controleur);
    let res: Response;
    try {
      res = await fetch("/api/ai/analyser-demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId: params.id }),
        signal: controleur.signal,
      });
    } catch (err) {
      controleursIARef.current.delete(controleur);
      setChargementAnalyse(false);
      // AbortError = la page a été quittée entre-temps (cleanup ci-dessus) :
      // pas d'erreur à afficher, il n'y a plus personne pour la lire.
      if ((err as Error).name !== "AbortError") {
        setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.", "analyse");
      }
      return;
    }
    controleursIARef.current.delete(controleur);
    setChargementAnalyse(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreur(data?.error ?? "L'analyse a échoué. Réessayez.", "analyse");
      return;
    }

    // (13/09) — Les tâches restantes et la détection d'urgence viennent
    // désormais de CETTE analyse, et plus d'un appel IA par note vocale
    // dictée. Voir app/api/ai/analyser-demande/route.ts pour le
    // raisonnement : un seul appel au lieu d'un par note, et un meilleur
    // résultat puisque l'IA voit toutes les notes ensemble.
    const donneesAnalyse = await res.json().catch(() => null);
    const tachesRestantes: string[] = Array.isArray(donneesAnalyse?.tachesRestantes)
      ? donneesAnalyse.tachesRestantes
      : [];

    if (artisanId && organisationId) {
      await enregistrerEvenement(supabase, {
        demandeId: params.id,
        artisanId,
        organisationId,
        type: "analyse_ia",
        titre: demande?.questions_manquantes ? "Résumé mis à jour par l'IA" : "Projet analysé avec l'IA",
      });

      // Signal de clôture consommé par le tableau de bord (voir
      // app/dashboard/page.tsx) : il venait de l'interprétation note par
      // note, désormais supprimée. Sans cet événement, la détection
      // "chantier probablement terminé" cesserait de fonctionner en silence.
      await enregistrerEvenement(supabase, {
        demandeId: params.id,
        artisanId,
        organisationId,
        type: "journal_chantier_interprete",
        titre: "Analyse du chantier",
        detail:
          tachesRestantes.length > 0
            ? `${tachesRestantes.length} tâche${tachesRestantes.length > 1 ? "s" : ""} restante${tachesRestantes.length > 1 ? "s" : ""}`
            : "Aucune tâche restante détectée",
        metadata: { chantier_semble_termine: donneesAnalyse?.chantierSembleTermine === true },
      });

      // (13/09) — On ne crée plus la note tout seul : l'artisan voit
      // d'abord ce que l'IA propose et décide. Même principe que la
      // proposition d'urgence, et même raison : tant qu'il ne sait pas
      // encore si ces listes lui conviennent, mieux vaut demander que
      // remplir ses notes à sa place.
      if (tachesRestantes.length > 0) {
        setTachesProposees(tachesRestantes);
      }

      // L'IA propose, l'artisan valide : on n'applique jamais l'urgence
      // directement ici — sauf si l'artisan a lui-même activé le mode auto
      // (voir components/dashboard/PropositionUrgence.tsx et Mon compte).
      if (donneesAnalyse?.urgenceDetectee === true && demande?.priorite !== "urgent") {
        const { data: profil } = await supabase
          .from("profils")
          .select("urgence_auto_ia")
          .eq("id", artisanId)
          .single();
        if (profil?.urgence_auto_ia) {
          await supabase.from("demandes").update({ priorite: "urgent" }).eq("id", params.id);
          await enregistrerEvenement(supabase, {
            demandeId: params.id,
            artisanId,
            organisationId,
            type: "priorite_changee",
            titre: "Priorité changée : Urgent",
            detail: "Détecté automatiquement par l'IA lors de l'analyse (mode auto activé dans vos réglages).",
          });
        } else {
          setUrgenceProposee(true);
        }
      }
    }
    await chargerDonnees();
  }

  // Crée (ou remplace) l'unique note "Tâches restantes" du projet, après
  // accord explicite de l'artisan.
  async function accepterTaches() {
    if (!tachesProposees || !artisanId || !organisationId) return;
    setAjoutTachesEnCours(true);
    const description = tachesProposees.map((t) => `- ${t}`).join("\n");
    const existante = notes.find(
      (n) => n.statut === "active" && n.titre.startsWith(TITRE_NOTE_TACHES)
    );
    if (existante) {
      await supabase
        .from("notes")
        .update({ description, updated_at: new Date().toISOString() })
        .eq("id", existante.id);
    } else {
      await creerNote(supabase, {
        organisationId,
        artisanId,
        demandeId: params.id,
        titre: TITRE_NOTE_TACHES,
        description,
        importance: "verte",
        rappelA: null,
      });
    }
    setAjoutTachesEnCours(false);
    setTachesProposees(null);
    await chargerDonnees();
  }

  async function genererDevis() {
    if (!demande) return;
    // Avant de lancer le calcul, on prévient si l'IA a elle-même signalé des
    // informations manquantes non résolues (ex : mesures, accès chantier) —
    // un devis généré sans ça a de bonnes chances d'être faux. On ne
    // bloque jamais complètement (l'artisan reste seul décideur), on
    // s'assure juste qu'il valide en connaissance de cause.
    const infosManquantes = (demande.questions_manquantes?.informations_manquantes ?? []).filter(
      (info) => !(/photo/i.test(info) && (demande.photos?.length ?? 0) > 0)
    );
    // Remplacé le 13/09 : c'était une fenêtre window.confirm, celle grise du
    // navigateur, qui affichait cette liste sans aucune mise en forme, avec
    // "compyo.fr indique" en titre et des boutons OK/Annuler. Pour un écran
    // où l'artisan s'apprête à chiffrer plusieurs milliers d'euros, ça
    // faisait bricolage. La question est la même, posée dans l'interface.
    if (infosManquantes.length > 0) {
      setInfosAConfirmer(infosManquantes);
      return;
    }

    await lancerGenerationDevis();
  }

  async function lancerGenerationDevis() {
    setInfosAConfirmer(null);
    setErreur(null);
    setChargementDevis(true);
    const devisExistaitDeja = Boolean(devis) && devis?.statut !== "refuse";
    const controleur = new AbortController();
    controleursIARef.current.add(controleur);
    let res: Response;
    try {
      res = await fetch("/api/ai/generer-devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId: params.id }),
        signal: controleur.signal,
      });
    } catch (err) {
      controleursIARef.current.delete(controleur);
      setChargementDevis(false);
      if ((err as Error).name !== "AbortError") {
        setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.", "devis");
      }
      return;
    }
    controleursIARef.current.delete(controleur);
    setChargementDevis(false);

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErreur(data?.error ?? "La génération du devis a échoué. Réessayez.", "devis");
      return;
    }
    if (artisanId && organisationId) {
      await enregistrerEvenement(supabase, {
        demandeId: params.id,
        artisanId,
        organisationId,
        type: "devis_genere",
        titre: devisExistaitDeja ? "Devis mis à jour" : "Devis généré",
      });
    }
    // 17/09 — demandé par Axel : le devis généré s'ouvre directement dans
    // son espace, avec le vrai PDF à côté, au lieu de s'empiler ici.
    if (data?.devis?.id) {
      router.push(adresseEspaceDevis(data.devis.id));
      return;
    }
    await chargerDonnees();
  }

  async function dupliquerDevis() {
    if (!devis) return;
    setErreur(null);
    setChargementDevis(true);
    const resultat = await creerNouvelleVersion(
      { supabase, artisanId, organisationId },
      { devisId: devis.id, demandeId: params.id }
    );
    if (!resultat.ok) {
      setChargementDevis(false);
      setErreur(resultat.erreur, "devis");
      return;
    }
    router.push(adresseEspaceDevis(resultat.nouveauDevisId));
  }

  // Rappel client récurrent (06/09) — voir lib/notes/index.ts. Un clic,
  // pas de formulaire : crée directement une note avec rappel programmé.
  async function creerRappelRecurrent(mois: number) {
    if (!artisanId || !organisationId) return;
    setRappelRecurrentEnCours(mois);
    const { note, erreur: erreurCreation } = await creerRappelRecurrentClient(supabase, {
      organisationId,
      artisanId,
      demandeId: params.id,
      nomClient: demande?.nom_client ?? "ce client",
      mois,
    });
    setRappelRecurrentEnCours(null);
    if (erreurCreation || !note) {
      setErreur(erreurCreation ?? "Impossible de programmer le rappel.");
      return;
    }
    setRappelRecurrentCree(mois);
    listerNotesProjet(supabase, params.id).then(setNotes);
  }

  // "Devis express" (06/09) — audit métier : pour un serrurier, un vitrier,
  // un dépannage chiffré sur place, le cycle "décrire → analyser → générer
  // par IA" n'apporte rien — le travail est déjà fait au moment de
  // chiffrer, il n'y a rien à analyser. Saute directement à un devis
  // brouillon avec une ligne vide (voir /api/devis/creer-vide), rempli à
  // la main dans le même écran ValiderDevis déjà utilisé pour un devis
  // généré par IA — aucune nouvelle UI de saisie à maintenir.
  async function creerDevisExpress() {
    setErreur(null);
    setChargementDevis(true);
    try {
      const res = await fetch("/api/devis/creer-vide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId: params.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Impossible de créer le devis express. Réessayez.", "devis");
        return;
      }
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: params.id,
          artisanId,
          organisationId,
          type: "devis_genere",
          titre: "Devis express créé",
        });
      }
      if (data?.devis?.id) {
        router.push(adresseEspaceDevis(data.devis.id));
        return;
      }
      await chargerDonnees();
    } catch {
      setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.", "devis");
    } finally {
      setChargementDevis(false);
    }
  }

  async function genererReponse(contexteSupplementaire?: string, genre: MessageIA["genre"] = "reponse") {
    setErreur(null);
    setChargementReponse(true);
    setCopie(false);
    setErreurEnvoiReponse(false);
    setContexteReponse(contexteSupplementaire);
    setGenreReponse(genre);
    const controleur = new AbortController();
    controleursIARef.current.add(controleur);
    let res: Response;
    try {
      res = await fetch("/api/ai/generer-reponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId: params.id, contexteSupplementaire }),
        signal: controleur.signal,
      });
    } catch (err) {
      controleursIARef.current.delete(controleur);
      setChargementReponse(false);
      if ((err as Error).name !== "AbortError") {
        setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.", "reponse");
      }
      return;
    }
    controleursIARef.current.delete(controleur);
    setChargementReponse(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreur(data?.error ?? "La préparation de la réponse a échoué. Réessayez.", "reponse");
      return;
    }
    const data = await res.json();
    setBrouillonReponse(data.brouillon);
    // Une nouvelle version demandée remplace le texte retouché : le
    // brouillon local ne garde que ce que l'artisan écrit lui-même.
    effacerBrouillon(cleMessageIA);
    setReponseGardee(false);
  }

  function changerReponse(texte: string) {
    setBrouillonReponse(texte);
    ecrireBrouillon<MessageIA>(cleMessageIA, BASE_MESSAGE_IA, { texte, genre: genreReponse, contexte: contexteReponse });
    setReponseGardee(true);
  }

  // L'IA propose, l'artisan relit puis envoie lui-même : on ouvre ses SMS
  // ou son WhatsApp, texte prêt, au numéro du client (comme les modèles de
  // FeuilleMessageClient). La trace dit « préparé », jamais « envoyé ».
  function envoyerReponse(canal: Canal) {
    const telephone = demande?.telephone_client;
    if (!telephone || !brouillonReponse.trim()) return;
    if (!ouvrirMessage(canal, telephone, brouillonReponse)) {
      setErreurEnvoiReponse(true);
      return;
    }
    setErreurEnvoiReponse(false);
    void tracerMessagePrepare(supabase, { demandeId: params.id, cle: genreReponse, canal });
    effacerBrouillon(cleMessageIA);
    setReponseGardee(false);
  }

  // Sprint "Relance suggérée" (06/09) — le résumé de fin de journée détecte
  // déjà les devis envoyés sans réponse depuis plusieurs jours (voir
  // app/api/ai/resume-journee/route.ts), mais ne proposait jusqu'ici aucune
  // action directe. Réutilise /api/ai/generer-reponse (déjà existant, déjà
  // validé par l'artisan avant tout envoi) avec un contexte de relance
  // plutôt que de dupliquer un nouvel appel IA — même philosophie que le
  // reste du produit : l'IA propose, l'artisan décide et envoie lui-même.
  function genererRelance() {
    setFeuilleReponse(true);
    // Un texte déjà retouché n'est jamais réécrit sans qu'on le demande
    // (« Autre version ») : rien ne se perd.
    if (reponseGardee && brouillonReponse) return;
    const jours = joursDepuisEnvoiDevis();
    genererReponse(
      jours
        ? `Le client n'a pas répondu depuis ${jours} jour${jours > 1 ? "s" : ""} après l'envoi du devis. Rédige un message de relance courtois qui donne simplement des nouvelles et demande si le devis convient, sans être insistant.`
        : "Rédige un message de relance courtois qui donne des nouvelles et demande si le devis envoyé convient, sans être insistant.",
      "relanceDevis"
    );
  }

  function joursDepuisEnvoiDevis(): number | null {
    if (!devis?.envoye_le) return null;
    const jours = Math.floor((Date.now() - new Date(devis.envoye_le).getTime()) / 86400000);
    return jours > 0 ? jours : null;
  }

  async function copierReponse() {
    // « Copié » ne s'affiche qu'une fois la copie faite (le presse-papiers
    // peut être refusé).
    try {
      await navigator.clipboard.writeText(brouillonReponse);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  async function changerPriorite(priorite: Projet["priorite"]) {
    if (!demande) return;
    const ancienneValeur = demande.priorite;
    setDemande({ ...demande, priorite });
    const { error } = await supabase
      .from("demandes")
      .update({ priorite })
      .eq("id", demande.id);

    if (error) {
      setDemande((d) => (d ? { ...d, priorite: ancienneValeur } : d));
      setErreur("Impossible d'enregistrer la priorité.");
    } else if (artisanId && organisationId && priorite !== ancienneValeur) {
      const labels = { urgent: "Urgent", important: "Important", normal: "Normal" };
      await enregistrerEvenement(supabase, {
        demandeId: demande.id,
        artisanId,
        organisationId,
        type: "priorite_changee",
        titre: `Priorité changée : ${labels[priorite]}`,
      });
      await chargerDonnees();
    }
  }

  async function marquerEnCours() {
    if (!demande || actionEnCours) return;
    setActionEnCours(true);
    try {
      const { data, error } = await supabase
        .from("demandes")
        .update({ statut: "en_cours", demarre_le: new Date().toISOString() })
        .eq("id", demande.id)
        .select("id");
      if (error || !data || data.length === 0) {
        setErreur("Impossible de démarrer le chantier. Réessayez.");
        return;
      }
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: demande.id,
          artisanId,
          organisationId,
          type: "chantier_demarre",
          titre: "Chantier démarré",
        });
      }
      await chargerDonnees();
    } finally {
      setActionEnCours(false);
    }
  }

  async function marquerTermine() {
    if (!demande || actionEnCours) return;
    setActionEnCours(true);
    try {
      const { data, error } = await supabase
        .from("demandes")
        .update({ statut: "termine", termine_le: new Date().toISOString() })
        .eq("id", demande.id)
        .select("id");
      if (error || !data || data.length === 0) {
        setErreur("Impossible de marquer le chantier terminé. Réessayez.");
        return;
      }
      // 27/09 — Le planning suit : les rendez-vous du chantier jusqu'à ce
      // soir passent en « fait » (voir actionsEvenement.ts).
      await marquerRendezVousDuChantierFaits(supabase, demande.id);
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: demande.id,
          artisanId,
          organisationId,
          type: "chantier_termine",
          titre: "Chantier terminé",
        });
      }
      await chargerDonnees();
    } finally {
      setActionEnCours(false);
    }
  }

  async function marquerVisite() {
    if (!demande || actionEnCours) return;
    setActionEnCours(true);
    try {
    const { data, error } = await supabase
      .from("demandes")
      .update({ visite_le: new Date().toISOString() })
      .eq("id", demande.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setErreur("Impossible d'enregistrer la visite. Réessayez.");
      return;
    }
    if (artisanId && organisationId) {
      await enregistrerEvenement(supabase, {
        demandeId: demande.id,
        artisanId,
        organisationId,
        type: "visite_effectuee",
        titre: "Visite chantier effectuée",
      });
    }
    await chargerDonnees();
    } finally {
      setActionEnCours(false);
    }
  }

  const [notesLocales, setNotesLocales] = useState("");
  const [notesEnregistrees, setNotesEnregistrees] = useState(false);
  // Sprint Robustesse (30/08) — voir enregistrerNotes ci-dessous : un échec
  // Supabase (RLS, contrainte, coupure réseau) ne déclenchait ni le "✓
  // Enregistré" ni aucun message d'erreur, l'artisan croyant sa note
  // enregistrée alors qu'elle ne l'était pas.
  const [erreurNotes, setErreurNotes] = useState<string | null>(null);

  // Refonte (02/10, duel D lot 1) — « rien ne se perd » : le mémo ne
  // s'enregistrait qu'en quittant le champ. Un appel, un changement
  // d'application ou une page rechargée avant ce moment perdait la saisie.
  // Il est maintenant gardé sur le téléphone à chaque frappe (même
  // mécanisme que le devis, lib/brouillonLocal.ts), puis effacé une fois
  // enregistré. La « base » est le mémo en base : s'il a changé ailleurs
  // entre-temps, le brouillon périmé est ignoré.
  const cleMemo = demande ? `compyo:memo:${demande.id}` : null;
  useEffect(() => {
    if (!demande) return;
    const base = empreinte(demande.notes ?? "");
    const brouillon = lireBrouillon<string>(`compyo:memo:${demande.id}`, base);
    setNotesLocales(brouillon ?? demande.notes ?? "");
  }, [demande?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function changerNotes(v: string) {
    setNotesLocales(v);
    if (cleMemo && demande) ecrireBrouillon(cleMemo, empreinte(demande.notes ?? ""), v);
  }

  async function enregistrerNotes() {
    if (!demande) return;
    // Rien à faire si la note n'a pas changé depuis le dernier blur —
    // évite de spammer la timeline à chaque clic hors du champ.
    if (notesLocales === (demande.notes ?? "")) return;

    // Sprint Robustesse (30/08) — `if (!error)` sans `else` : un échec
    // Supabase passait totalement inaperçu (voir lib/supabase/resultat.ts).
    // executerMutation force à traiter explicitement le cas d'échec.
    const resultat = await executerMutation(
      supabase
        .from("demandes")
        .update({ notes: notesLocales, derniere_modification_le: new Date().toISOString() })
        .eq("id", demande.id),
      "Impossible d'enregistrer. Réessayez."
    );
    if (!resultat.ok) {
      setErreurNotes(resultat.erreur);
      return;
    }
    setErreurNotes(null);
    if (cleMemo) effacerBrouillon(cleMemo);
    setNotesEnregistrees(true);
    setTimeout(() => setNotesEnregistrees(false), 1500);
    if (artisanId && organisationId && notesLocales.trim()) {
      await enregistrerEvenement(supabase, {
        demandeId: demande.id,
        artisanId,
        organisationId,
        type: "note_ajoutee",
        titre: "Note ajoutée",
        detail: notesLocales.slice(0, 80) + (notesLocales.length > 80 ? "…" : ""),
      });
    }
    setDemande({ ...demande, notes: notesLocales });
    await chargerDonnees();
  }

  // Informations complémentaires (facultatives, ajoutées après coup)
  const [infos, setInfos] = useState({
    telephone_client: "",
    adresse_client: "",
    type_chantier: "autre",
  });
  // Sprint Robustesse (30/08) — même bug que erreurNotes ci-dessus : un
  // échec Supabase sur enregistrerInfos ne se traduisait par rien à
  // l'écran, l'artisan pensant ses coordonnées client enregistrées.
  const [erreurInfos, setErreurInfos] = useState<string | null>(null);

  useEffect(() => {
    if (demande) {
      setInfos({
        telephone_client: demande.telephone_client ?? "",
        adresse_client: demande.adresse_client ?? "",
        type_chantier: demande.type_chantier ?? "autre",
      });
    }
  }, [demande?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enregistrerInfos(): Promise<boolean> {
    if (!demande) return false;
    const resultat = await executerMutation(
      supabase
        .from("demandes")
        .update({
          telephone_client: infos.telephone_client || null,
          adresse_client: infos.adresse_client || null,
          type_chantier: infos.type_chantier,
        })
        .eq("id", demande.id),
      "Impossible d'enregistrer. Réessayez."
    );
    if (!resultat.ok) {
      setErreurInfos(resultat.erreur);
      return false;
    }
    setErreurInfos(null);
    if (artisanId && organisationId) {
      await enregistrerEvenement(supabase, {
        demandeId: demande.id,
        artisanId,
        organisationId,
        type: "infos_completees",
        titre: "Informations complétées",
      });
    }
    await chargerDonnees();
    return true;
  }

  if (introuvable) {
    return (
      <div className="p-8 max-w-lg">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">Projet</p>
        <h1 className="font-display text-xl font-semibold">Projet introuvable</h1>
        <p className="mt-2 text-sm text-ink/60">
          Ce projet n&apos;existe pas, a été supprimé, ou n&apos;appartient pas à votre organisation.
        </p>
        <Link
          href="/dashboard/demandes"
          className="mt-4 inline-flex text-sm text-signal underline underline-offset-2 hover:text-signal-fonce"
        >
          ← Retour à la liste des projets
        </Link>
      </div>
    );
  }

  // Sprint Robustesse (30/08) — si le chargement initial a échoué (réseau
  // coupé, timeout...), on ne reste plus indéfiniment sur "Chargement…" :
  // EtatErreur affiche un message compréhensible + un bouton "Réessayer"
  // qui relance chargerDonnees. On ne remplace la page que si "demande"
  // n'a encore jamais été chargée avec succès (un échec de rechargement
  // après une action, lui, ne doit pas faire disparaître la fiche déjà
  // affichée à l'écran).
  if (erreurChargement && !demande) {
    return (
      <div className="p-8 max-w-lg">
        <EtatErreur message={erreurChargement} onReessayer={chargerDonnees} />
      </div>
    );
  }

  if (!demande) {
    return <SquelettePage />;
  }

  // « Le projet a changé depuis le devis » : la détection et le choix de
  // l'action (mettre à jour un devis pas encore accepté, dupliquer un devis
  // accepté ou en cours — jamais l'écraser) sont dans prochaineAction.ts.

  // L'analyse IA ne sert qu'à mettre en ordre des notes déjà accumulées —
  // sans rien de plus que la description initiale, il n'y a rien à
  // structurer, et lancer l'IA quand même serait un appel gaspillé pour un
  // résultat qui ne ferait que répéter la description. Même vérification
  // que côté serveur (voir /api/ai/analyser-demande), pour désactiver le
  // bouton avant même de cliquer plutôt que d'afficher une erreur après coup.
  const peutAnalyser =
    Boolean(demande.notes?.trim()) ||
    Boolean(demande.informations_disponibles?.trim()) ||
    notesVocales.length > 0;

  // Une analyse existe déjà et rien n'a été ajouté depuis (même logique que
  // le devis périmé de prochaineAction.ts, appliquée à l'analyse) :
  // inutile de relancer l'IA en boucle pour reproduire le même résultat.
  const analyseAJour =
    Boolean(demande.questions_manquantes) &&
    Boolean(demande.derniere_analyse_le) &&
    (!demande.derniere_modification_le ||
      new Date(demande.derniere_modification_le) <= new Date(demande.derniere_analyse_le as string));

  // Les projets créés avant le journal d'évènements n'en ont aucun : on
  // reconstruit les grandes étapes à partir des dates connues (sans les
  // notes vocales ni les photos, déjà présentes dans le Carnet).
  const evenementsCarnet: EvenementProjet[] =
    evenementsProjet.length > 0
      ? evenementsProjet
      : construireHistoriqueHerite(demande, devis, [])
          .filter((item) => item.label !== "Photos ajoutées")
          .map((item, i) => ({
            id: `herite-${i}`,
            demande_id: demande.id,
            artisan_id: demande.artisan_id,
            organisation_id: demande.organisation_id,
            type: "projet_cree",
            titre: item.label,
            detail: item.detail ?? null,
            metadata: null,
            created_at: item.date,
          }));

  const actions: Record<IdAction, () => void> = {
    generer_devis: genererDevis,
    mettre_a_jour_devis: genererDevis,
    devis_express: creerDevisExpress,
    analyser: analyserDemande,
    ouvrir_devis: () => devis && router.push(adresseEspaceDevis(devis.id)),
    relancer: genererRelance,
    dupliquer_devis: dupliquerDevis,
    planifier: () => router.push(`/dashboard/planning/nouveau?projetId=${demande.id}`),
    demarrer: marquerEnCours,
    terminer: marquerTermine,
    ajouter: () => {},
    facturation: () => {},
  };

  const factures =
    devis &&
    devis.statut !== "brouillon" &&
    devis.statut !== "refuse" &&
    ["accepte", "en_cours", "termine"].includes(demande.statut) ? (
      <FacturesProjet
        devis={devis}
        nomClient={demande.nom_client}
        telephoneClient={demande.telephone_client}
        adresseClient={demande.adresse_client}
        logoUrl={logoUrl}
      />
    ) : null;

  return (
    <>
      <VueProjet
        signature={{ nom: nomArtisan, entreprise: parametres?.nom_entreprise ?? null }}
        projet={demande}
        devis={devis}
        notesVocales={notesVocales}
        notes={notes}
        evenements={evenementsCarnet}
        rendezVous={rendezVous}
        urlsPhotos={urlsPhotos}
        nbAutresProjetsClient={nbAutresProjetsClient}
        checklistMetier={obtenirChecklist(demande.type_chantier, metierArtisan)}
        peutAnalyser={peutAnalyser}
        analyseAJour={analyseAJour}
        maintenant={maintenant}
        chargement={{
          generer_devis: chargementDevis,
          mettre_a_jour_devis: chargementDevis,
          devis_express: chargementDevis,
          dupliquer_devis: chargementDevis,
          analyser: chargementAnalyse,
          relancer: chargementReponse,
          demarrer: actionEnCours,
          terminer: actionEnCours,
        }}
        erreur={sectionErreur === "reponse" ? null : erreur}
        surAction={(id) => actions[id]()}
        surTerminerNote={terminerNote}
        surChangerPriorite={changerPriorite}
        surMarquerVisite={marquerVisite}
        surPreparerReponse={() => {
          setFeuilleReponse(true);
          if (!brouillonReponse) genererReponse();
        }}
        memo={{
          valeur: notesLocales,
          surChanger: changerNotes,
          surEnregistrer: enregistrerNotes,
          enregistre: notesEnregistrees,
        }}
        lienPlanifier={`/dashboard/planning/nouveau?projetId=${demande.id}`}
        rendus={{
          vocal: (fermer) => (
            <NotesVocales
              demandeId={demande.id}
              notes={notesVocales}
              telephoneClient={demande.telephone_client}
              masquerListe
              demarrerAuMontage
              onNouvelleNote={async () => {
                fermer();
                await signalerModification();
                await chargerDonnees();
              }}
            />
          ),
          photos: (
            <PhotosProjet
              demandeId={demande.id}
              chemins={demande.photos ?? []}
              onChemins={(photos) => void surNouvellesPhotos(photos)}
              envoi={envoiPhotos}
            />
          ),
          capture: {
            idChamp: idChampAppareil(demande.id),
            envoi: envoiPhotos.envoi,
            champ: <ChampAppareil demandeId={demande.id} envoi={envoiPhotos} />,
            etat: (surVoir) => <EtatEnvoiPhotos envoi={envoiPhotos} surVoir={surVoir} />,
          },
          note: (fermer) => (
            <FormulaireNote
              projetIdFixe={demande.id}
              nomProjetFixe={demande.nom_client}
              onCree={() => {
                fermer();
                listerNotesProjet(supabase, demande.id).then(setNotes);
              }}
              onAnnuler={fermer}
            />
          ),
          infos: (fermer) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Téléphone du client"
                type="tel"
                value={infos.telephone_client}
                onChange={(e) => setInfos({ ...infos, telephone_client: e.target.value })}
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink/70">Type de chantier</label>
                <select
                  value={infos.type_chantier}
                  onChange={(e) => setInfos({ ...infos, type_chantier: e.target.value })}
                  aria-label="Type de chantier"
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/15"
                >
                  {TYPES_CHANTIER.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Adresse du chantier"
                  value={infos.adresse_client}
                  onChange={(e) => setInfos({ ...infos, adresse_client: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button
                  onClick={async () => {
                    if (await enregistrerInfos()) fermer();
                  }}
                >
                  Enregistrer
                </Button>
                {erreurInfos && <ErreurInline message={erreurInfos} onReessayer={enregistrerInfos} />}
              </div>
            </div>
          ),
          factures,
          erreurMemo: erreurNotes ? (
            <ErreurInline message={erreurNotes} onReessayer={enregistrerNotes} className="mt-2" />
          ) : null,
          propositionUrgence:
            urgenceProposee && artisanId && organisationId ? (
              <div className="mt-4">
                <PropositionUrgence
                  demandeId={params.id}
                  artisanId={artisanId}
                  organisationId={organisationId}
                  onTraite={async () => {
                    setUrgenceProposee(false);
                    await chargerDonnees();
                  }}
                />
              </div>
            ) : null,
          // Refonte (03/10, duel D lot 1) — règles 3, 4, 5 et 17 : un seul
          // bouton plein par écran (« Oui » passe en contour), des cibles de
          // 48 px, un succès écrit en encre à côté d'une coche verte.
          propositionTaches:
            tachesProposees && tachesProposees.length > 0 ? (
              <div className="mt-3 rounded-2xl bg-paper-warm p-4">
                <p className="text-base font-semibold text-ink">L&apos;IA a repéré ces tâches. Les ajouter ?</p>
                <ul className="mt-2 space-y-1 text-base text-ink">
                  {tachesProposees.map((t) => (
                    <li key={t}>· {t}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" onClick={accepterTaches} loading={ajoutTachesEnCours}>
                    Oui, les ajouter
                  </Button>
                  <button type="button" onClick={() => setTachesProposees(null)} disabled={ajoutTachesEnCours} className={BOUTON_TEXTE}>
                    Non merci
                  </button>
                </div>
              </div>
            ) : null,
          apresMaintenant:
            demande.statut === "termine" && TYPES_CHANTIER_RAPPEL_RECURRENT.includes(demande.type_chantier) ? (
              <div className="mt-4 border-t border-ink/15 pt-3">
                <p className="text-sm text-steel">Rappel de suivi</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESETS_RAPPEL_RECURRENT.map(({ mois, libelle }) => (
                    <button
                      key={mois}
                      type="button"
                      onClick={() => creerRappelRecurrent(mois)}
                      disabled={rappelRecurrentEnCours !== null}
                      className={BOUTON_CONTOUR}
                    >
                      {rappelRecurrentEnCours === mois && (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden />
                      )}
                      {libelle}
                    </button>
                  ))}
                </div>
                <div aria-live="polite">
                  {rappelRecurrentCree !== null && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink">
                      <IconeCoche className="h-4 w-4 shrink-0 text-succes" />
                      <span className="truncate">
                        Rappel programmé, {PRESETS_RAPPEL_RECURRENT.find((p) => p.mois === rappelRecurrentCree)?.libelle.toLowerCase()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ) : null,
        }}
      />

      {/* Avant de chiffrer, si l'analyse a signalé des manques : on demande,
          sans jamais bloquer. */}
      <Feuille
        ouverte={Boolean(infosAConfirmer && infosAConfirmer.length > 0)}
        titre="Il manque peut-être quelques informations"
        surFermer={() => setInfosAConfirmer(null)}
      >
        <ul className="flex flex-col gap-1.5 text-base text-ink">
          {(infosAConfirmer ?? []).map((info) => (
            <li key={info} className="flex gap-2">
              <span className="shrink-0" aria-hidden="true">
                ·
              </span>
              <span>{info}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-steel">Le devis reste modifiable avant l&apos;envoi.</p>
        <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Button onClick={lancerGenerationDevis} className="min-h-14 w-full sm:w-auto">
            Préparer quand même
          </Button>
          <button type="button" onClick={() => setInfosAConfirmer(null)} className={`self-center ${BOUTON_TEXTE}`}>
            Compléter d&apos;abord
          </button>
        </div>
      </Feuille>

      {/* Un message au client (réponse ou relance), écrit par l'IA : à
          relire et retoucher, puis à ouvrir dans ses SMS ou son WhatsApp.
          Refonte (03/10, duel D lot 1) — on y arrive par « Message ›
          Écrire avec l'IA » ou par « Relancer avec l'IA » ; plus de
          copier-coller (« Copier » reste, en bouton texte). */}
      <Feuille ouverte={feuilleReponse} titre="Écrire avec l'IA" surFermer={() => setFeuilleReponse(false)}>
        {chargementReponse && !brouillonReponse && (
          <div aria-busy="true" aria-label="Rédaction en cours">
            <Skeleton className="h-44 rounded-2xl" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          </div>
        )}
        {erreur && sectionErreur === "reponse" && (
          <ErreurInline message={erreur} onReessayer={() => genererReponse(contexteReponse, genreReponse)} />
        )}
        {brouillonReponse && (
          <>
            <label htmlFor="message-ia" className="block truncate text-sm text-steel">
              Relisez, puis envoyez.
            </label>
            <textarea
              id="message-ia"
              value={brouillonReponse}
              onChange={(e) => changerReponse(e.target.value)}
              rows={8}
              className="mt-2 w-full resize-none rounded-2xl bg-surface p-3 text-base text-ink ring-1 ring-inset ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink"
            />
            {reponseGardee && <p className="mt-1 text-sm text-steel">Gardé sur ce téléphone.</p>}
            {demande.telephone_client ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => envoyerReponse("sms")}
                  className="min-h-14 rounded-2xl bg-ink text-base font-semibold text-paper active:bg-ink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  SMS
                </button>
                <button type="button" onClick={() => envoyerReponse("whatsapp")} className={`${BOUTON_CONTOUR} min-h-14`}>
                  WhatsApp
                </button>
              </div>
            ) : (
              <>
                <p className="mt-3 truncate text-sm text-steel">Pas de numéro pour ce client.</p>
                <Button onClick={copierReponse} className="mt-2 min-h-14 w-full">
                  {copie ? "Copié" : "Copier le texte"}
                </Button>
              </>
            )}
            <div aria-live="polite">
              {erreurEnvoiReponse && (
                <p className="mt-2 text-sm font-semibold text-signal-fonce dark:text-signal-clair">Numéro inutilisable. Corrigez-le dans les infos.</p>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
              {demande.telephone_client && (
                <button type="button" onClick={copierReponse} className={`-ml-3 ${BOUTON_TEXTE}`}>
                  {copie ? "Copié" : "Copier"}
                </button>
              )}
              <button
                type="button"
                onClick={() => genererReponse(contexteReponse, genreReponse)}
                disabled={chargementReponse}
                className={`-mr-3 ml-auto ${BOUTON_TEXTE}`}
              >
                {chargementReponse && (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden />
                )}
                Autre version
              </button>
            </div>
          </>
        )}
      </Feuille>
    </>
  );
}

// Repli pour les projets créés avant l'introduction de evenements_projet :
// reconstruit un historique approximatif à partir des colonnes existantes.
// Peut être retiré une fois tous les projets de la bêta enrichis.
function construireHistoriqueHerite(
  demande: Projet,
  devis: Devis | null,
  notesVocales: NoteVocale[]
): TimelineItem[] {
  const items: TimelineItem[] = [
    { date: demande.created_at, label: "Premier contact" },
  ];

  if (demande.photos_ajoutees_le) {
    items.push({ date: demande.photos_ajoutees_le, label: "Photos ajoutées" });
  }

  notesVocales.forEach((n) => {
    items.push({
      date: n.created_at,
      label: "Note vocale ajoutée",
      detail: n.transcription.slice(0, 80) + (n.transcription.length > 80 ? "…" : ""),
    });
  });

  if (demande.visite_le) {
    items.push({ date: demande.visite_le, label: "Visite chantier effectuée" });
  }

  if (devis) {
    items.push({ date: devis.created_at, label: "Devis généré" });
    if (devis.envoye_le) {
      items.push({ date: devis.envoye_le, label: "Devis noté envoyé" });
    }
  }
  if (demande.accepte_le) {
    items.push({ date: demande.accepte_le, label: "Devis accepté par le client" });
  }
  if (demande.demarre_le) {
    items.push({ date: demande.demarre_le, label: "Chantier démarré" });
  }
  if (demande.termine_le) {
    items.push({ date: demande.termine_le, label: "Chantier terminé" });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
