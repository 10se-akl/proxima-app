"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BrouillonProjetForm } from "@/components/dashboard/BrouillonProjet";
import { ConfirmationRdv } from "@/components/dashboard/ConfirmationRdv";
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
// ============================================================

export default function ImporterMessagePage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [brouillon, setBrouillon] = useState<BrouillonProjet | null>(null);
  const [chargement, setChargement] = useState(false);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const controleur = new AbortController();
    controleurIARef.current = controleur;
    let res: Response;
    try {
      res = await fetch("/api/ai/preparer-brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: message }),
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

    router.push(`/dashboard/demandes/${data.projetId}`);
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

  if (brouillon) {
    return (
      <div className="p-8 max-w-2xl">
        <Link
          href="/dashboard/demandes"
          className="text-sm text-ink/60 hover:text-ink transition-colors"
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
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/demandes" className="text-sm text-ink/60 hover:text-ink transition-colors">
        ← Retour aux projets
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Créer un projet à partir d&apos;un message
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        Collez le message reçu du client (SMS, email, WhatsApp...) tel quel. L&apos;IA prépare
        un brouillon (nom, coordonnées si présentes, résumé) que vous validez avant la création.
      </p>

      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            required
            rows={8}
            placeholder={`Exemple :\n\nBonjour, je me présente M. Dupont. J'aimerais refaire ma salle de bain. Vous seriez dispo mardi vers 14h pour passer voir ? Mon numéro : 06 12 34 56 78`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
          />

          {erreur && <p className="text-sm text-signal">{erreur}</p>}

          <Button type="submit" disabled={chargement} className="self-start">
            {chargement ? "Analyse en cours…" : "Préparer le brouillon"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
