"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { SITE_URL } from "@/lib/site";
import { enregistrerEvenement } from "@/lib/timeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { DevisPreview } from "@/components/dashboard/DevisPreview";
import { ValiderDevis } from "@/components/dashboard/ValiderDevis";
import { FacturesProjet } from "@/components/dashboard/FacturesProjet";
import { NotesVocales } from "@/components/dashboard/NotesVocales";
import { PropositionUrgence } from "@/components/dashboard/PropositionUrgence";
import { PhotosProjet } from "@/components/dashboard/PhotosProjet";
import { Timeline, type TimelineItem } from "@/components/dashboard/Timeline";
import { LABEL_TYPE_CHANTIER } from "@/components/dashboard/DemandeCard";
import { obtenirChecklist } from "@/lib/checklistsMetier";
import {
  listerNotesProjet,
  marquerNoteTerminee,
  creerNote,
  creerRappelRecurrentClient,
  TYPES_CHANTIER_RAPPEL_RECURRENT,
  PRESETS_RAPPEL_RECURRENT,
} from "@/lib/notes";
import { NoteCard } from "@/components/notes/NoteCard";
import { FormulaireNote } from "@/components/notes/FormulaireNote";
// Sprint Robustesse (30/08) — outils partagés pour les mutations Supabase
// (voir lib/supabase/resultat.ts) et pour l'affichage d'un échec de
// chargement de page (voir components/ui/EtatErreur.tsx).
import { executerMutation } from "@/lib/supabase/resultat";
import { EtatErreur, ErreurInline } from "@/components/ui/EtatErreur";
import type { Projet, Devis, NoteVocale, EvenementProjet, ParametresEntreprise, Note } from "@/types";

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

  const [demande, setDemande] = useState<Projet | null>(null);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [nomArtisan, setNomArtisan] = useState("");
  const [metierArtisan, setMetierArtisan] = useState<string | null>(null);
  const [chargementAnalyse, setChargementAnalyse] = useState(false);
  const [chargementDevis, setChargementDevis] = useState(false);
  const [chargementReponse, setChargementReponse] = useState(false);
  const [brouillonReponse, setBrouillonReponse] = useState("");
  const [copie, setCopie] = useState(false);
  const [lienCopie, setLienCopie] = useState(false);
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
  const [formulaireNoteOuvert, setFormulaireNoteOuvert] = useState(false);
  const [rappelRecurrentEnCours, setRappelRecurrentEnCours] = useState<number | null>(null);
  const [rappelRecurrentCree, setRappelRecurrentCree] = useState<number | null>(null);
  const [evenementsProjet, setEvenementsProjet] = useState<EvenementProjet[]>([]);
  // "Mémoire client" (06/09) — voir chargerDonnees() : null tant que non
  // chargé, pour ne jamais afficher "0 autre projet" pendant une fraction
  // de seconde avant que la vraie valeur n'arrive.
  const [nbAutresProjetsClient, setNbAutresProjetsClient] = useState<number | null>(null);
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [parametres, setParametres] = useState<ParametresEntreprise | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [infosOuvertes, setInfosOuvertes] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Marque le projet comme modifié depuis le dernier devis — utilisé pour
  // proposer (jamais imposer) une mise à jour du devis.
  async function signalerModification() {
    await supabase
      .from("demandes")
      .update({ derniere_modification_le: new Date().toISOString() })
      .eq("id", params.id);
  }

  async function terminerNote(noteId: string, terminee: boolean) {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, statut: terminee ? "terminee" : "active" } : n))
    );
    await marquerNoteTerminee(supabase, noteId, terminee);
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

      if (tachesRestantes.length > 0) {
        // UNE seule note "Tâches restantes" par projet, remplacée à chaque
        // analyse au lieu d'en empiler une de plus. C'est ce qui produisait
        // quatre notes quasi identiques sur un même chantier.
        const description = tachesRestantes.map((t) => `- ${t}`).join("\n");
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
    if (infosManquantes.length > 0) {
      const continuer = window.confirm(
        `Il manque peut-être encore :\n\n${infosManquantes
          .map((i) => `• ${i}`)
          .join("\n")}\n\nGénérer le devis quand même ?`
      );
      if (!continuer) return;
    }

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

    if (!res.ok) {
      const data = await res.json().catch(() => null);
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
    await chargerDonnees();
  }

  async function dupliquerDevis() {
    if (!devis) return;
    setErreur(null);
    setChargementDevis(true);
    // Sprint Robustesse (30/08) — aucun try/catch ici auparavant : une
    // exception réseau (coupure, timeout) sur ce fetch faisait rejeter la
    // promesse sans jamais repasser chargementDevis à false, laissant le
    // bouton bloqué sur "Duplication…" indéfiniment.
    try {
      const res = await fetch("/api/devis/dupliquer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id }),
      });
      if (!res.ok) {
        setErreur("Impossible de dupliquer ce devis. Réessayez.");
        return;
      }
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: params.id,
          artisanId,
          organisationId,
          type: "devis_genere",
          titre: "Devis dupliqué",
        });
      }
      await chargerDonnees();
    } catch {
      setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      setChargementDevis(false);
    }
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
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
      await chargerDonnees();
    } catch {
      setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.", "devis");
    } finally {
      setChargementDevis(false);
    }
  }

  async function genererReponse(contexteSupplementaire?: string) {
    setErreur(null);
    setChargementReponse(true);
    setCopie(false);
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
    document.getElementById("bloc-reponse-client")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Sprint "Relance suggérée" (06/09) — le résumé de fin de journée détecte
  // déjà les devis envoyés sans réponse depuis plusieurs jours (voir
  // app/api/ai/resume-journee/route.ts), mais ne proposait jusqu'ici aucune
  // action directe. Réutilise /api/ai/generer-reponse (déjà existant, déjà
  // validé par l'artisan avant tout envoi) avec un contexte de relance
  // plutôt que de dupliquer un nouvel appel IA — même philosophie que le
  // reste du produit : l'IA propose, l'artisan décide et envoie lui-même.
  function genererRelance() {
    const jours = joursDepuisEnvoiDevis();
    genererReponse(
      jours
        ? `Le client n'a pas répondu depuis ${jours} jour${jours > 1 ? "s" : ""} après l'envoi du devis. Rédige un message de relance courtois qui donne simplement des nouvelles et demande si le devis convient, sans être insistant.`
        : "Rédige un message de relance courtois qui donne des nouvelles et demande si le devis envoyé convient, sans être insistant."
    );
  }

  function joursDepuisEnvoiDevis(): number | null {
    if (!devis?.envoye_le) return null;
    const jours = Math.floor((Date.now() - new Date(devis.envoye_le).getTime()) / 86400000);
    return jours > 0 ? jours : null;
  }

  async function copierReponse() {
    await navigator.clipboard.writeText(brouillonReponse);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  // Signature électronique en ligne (08/09) — voir Module 31. Le lien lui-
  // même EST la sécurité (UUID du devis, non-devinable) : pas besoin d'un
  // jeton séparé, voir supabase/schema.sql pour le raisonnement complet.
  async function copierLienSignature() {
    if (!devis) return;
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/devis/${devis.id}`);
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    } catch {
      setErreur("Impossible de copier le lien — copiez-le manuellement depuis la barre d'adresse après l'avoir ouvert.");
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

  async function marquerDevisEnvoye() {
    if (!devis || !demande || actionEnCours) return;
    // Audit pré-bêta (09/09), point 🟡 n°21 — avertissement non bloquant :
    // marquer un devis "envoyé" pour un client sans aucune coordonnée
    // (ni téléphone, ni email) n'a probablement pas de sens (comment
    // l'a-t-on vraiment envoyé ?) — mais reste la décision de l'artisan
    // (il a pu le remettre en main propre), jamais un blocage.
    if (!demande.telephone_client?.trim() && !demande.email_client?.trim()) {
      const continuer = window.confirm(
        "Ce client n'a ni téléphone ni email enregistré — vérifiez que le devis lui a bien été transmis. Continuer ?"
      );
      if (!continuer) return;
    }
    setActionEnCours(true);
    try {
      const { data: d1, error: err1 } = await supabase
        .from("devis")
        .update({ statut: "envoye", envoye_le: new Date().toISOString() })
        .eq("id", devis.id)
        .select("id");
      if (err1 || !d1 || d1.length === 0) {
        setErreur("Impossible de marquer le devis comme envoyé. Réessayez.");
        return;
      }
      const { data: d2, error: err2 } = await supabase
        .from("demandes")
        .update({ statut: "devis_envoye" })
        .eq("id", demande.id)
        .select("id");
      if (err2 || !d2 || d2.length === 0) {
        setErreur(
          "Le devis est marqué envoyé, mais le statut du projet n'a pas pu être mis à jour. Rechargez la page."
        );
        await chargerDonnees();
        return;
      }
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: demande.id,
          artisanId,
          organisationId,
          type: "devis_envoye",
          titre: "Devis envoyé au client",
        });
      }
      await chargerDonnees();
    } finally {
      setActionEnCours(false);
    }
  }

  async function marquerAccepte() {
    if (!demande || actionEnCours) return;
    setActionEnCours(true);
    try {
      const { data, error } = await supabase
        .from("demandes")
        .update({ statut: "accepte", accepte_le: new Date().toISOString() })
        .eq("id", demande.id)
        .select("id");
      if (error || !data || data.length === 0) {
        setErreur("Impossible d'enregistrer l'acceptation du devis. Réessayez.");
        return;
      }
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: demande.id,
          artisanId,
          organisationId,
          type: "devis_accepte",
          titre: "Devis accepté par le client",
        });
      }
      await chargerDonnees();
    } finally {
      setActionEnCours(false);
    }
  }

  async function marquerDevisRefuse() {
    if (!devis || !demande || actionEnCours) return;
    setActionEnCours(true);
    try {
      const { data, error } = await supabase
        .from("devis")
        .update({ statut: "refuse" })
        .eq("id", devis.id)
        .select("id");
      if (error || !data || data.length === 0) {
        setErreur("Impossible d'enregistrer le refus du devis. Réessayez.");
        return;
      }
      if (artisanId && organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: demande.id,
          artisanId,
          organisationId,
          type: "devis_refuse",
          titre: "Devis refusé par le client",
        });
      }
      await chargerDonnees();
    } finally {
      setActionEnCours(false);
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

  useEffect(() => {
    if (demande) setNotesLocales(demande.notes ?? "");
  }, [demande?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [infosEnregistrees, setInfosEnregistrees] = useState(false);
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

  async function enregistrerInfos() {
    if (!demande) return;
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
      return;
    }
    setErreurInfos(null);
    setInfosEnregistrees(true);
    setTimeout(() => setInfosEnregistrees(false), 1500);
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
    return <div className="p-8 text-sm text-ink/50">Chargement…</div>;
  }

  // Le devis a-t-il été généré avant la dernière modification du projet ?
  // Un chantier déjà terminé (souvent déjà payé) n'a plus besoin qu'on lui
  // propose de régénérer son devis — ajouter une photo de fin de chantier
  // pour le portfolio ne doit pas rouvrir la question du prix. Idem une
  // fois le devis accepté par le client ou le chantier démarré : "Mettre à
  // jour le devis" insère un NOUVEAU devis brouillon et écrase le statut de
  // la demande (voir /api/ai/generer-devis) — proposer ça en un clic sur un
  // projet déjà accepté ferait disparaître le devis accepté de l'écran et
  // repasserait silencieusement le projet à "devis à valider" (bug trouvé
  // à l'audit du 25/08). Pour ces deux statuts, on affiche plus bas une
  // proposition distincte, plus explicite : dupliquer le devis existant
  // (voir dupliquerDevis) plutôt que le remplacer.
  const devisPerime =
    demande.statut !== "termine" &&
    demande.statut !== "accepte" &&
    demande.statut !== "en_cours" &&
    devis &&
    demande.derniere_modification_le &&
    new Date(demande.derniere_modification_le) > new Date(devis.created_at);

  // Même détection que ci-dessus, mais pour un projet déjà accepté/en
  // cours : on ne propose jamais de régénérer en un clic (ça écraserait le
  // devis accepté), seulement de le dupliquer pour ajuster manuellement —
  // même chemin déjà utilisé pour un devis refusé, aucun appel IA.
  const devisPerimeProjetEngage =
    (demande.statut === "accepte" || demande.statut === "en_cours") &&
    devis &&
    demande.derniere_modification_le &&
    new Date(demande.derniere_modification_le) > new Date(devis.created_at);

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
  // devisPerime ci-dessus, appliquée à l'analyse plutôt qu'au devis) :
  // inutile de relancer l'IA en boucle pour reproduire le même résultat.
  const analyseAJour =
    Boolean(demande.questions_manquantes) &&
    Boolean(demande.derniere_analyse_le) &&
    (!demande.derniere_modification_le ||
      new Date(demande.derniere_modification_le) <= new Date(demande.derniere_analyse_le as string));

  return (
    <div className="p-8 max-w-3xl">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Projet
      </p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar nom={demande.nom_client || "?"} taille={40} />
          <h1 className="font-display text-2xl font-semibold truncate">
            {demande.nom_client}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={marquerVisite} disabled={actionEnCours}>
            {demande.visite_le ? "✓ Visite effectuée" : "Marquer visite effectuée"}
          </Button>
          <Link href={`/dashboard/planning/nouveau?projetId=${demande.id}`}>
            <Button variant="ghost">+ Planifier</Button>
          </Link>
        </div>
      </div>

      {/* "Mémoire client" (06/09) — un rapprochement déjà fait en interne
          (table clients, par numéro de téléphone normalisé) mais jamais
          montré à l'artisan jusqu'ici. Aucune concurrent établi (Obat,
          Tolteck, Batappli) ne fait ce lien automatique entre chantiers
          d'un même client. */}
      {nbAutresProjetsClient !== null && nbAutresProjetsClient > 0 && (
        <p className="mt-2 text-xs text-steel">
          🧠 Vous avez déjà travaillé avec ce client sur {nbAutresProjetsClient} autre
          {nbAutresProjetsClient > 1 ? "s" : ""} chantier{nbAutresProjetsClient > 1 ? "s" : ""}.
        </p>
      )}

      {/* Échappatoire toujours disponible : le parcours guidé (devis →
          accepté → en cours → terminé) plus bas reste la voie normale, mais
          un artisan doit toujours pouvoir clôturer un projet directement,
          même s'il a sauté des étapes ou géré ce chantier hors de l'app. */}
      {demande.statut !== "termine" && (
        <button
          onClick={marquerTermine}
          disabled={actionEnCours}
          className="mt-2 text-xs text-ink/40 hover:text-ink underline transition-colors disabled:opacity-40"
        >
          Marquer directement ce projet comme terminé
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-ink/50">Priorité :</span>
        {(["urgent", "important", "normal"] as const).map((p) => (
          <button
            key={p}
            onClick={() => changerPriorite(p)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              (demande.priorite ?? "normal") === p
                ? "bg-ink text-paper border-ink"
                : "border-ink/15 text-ink/50 hover:border-ink/40"
            }`}
          >
            {p === "urgent" ? "Urgent" : p === "important" ? "Important" : "Normal"}
          </button>
        ))}
      </div>

      <BarreProgression statut={demande.statut} />

      {/* La fiche projet fonctionne comme un dossier posé sur un bureau :
          chaque section est un "compartiment" séparé et clairement titré
          (contact, photos, notes vocales, notes) plutôt qu'un long
          formulaire continu — l'artisan sait d'un coup d'œil où trouver
          quoi, sans jamais avoir à chercher. */}

      <FicheSection icone="📇" titre="Contact & description">
        {(demande.telephone_client || demande.adresse_client) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm mb-4">
            {demande.telephone_client && (
              <a
                href={`tel:${demande.telephone_client.replace(/\s/g, "")}`}
                className="text-ink/70 hover:text-ink underline underline-offset-2 transition-colors"
              >
                📞 {demande.telephone_client}
              </a>
            )}
            {demande.adresse_client && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  demande.adresse_client
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink/70 hover:text-ink underline underline-offset-2 transition-colors"
              >
                📍 {demande.adresse_client}
              </a>
            )}
          </div>
        )}

        <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">
          Description
        </p>
        <p className="mt-2 text-sm text-ink/80">{demande.description}</p>

        {/* Informations complémentaires — facultatives, ajoutées quand nécessaire */}
        <div className="mt-4">
          <button
            onClick={() => setInfosOuvertes(!infosOuvertes)}
            className="text-xs text-ink/50 hover:text-ink underline transition-colors"
          >
            {infosOuvertes ? "Masquer" : "+ Compléter les informations (adresse, téléphone, type de chantier…)"}
          </button>

          {infosOuvertes && (
            <div className="mt-3 grid sm:grid-cols-2 gap-4 rounded-xl border border-ink/10 p-4">
              <Field
                label="Téléphone du client"
                type="tel"
                value={infos.telephone_client}
                onChange={(e) => setInfos({ ...infos, telephone_client: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Adresse du chantier"
                  value={infos.adresse_client}
                  onChange={(e) => setInfos({ ...infos, adresse_client: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/70 mb-1.5">
                  Type de chantier
                </label>
                <select
                  value={infos.type_chantier}
                  onChange={(e) => setInfos({ ...infos, type_chantier: e.target.value })}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                >
                  {TYPES_CHANTIER.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Button variant="ghost" onClick={enregistrerInfos}>
                  Enregistrer
                </Button>
                {infosEnregistrees && (
                  <span className="text-xs text-steel">✓ Enregistré</span>
                )}
                {/* Sprint Robustesse (30/08) — voir enregistrerInfos : un échec
                    Supabase est maintenant signalé ici, à côté du champ concerné. */}
                {erreurInfos && (
                  <ErreurInline message={erreurInfos} onReessayer={enregistrerInfos} />
                )}
              </div>
            </div>
          )}
        </div>
      </FicheSection>

      <FicheSection icone="📸" titre="Photos">
        <PhotosProjet
          demandeId={demande.id}
          chemins={demande.photos ?? []}
          onChemins={async (photos) => {
            setDemande({ ...demande, photos });
            if (!demande.photos_ajoutees_le) {
              await supabase
                .from("demandes")
                .update({ photos_ajoutees_le: new Date().toISOString() })
                .eq("id", demande.id);
            }
            await signalerModification();
            await chargerDonnees();
          }}
        />
      </FicheSection>

      <FicheSection
        icone="🎤"
        titre="Notes vocales"
        sousTitre="Un changement en fin de chantier ? Dictez-le ici, puis régénérez le devis — vous n'avez rien d'autre à retaper."
      >
        <NotesVocales
          demandeId={demande.id}
          notes={notesVocales}
          telephoneClient={demande.telephone_client}
          onNouvelleNote={async () => {
            await signalerModification();
            await chargerDonnees();
          }}
        />
      </FicheSection>

      <FicheSection icone="📝" titre="Notes libres">
        {notesEnregistrees && (
          <p className="text-xs text-steel mb-2">✓ Enregistré</p>
        )}
        {/* Sprint Robustesse (30/08) — voir enregistrerNotes : un échec
            Supabase est maintenant signalé ici, à côté du champ concerné,
            plutôt que de disparaître silencieusement. */}
        {erreurNotes && (
          <ErreurInline message={erreurNotes} onReessayer={enregistrerNotes} className="mb-2" />
        )}
        <textarea
          value={notesLocales}
          onChange={(e) => setNotesLocales(e.target.value)}
          onBlur={enregistrerNotes}
          rows={3}
          placeholder="Ajoutez ici tout ce qui est utile : mesures prises sur place, contraintes, remarques après la visite…"
          className="w-full text-sm text-ink/80 leading-relaxed rounded-xl border border-ink/10 bg-paper p-3 transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
        />
      </FicheSection>

      <ChecklistMetier typeChantier={demande.type_chantier} metierArtisan={metierArtisan} />

      {/* Notes professionnelles (29/08) — point 2 du brief : "Dans la
          fiche projet : nouvelle section 'Notes' [...] Le projet est alors
          déjà sélectionné." Placée avant l'analyse IA : les notes actives
          font partie du contexte envoyé à l'IA (point 4, voir
          app/api/ai/analyser-demande/route.ts), logique de les voir juste
          avant à l'écran aussi. */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Notes</h2>
          <button
            onClick={() => setFormulaireNoteOuvert((v) => !v)}
            className="text-xs font-medium text-ink/50 hover:text-ink underline underline-offset-2 transition-colors"
          >
            {formulaireNoteOuvert ? "Annuler" : "+ Ajouter une note"}
          </button>
        </div>

        {TYPES_CHANTIER_RAPPEL_RECURRENT.includes(demande.type_chantier) && (
          <div className="mt-3 flex items-center flex-wrap gap-2">
            <span className="text-xs text-ink/50">Programmer un rappel de suivi :</span>
            {PRESETS_RAPPEL_RECURRENT.map(({ mois, libelle }) => (
              <button
                key={mois}
                type="button"
                onClick={() => creerRappelRecurrent(mois)}
                disabled={rappelRecurrentEnCours !== null}
                className="text-xs rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50"
              >
                {rappelRecurrentEnCours === mois ? "…" : libelle}
              </button>
            ))}
            {rappelRecurrentCree !== null && (
              <span className="text-xs text-succes">
                ✓ Rappel programmé, {PRESETS_RAPPEL_RECURRENT.find((p) => p.mois === rappelRecurrentCree)?.libelle.toLowerCase()}
              </span>
            )}
          </div>
        )}

        {formulaireNoteOuvert && (
          <div className="mt-3">
            <FormulaireNote
              projetIdFixe={demande.id}
              nomProjetFixe={demande.nom_client}
              onCree={() => {
                setFormulaireNoteOuvert(false);
                listerNotesProjet(supabase, demande.id).then(setNotes);
              }}
              onAnnuler={() => setFormulaireNoteOuvert(false)}
            />
          </div>
        )}

        {notes.length > 0 && (
          <div className="mt-3 flex flex-col gap-2.5">
            {notes
              .filter((n) => n.statut === "active")
              .concat(notes.filter((n) => n.statut === "terminee"))
              .map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  afficherProjet={false}
                  onTerminer={terminerNote}
                />
              ))}
          </div>
        )}
      </div>

      {/* Étape 1 : analyse IA — optionnelle. Elle sert à faire le tri dans des
          notes en vrac (dictées sur le terrain, décousues) et à repérer ce
          qu'il manque encore avant de chiffrer. Si le projet est déjà clair,
          elle n'apporte rien de plus : on peut aller directement générer le
          devis ci-dessous, les deux étapes ne sont plus liées. */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            1. Cadrer le besoin avec l&apos;IA <span className="text-ink/35 font-normal">(optionnel)</span>
          </h2>
          <Button
            variant={demande.questions_manquantes ? "ghost" : "primary"}
            onClick={analyserDemande}
            loading={chargementAnalyse}
            disabled={!peutAnalyser || analyseAJour}
            title={
              !peutAnalyser
                ? "Ajoutez d'abord une note (vocale ou écrite)"
                : analyseAJour
                ? "Rien de nouveau depuis la dernière analyse"
                : undefined
            }
          >
            {chargementAnalyse
              ? "Analyse en cours…"
              : demande.questions_manquantes
              ? "Mettre à jour le résumé"
              : "Analyser avec l'IA"}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-ink/40">
          {!peutAnalyser
            ? "Ajoutez une note libre ou une note vocale ci-dessus pour pouvoir lancer l'analyse — sans notes, il n'y a rien à structurer."
            : analyseAJour
            ? "Déjà à jour — ajoutez une nouvelle note pour pouvoir relancer l'analyse."
            : "Utile si vos notes sont en vrac — l'IA en fait la synthèse et repère ce qui manque. Si le projet est déjà clair, passez directement à l'étape 2."}
        </p>

        {/* Sprint Robustesse (30/08) — un seul état `erreur` partagé par les
            3 actions IA (analyser/générer devis/générer réponse), affiché
            jusqu'ici seulement tout en bas de page, après l'historique :
            un artisan cliquant ce bouton en haut de la fiche ne voyait
            jamais l'erreur sans scroller toute la page. Correctif le plus
            simple sans réarchitecturer l'état : dupliquer l'affichage sous
            chacun des 3 boutons concernés (celui-ci reste aussi en bas, en
            filet de sécurité pour les autres mutations qui utilisent le
            même état, ex. dupliquerDevis). */}
        {urgenceProposee && artisanId && organisationId && (
          <PropositionUrgence
            demandeId={params.id}
            artisanId={artisanId}
            organisationId={organisationId}
            onTraite={async () => {
              setUrgenceProposee(false);
              await chargerDonnees();
            }}
          />
        )}

        {erreur && sectionErreur === "analyse" && (
          <p className="mt-2 text-sm text-signal">{erreur}</p>
        )}

        {demande.questions_manquantes && (
          <Card className="mt-4 p-6">
            <p className="text-sm text-ink/80">
              {demande.questions_manquantes.resume}
            </p>

            {/* Garde-fou (06/09) : "?? []" plutôt qu'un accès direct — une
                réponse IA légèrement malformée (champ manquant, mauvais
                type) ne doit jamais faire planter l'affichage de toute la
                fiche projet, seulement afficher moins d'informations. */}
            {(demande.questions_manquantes.informations_manquantes ?? []).length > 0 && (
              <>
                <p className="mt-4 text-xs font-medium text-ink/50 uppercase tracking-wider">
                  Checklist — ce qu'il manque peut-être encore
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {(demande.questions_manquantes.informations_manquantes ?? []).map((info) => {
                    const dejaCoche =
                      /photo/i.test(info) && (demande.photos?.length ?? 0) > 0;
                    return (
                      <label
                        key={info}
                        className="flex items-center gap-2 text-sm text-ink/70"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={dejaCoche}
                          className="accent-signal"
                        />
                        <span className={dejaCoche ? "line-through text-ink/40" : ""}>
                          {info}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-ink/35">
                  Simple aide-mémoire — cocher ne change rien ailleurs dans l&apos;app.
                </p>
              </>
            )}

            <p className="mt-4 text-xs font-medium text-ink/50 uppercase tracking-wider">
              Questions à poser au client
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-ink/70 space-y-1">
              {(demande.questions_manquantes.questions_suggerees ?? []).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Étape 2 : génération du devis — indépendante de l'étape 1. Elle
          fonctionne directement à partir de la description et des notes du
          projet ; l'analyse IA n'est pas un prérequis, juste une aide en
          option pour les notes en vrac. */}
      <div className="mt-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-sm">2. Générer un devis</h2>
            {(!devis || devis.statut === "refuse") && (
              <div className="flex items-center gap-2">
                {/* Devis express (06/09) — pour un dépannage/une intervention
                    déjà réalisée sur place (serrurier, vitrier, urgence) :
                    saute l'IA, ouvre directement une ligne vide à remplir. */}
                <Button variant="ghost" onClick={creerDevisExpress} loading={chargementDevis} title="Chiffrer directement à la main, sans passer par l'IA — pour une intervention déjà réalisée sur place.">
                  {chargementDevis ? "Création…" : "⚡ Devis express"}
                </Button>
                <Button onClick={genererDevis} loading={chargementDevis}>
                  {chargementDevis
                    ? "Génération en cours…"
                    : devis
                    ? "Générer un nouveau devis"
                    : "Générer le devis"}
                </Button>
              </div>
            )}
          </div>

          {/* Sprint Robustesse (30/08) — voir commentaire identique plus
              haut sous le bouton "Analyser avec l'IA" : l'erreur s'affiche
              désormais UNIQUEMENT sous l'action qui l'a produite. */}
          {erreur && sectionErreur === "devis" && (
            <p className="mt-2 text-sm text-signal">{erreur}</p>
          )}

          {devis?.statut === "refuse" && (
            <Card className="mt-4 p-4 border-signal/30 bg-signal/5">
              <p className="text-sm text-ink/80">
                Ce devis a été marqué comme refusé par le client. Générez-en un nouveau
                lorsque vous êtes prêt, ou repartez de celui-ci si le client a juste changé
                d&apos;avis sur le prix.
              </p>
              <Button
                variant="ghost"
                onClick={dupliquerDevis}
                loading={chargementDevis}
                className="mt-3"
              >
                {chargementDevis ? "Duplication…" : "Dupliquer ce devis pour le modifier"}
              </Button>
            </Card>
          )}

          {devisPerime && devis?.statut !== "brouillon" && (
            <Card className="mt-4 p-4 border-alerte-orange/40 bg-alerte-orange/5">
              <p className="text-sm text-ink/80">
                Le projet a changé depuis le dernier devis (nouvelle note, photo ou note
                vocale). Voulez-vous le régénérer en tenant compte de ces changements ?
              </p>
              <Button onClick={genererDevis} loading={chargementDevis} className="mt-3">
                {chargementDevis ? "Mise à jour…" : "Mettre à jour le devis"}
              </Button>
            </Card>
          )}

          {/* Projet déjà accepté ou en cours : jamais de régénération en un
              clic (voir le commentaire sur devisPerimeProjetEngage plus
              haut) — seulement une duplication explicite, qui laisse le
              devis accepté intact et n'écrase pas le statut du projet. */}
          {devisPerimeProjetEngage && (
            <Card className="mt-4 p-4 border-alerte-orange/40 bg-alerte-orange/5">
              <p className="text-sm text-ink/80">
                Le projet a changé depuis ce devis {demande.statut === "accepte" ? "accepté" : "en cours"}
                . Le devis d&apos;origine reste inchangé — dupliquez-le si vous devez ajuster le
                prix ou les prestations.
              </p>
              <Button
                variant="ghost"
                onClick={dupliquerDevis}
                loading={chargementDevis}
                className="mt-3"
              >
                {chargementDevis ? "Duplication…" : "Dupliquer ce devis pour l'ajuster"}
              </Button>
            </Card>
          )}

          {/* Un devis fraîchement généré (ou régénéré) doit toujours être relu
              et validé avant d'être imprimable — jamais un export direct
              depuis un brouillon. */}
          {devis && devis.statut === "brouillon" && artisanId && (
            <ValiderDevis
              devis={devis}
              demandeId={demande.id}
              artisanId={artisanId}
              onValide={chargerDonnees}
            />
          )}

          {devis && devis.statut !== "brouillon" && devis.statut !== "refuse" && (
            <div className="mt-4">
              <DevisPreview
                devis={devis}
                nomClient={demande.nom_client}
                telephoneClient={demande.telephone_client}
                adresseClient={demande.adresse_client}
                nomArtisan={nomArtisan}
                entreprise={parametres}
                logoUrl={logoUrl}
              />
              {devis.statut === "a_valider" && (
                <p className="mt-3 text-xs text-ink/40">
                  Exportez-le en PDF ci-dessus pour l&apos;envoyer par email ou l&apos;imprimer,
                  puis marquez-le comme envoyé.
                </p>
              )}
              <div className="mt-3 flex gap-3">
                {devis.statut === "a_valider" && (
                  <Button variant="ghost" onClick={marquerDevisEnvoye} disabled={actionEnCours}>
                    Marquer comme envoyé au client
                  </Button>
                )}
                {devis.statut === "envoye" && demande.statut !== "accepte" && (
                  <>
                    <Button variant="ghost" onClick={copierLienSignature}>
                      {lienCopie ? "✓ Lien copié" : "🔗 Copier le lien de signature"}
                    </Button>
                    <Button variant="ghost" onClick={marquerAccepte} disabled={actionEnCours}>
                      Marquer comme accepté par le client
                    </Button>
                    {joursDepuisEnvoiDevis() !== null && (
                      <Button variant="ghost" onClick={genererRelance} loading={chargementReponse}>
                        {chargementReponse ? "Rédaction…" : "Suggérer une relance"}
                      </Button>
                    )}
                    <Button variant="ghost" onClick={dupliquerDevis} loading={chargementDevis}>
                      {chargementDevis ? "Duplication…" : "Dupliquer pour ajuster le prix"}
                    </Button>
                    <Button variant="danger" onClick={marquerDevisRefuse} disabled={actionEnCours}>
                      Marquer comme refusé
                    </Button>
                  </>
                )}
                {demande.statut === "accepte" && (
                  <span className="text-sm text-steel self-center">
                    ✓ Devis accepté par le client
                  </span>
                )}
              </div>

              {demande.statut === "accepte" && (
                <Button variant="ghost" onClick={marquerEnCours} disabled={actionEnCours} className="mt-3">
                  Marquer le chantier comme démarré
                </Button>
              )}
              {demande.statut === "en_cours" && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-steel">🔨 Chantier en cours</span>
                  <Button variant="ghost" onClick={marquerTermine} disabled={actionEnCours}>
                    Marquer comme terminé
                  </Button>
                </div>
              )}
              {demande.statut === "termine" && (
                <span className="mt-3 inline-block text-sm text-steel">
                  ✓ Chantier terminé
                </span>
              )}

              {/* Module 28 (06/09) — facturation : disponible dès que le
                  client a accepté le devis, quel que soit l'avancement du
                  chantier ensuite (un acompte se facture souvent avant même
                  le démarrage). */}
              {["accepte", "en_cours", "termine"].includes(demande.statut) && (
                <FacturesProjet
                  devis={devis}
                  nomClient={demande.nom_client}
                  telephoneClient={demande.telephone_client}
                  adresseClient={demande.adresse_client}
                  logoUrl={logoUrl}
                />
              )}
            </div>
          )}
        </div>

      {/* Étape 3 : réponse suggérée au client — l'artisan valide toujours avant envoi.
          Sprint "Relance suggérée" (06/09) — condition élargie à
          "brouillonReponse déjà généré" : le bouton "Suggérer une relance"
          (voir plus haut, à côté des actions du devis envoyé) peut produire
          un brouillon même sur un projet jamais passé par l'analyse IA
          (questions_manquantes resterait alors null) — sans cet ajout, la
          relance générée n'aurait eu aucun endroit où s'afficher. */}
      {(demande.questions_manquantes || brouillonReponse) && (
        <div className="mt-8" id="bloc-reponse-client">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">3. Préparer une réponse au client</h2>
            <Button
              variant="ghost"
              onClick={() => genererReponse()}
              loading={chargementReponse}
            >
              {chargementReponse
                ? "Rédaction en cours…"
                : brouillonReponse
                ? "Régénérer"
                : "Générer une réponse"}
            </Button>
          </div>

          {/* Sprint Robustesse (30/08) — voir les deux commentaires
              identiques plus haut : l'erreur s'affiche désormais
              UNIQUEMENT sous l'action qui l'a produite. */}
          {erreur && sectionErreur === "reponse" && (
            <p className="mt-2 text-sm text-signal">{erreur}</p>
          )}

          {brouillonReponse && (
            <Card className="mt-4 p-6">
              <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-2">
                Brouillon — relisez et ajustez avant d&apos;envoyer vous-même
              </p>
              <textarea
                value={brouillonReponse}
                onChange={(e) => setBrouillonReponse(e.target.value)}
                rows={6}
                className="w-full text-sm text-ink/80 leading-relaxed rounded-xl border border-ink/10 bg-paper p-3 transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
              />
              <Button variant="ghost" onClick={copierReponse} className="mt-3">
                {copie ? "✓ Copié" : "Copier le texte"}
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Historique — fil chronologique de tout ce qui s'est passé sur le projet.
          evenements_projet est la source de vérité désormais ; les projets créés
          avant l'introduction de cette table (aucun événement enregistré) gardent
          l'ancien calcul en secours, sans migration de données nécessaire. */}
      <div className="mt-8">
        <h2 className="font-semibold text-sm">Historique</h2>
        <div className="mt-4">
          <Timeline
            items={
              evenementsProjet.length > 0
                ? evenementsProjet.map(
                    (e): TimelineItem => ({
                      date: e.created_at,
                      label: e.titre,
                      detail: e.detail ?? undefined,
                    })
                  )
                : construireHistoriqueHerite(demande, devis, notesVocales)
            }
          />
        </div>
      </div>

      {/* Bandeau de repli : toutes les autres mutations de la page
          (dupliquer un devis, marquer une visite, clôturer…) n'indiquent
          pas de section, leur erreur s'affiche donc ici, une seule fois. */}
      {erreur && sectionErreur === null && (
        <p className="mt-4 text-sm text-signal">{erreur}</p>
      )}
    </div>
  );
}

// Où en est le chantier, en un coup d'œil — pas besoin de lire le statut
// écrit ou de dérouler la fiche. 5 étapes fixes, toujours dans le même
// ordre, jamais plus : "nouveau"/"analyse" comptent comme une seule étape
// ("Nouveau"), de même pour "devis_genere"/"devis_envoye" ("Devis").
const ETAPES_PROGRESSION: { cle: string; label: string; statuts: string[] }[] = [
  { cle: "nouveau", label: "Nouveau", statuts: ["nouveau", "analyse"] },
  { cle: "devis", label: "Devis", statuts: ["devis_genere", "devis_envoye"] },
  { cle: "accepte", label: "Accepté", statuts: ["accepte"] },
  { cle: "en_cours", label: "En cours", statuts: ["en_cours"] },
  { cle: "termine", label: "Terminé", statuts: ["termine"] },
];

function BarreProgression({ statut }: { statut: string }) {
  const indexActuel = Math.max(
    0,
    ETAPES_PROGRESSION.findIndex((e) => e.statuts.includes(statut))
  );

  return (
    <div className="mt-4 flex items-center">
      {ETAPES_PROGRESSION.map((etape, i) => (
        <div key={etape.cle} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                i <= indexActuel ? "bg-ink" : "bg-ink/15"
              }`}
            />
            <span
              className={`text-[10px] whitespace-nowrap ${
                i === indexActuel ? "text-ink font-medium" : "text-ink/35"
              }`}
            >
              {etape.label}
            </span>
          </div>
          {i < ETAPES_PROGRESSION.length - 1 && (
            <div
              className={`h-px flex-1 mx-1.5 mb-4 ${
                i < indexActuel ? "bg-ink" : "bg-ink/15"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Aide-mémoire propre au corps de métier, à consulter avant ou pendant la
// visite — avant même de lancer l'analyse IA, qui elle ne travaille qu'à
// partir de ce que l'artisan a déjà noté. Repliée par défaut pour ne pas
// surcharger la fiche ; cocher ne change rien ailleurs, comme la checklist
// générée par l'IA plus bas — c'est un pense-bête, pas un formulaire.
function ChecklistMetier({
  typeChantier,
  metierArtisan,
}: {
  typeChantier: string;
  metierArtisan: string | null;
}) {
  const [ouverte, setOuverte] = useState(false);
  // Sprint Beta Final (27/08) — 🔴G : priorité au type de chantier détecté
  // s'il est spécifique, repli sur le métier déclaré par l'artisan sinon
  // (voir lib/checklistsMetier.ts) — un serrurier ou un paysagiste dont le
  // chantier tombe en "autre" retrouve enfin une checklist qui lui parle.
  const points = obtenirChecklist(typeChantier, metierArtisan);
  if (!points) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setOuverte((v) => !v)}
        className="text-xs text-ink/50 hover:text-ink underline underline-offset-2 transition-colors"
      >
        📋 {ouverte ? "Masquer" : "Voir"} la checklist avant devis
      </button>
      {ouverte && (
        <Card className="mt-3 p-5">
          <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-3">
            À vérifier sur place
          </p>
          <div className="flex flex-col gap-1.5">
            {points.map((point) => (
              <label key={point} className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" className="accent-signal" />
                <span>{point}</span>
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Un "compartiment" du dossier projet : titre + icône constants, pour que
// l'artisan reconnaisse toujours la même section au même endroit, quel que
// soit le projet ouvert.
function FicheSection({
  icone,
  titre,
  sousTitre,
  children,
}: {
  icone: string;
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-4 p-6">
      <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">
        {icone} {titre}
      </p>
      {sousTitre && <p className="mt-1 text-[11px] text-ink/40">{sousTitre}</p>}
      <div className="mt-3">{children}</div>
    </Card>
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
      items.push({ date: devis.envoye_le, label: "Devis envoyé au client" });
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
