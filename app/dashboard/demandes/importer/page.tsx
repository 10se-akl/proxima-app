"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BrouillonProjetForm } from "@/components/dashboard/BrouillonProjet";
import { ConfirmationRdv } from "@/components/dashboard/ConfirmationRdv";
import {
  CorrespondanceProjetExistant,
  type ProjetOuvertMatch,
} from "@/components/dashboard/CorrespondanceProjetExistant";
import type { BrouillonProjet } from "@/types";

type RdvPropose = { date: string; heure: string };

// ============================================================
// "Premier contact sans friction" (26/08) — remplace l'ancienne création
// directe (POST /api/ai/importer-message) par le parcours en deux temps
// commun aux deux portes d'entrée : préparer un brouillon (jamais bloquant,
// voir components/dashboard/BrouillonProjet.tsx), le faire valider par
// l'artisan, puis seulement créer le projet (voir
// app/api/demandes/creer-depuis-brouillon). Cet écran reste la porte
// "Importer un message", conservée sur iPhone/desktop — voir
// app/dashboard/demandes/page.tsx pour la logique qui décide de son
// affichage selon la plateforme.
//
// Audit pré-bêta (09/09), point 🔴 n°1 — AVANT tout appel IA, on cherche
// désormais un client/projet existant (numéro de téléphone dans le
// message), exactement comme le parcours de partage natif Android (voir
// app/dashboard/demandes/partage/[id]/page.tsx et app/api/partage/matcher/
// route.ts). Sans ce correctif, un artisan sur iPhone (Web Share Target
// non supporté par iOS — c'est justement pour ça que cet écran de collage
// manuel existe) créait un nouveau projet en double à chaque message d'un
// client déjà connu.
// ============================================================

export default function ImporterMessagePage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [brouillon, setBrouillon] = useState<BrouillonProjet | null>(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [correspondances, setCorrespondances] = useState<ProjetOuvertMatch[]>([]);
  const [attachementEnCours, setAttachementEnCours] = useState(false);

  // Une fois le projet créé, si l'IA a détecté un créneau proposé par le
  // client, on affiche cet écran de confirmation plutôt que de l'ajouter
  // automatiquement au planning.
  const [propositionEnCours, setPropositionEnCours] = useState<{
    projetId: string;
    nomClient: string;
    rdv: RdvPropose;
  } | null>(null);

  // Cycle "Release Candidate" 1 (26/08) — annulation propre : si l'artisan
  // quitte cette page pendant que l'IA analyse son message, on annule le
  // fetch au démontage plutôt que de le laisser tourner pour rien.
  const controleurIARef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => controleurIARef.current?.abort();
  }, []);

  async function lancerAnalyseIA(texte: string) {
    setErreur(null);
    setChargement(true);

    const controleur = new AbortController();
    controleurIARef.current = controleur;
    let res: Response;
    try {
      res = await fetch("/api/ai/preparer-brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte }),
        signal: controleur.signal,
      });
    } catch (err) {
      setChargement(false);
      if ((err as Error).name !== "AbortError") {
        setErreur("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
      }
      return;
    }

    setChargement(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreur(data?.error ?? "L'analyse a échoué. Réessayez.");
      return;
    }

    const data = await res.json();
    setBrouillon(data.brouillon);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setRechercheEnCours(true);

    // Point 🔴 n°1 de l'audit pré-bêta : SQL + regex AVANT tout appel IA,
    // même logique que le parcours de partage Android — voir
    // app/api/partage/matcher/route.ts (aucun appel Claude ici).
    try {
      const reponseMatch = await fetch("/api/partage/matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: message }),
      });
      const donneesMatch = await reponseMatch.json();
      setRechercheEnCours(false);

      if (reponseMatch.ok && donneesMatch.statut === "un") {
        setCorrespondances([donneesMatch.projet]);
        return; // attend le choix explicite de l'artisan
      }
      if (reponseMatch.ok && donneesMatch.statut === "plusieurs") {
        setCorrespondances(donneesMatch.projets);
        return;
      }
    } catch {
      // Échec du matching (réseau) : pas grave, on continue avec le
      // parcours normal plutôt que de bloquer l'artisan sur cette étape
      // secondaire — le pire cas est un brouillon complet au lieu d'un
      // rattachement, jamais un blocage.
      setRechercheEnCours(false);
    }

    lancerAnalyseIA(message);
  }

  async function ajouterAuProjet(projetId: string) {
    setAttachementEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/demandes/ajouter-note-depuis-partage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetId, texte: message }),
      });
      const donnees = await reponse.json();
      if (!reponse.ok) {
        setAttachementEnCours(false);
        setErreur(donnees.error || "Impossible d'ajouter le message au projet.");
        return;
      }
      router.push(`/dashboard/demandes/${donnees.projetId}`);
    } catch {
      setAttachementEnCours(false);
      setErreur("Impossible de contacter le serveur pour le moment.");
    }
  }

  function creerNouveauProjetQuandMeme() {
    setCorrespondances([]);
    lancerAnalyseIA(message);
  }

  async function creerProjet(valeurs: BrouillonProjet) {
    setCreationEnCours(true);
    setErreur(null);

    let res: Response;
    try {
      res = await fetch("/api/demandes/creer-depuis-brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brouillon: valeurs }),
      });
    } catch {
      setCreationEnCours(false);
      setErreur("Impossible d'enregistrer le projet pour le moment.");
      return;
    }

    setCreationEnCours(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreur(data?.error ?? "La création a échoué. Réessayez.");
      return;
    }

    const data = await res.json();

    if (data.rdvPropose) {
      setPropositionEnCours({
        projetId: data.projetId,
        nomClient: data.nomClient,
        rdv: data.rdvPropose,
      });
      return;
    }

    router.push(`/dashboard/demandes/${data.projetId}?cree=1`);
  }

  if (propositionEnCours) {
    return (
      <ConfirmationRdv
        projetId={propositionEnCours.projetId}
        nomClient={propositionEnCours.nomClient}
        rdv={propositionEnCours.rdv}
      />
    );
  }

  // Correspondance(s) trouvée(s) : choix explicite, jamais de rattachement
  // silencieux (même composant que le parcours de partage Android).
  if (correspondances.length > 0) {
    return (
      <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl">
        <Card className="p-6">
          <CorrespondanceProjetExistant
            correspondances={correspondances}
            onChoisir={ajouterAuProjet}
            onCreerNouveau={creerNouveauProjetQuandMeme}
            enCours={attachementEnCours}
            erreur={erreur}
          />
        </Card>
      </div>
    );
  }

  if (brouillon) {
    return (
      <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl">
        <Link
          href="/dashboard/demandes"
          className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-ink/60 hover:text-ink transition-colors"
        >
          ← Retour aux projets
        </Link>
        <Card className="mt-6 p-6">
          <BrouillonProjetForm
            brouillon={brouillon}
            onValider={creerProjet}
            validationEnCours={creationEnCours}
            erreur={erreur}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-8 sm:p-8 max-w-2xl">
      <Link href="/dashboard/demandes" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-ink/60 hover:text-ink transition-colors">
        ← Retour aux projets
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Coller un message</h1>
      <p className="mt-1 text-[15px] text-ink/65">Le message du client, tel quel.</p>

      <Card className="mt-5 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 27/09 — Un appui pour coller le message copié : avec des gants,
              l'appui long dans un champ puis « Coller » est un vrai effort.
              Si le téléphone refuse l'accès au presse-papiers, le champ
              reste là, comme avant. */}
          {!message.trim() && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const texte = await navigator.clipboard.readText();
                  if (texte.trim()) setMessage(texte);
                } catch {
                  // Accès refusé : on colle à la main dans le champ.
                }
              }}
              className="w-full min-h-14 rounded-2xl text-[16px] font-semibold text-ink ring-1 ring-ink/15 transition hover:ring-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50"
            >
              Coller le message copié
            </button>
          )}
          <textarea
            required
            rows={8}
            placeholder={`Exemple :\n\nBonjour, je me présente M. Dupont. J'aimerais refaire ma salle de bain. Vous seriez dispo mardi vers 14h pour passer voir ? Mon numéro : 06 12 34 56 78`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Message du client"
            className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
          />

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement || rechercheEnCours}
            className="w-full min-h-14 rounded-2xl bg-ink text-[16px] font-semibold text-paper transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50 sm:w-auto sm:px-8"
          >
            {rechercheEnCours
              ? "Recherche d'un projet en cours…"
              : chargement
                ? "Analyse en cours…"
                : "Préparer le brouillon"}
          </button>
        </form>
      </Card>
    </div>
  );
}
