"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type RdvPropose = { date: string; heure: string };

export default function ImporterMessagePage() {
  const router = useRouter();
  const supabase = createClient();

  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Une fois le projet créé, si l'IA a détecté un créneau proposé par le
  // client, on affiche cet écran de confirmation plutôt que de l'ajouter
  // automatiquement au planning.
  const [propositionEnCours, setPropositionEnCours] = useState<{
    projetId: string;
    nomClient: string;
    rdv: RdvPropose;
  } | null>(null);
  const [traitementRdv, setTraitementRdv] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const res = await fetch("/api/ai/importer-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageBrut: message }),
    });

    setChargement(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setErreur(data?.error ?? "L'import a échoué. Réessayez.");
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

  async function accepterRdv() {
    if (!propositionEnCours) return;
    setTraitementRdv(true);
    setErreur(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTraitementRdv(false);
      return;
    }

    const dateHeure = new Date(
      `${propositionEnCours.rdv.date}T${propositionEnCours.rdv.heure}`
    );

    // Même contrôle de double-réservation que la création manuelle d'un
    // rendez-vous (voir planning/nouveau) : un créneau proposé par SMS/mail
    // et accepté sans vérifier peut tomber pile sur un chantier déjà prévu.
    const debutJour = new Date(propositionEnCours.rdv.date);
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(propositionEnCours.rdv.date);
    finJour.setHours(23, 59, 59, 999);

    const { data: evenementsJour } = await supabase
      .from("evenements_planning")
      .select("id, titre, date_heure, duree_minutes")
      .eq("artisan_id", user.id)
      .eq("type", "rendez_vous")
      .neq("statut", "annule")
      .gte("date_heure", debutJour.toISOString())
      .lte("date_heure", finJour.toISOString());

    const fin = new Date(dateHeure.getTime() + 60 * 60000);
    const conflit = (evenementsJour ?? []).find((ev) => {
      const debutExistant = new Date(ev.date_heure);
      const finExistant = new Date(debutExistant.getTime() + (ev.duree_minutes ?? 60) * 60000);
      return dateHeure < finExistant && fin > debutExistant;
    });

    if (conflit) {
      setTraitementRdv(false);
      setErreur(
        `Créneau déjà pris : "${conflit.titre}" à ${new Date(
          conflit.date_heure
        ).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Choisissez un autre horaire.`
      );
      return;
    }

    const { error } = await supabase.from("evenements_planning").insert({
      artisan_id: user.id,
      demande_id: propositionEnCours.projetId,
      titre: `Rendez-vous ${propositionEnCours.nomClient}`,
      type: "rendez_vous",
      date_heure: dateHeure.toISOString(),
      duree_minutes: 60,
    });

    if (error) {
      setTraitementRdv(false);
      setErreur("Impossible d'enregistrer le rendez-vous. Réessayez.");
      return;
    }

    await enregistrerEvenement(supabase, {
      demandeId: propositionEnCours.projetId,
      artisanId: user.id,
      type: "rdv_planifie",
      titre: "Rendez-vous planifié",
      detail: dateHeure.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    setTraitementRdv(false);
    router.push("/dashboard/planning");
    router.refresh();
  }

  function proposerAutreDate() {
    if (!propositionEnCours) return;
    router.push(`/dashboard/planning/nouveau?projetId=${propositionEnCours.projetId}`);
  }

  if (propositionEnCours) {
    const dateFormatee = new Date(
      `${propositionEnCours.rdv.date}T${propositionEnCours.rdv.heure}`
    ).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return (
      <div className="p-8 max-w-lg">
        <h1 className="font-display text-2xl font-semibold text-ink">Projet créé</h1>
        <Card className="mt-6 p-6">
          <p className="text-sm text-ink/80">
            {propositionEnCours.nomClient} propose un rendez-vous le{" "}
            <span className="font-semibold">{dateFormatee}</span> à{" "}
            <span className="font-semibold">{propositionEnCours.rdv.heure}</span>.
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Ce créneau vous convient-il ?
          </p>
          <div className="mt-5 flex gap-3">
            <Button onClick={accepterRdv} disabled={traitementRdv}>
              {traitementRdv ? "Ajout en cours…" : "✓ Accepter ce créneau"}
            </Button>
            <Button variant="ghost" onClick={proposerAutreDate}>
              Choisir une autre date
            </Button>
          </div>
          {erreur && <p className="mt-3 text-sm text-signal">{erreur}</p>}
        </Card>
        <Link
          href={`/dashboard/demandes/${propositionEnCours.projetId}`}
          className="mt-4 inline-block text-sm text-ink/50 hover:text-ink transition-colors"
        >
          Voir le projet sans planifier maintenant →
        </Link>
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
        Collez le message reçu du client (SMS, email, WhatsApp...) tel quel. L&apos;IA en
        extrait le nom, les coordonnées si elles sont présentes, et un résumé. Si le client
        propose un créneau, il vous sera proposé — jamais ajouté seul.
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
            {chargement ? "Analyse en cours…" : "Créer le projet automatiquement"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
