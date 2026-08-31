"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type RdvPropose = { date: string; heure: string };

// ============================================================
// Sprint Beta Final (27/08) — extrait de app/dashboard/demandes/importer/
// page.tsx pour être réutilisé aussi sur le partage natif Android (voir
// app/dashboard/demandes/partage/[id]/page.tsx), qui perdait jusqu'ici
// silencieusement le rendez-vous détecté par l'IA (rdvPropose reçu de
// /api/demandes/creer-depuis-brouillon mais jamais lu). Une seule logique
// de confirmation de créneau, partagée par les deux portes d'entrée.
// ============================================================

type Props = {
  projetId: string;
  nomClient: string;
  rdv: RdvPropose;
};

export function ConfirmationRdv({ projetId, nomClient, rdv }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [traitementRdv, setTraitementRdv] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function accepterRdv() {
    setTraitementRdv(true);
    setErreur(null);
    // Sprint Robustesse (30/08) — repéré en revue de régression : sans ce
    // try/catch, une exception réseau brute (pas juste une erreur Supabase
    // "propre") laissait le bouton bloqué sur "Ajout en cours…" pour
    // toujours, sans message ni possibilité de réessayer.
    try {
      await tenterAccepterRdv();
    } catch {
      setTraitementRdv(false);
      setErreur("Connexion perdue. Réessayez.");
    }
  }

  async function tenterAccepterRdv() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTraitementRdv(false);
      return;
    }

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) {
      setTraitementRdv(false);
      setErreur("Aucune organisation associée à ce compte, reconnectez-vous.");
      return;
    }

    const dateHeure = new Date(`${rdv.date}T${rdv.heure}`);

    // Même contrôle de double-réservation que la création manuelle d'un
    // rendez-vous (voir planning/nouveau) : un créneau proposé par SMS/mail
    // et accepté sans vérifier peut tomber pile sur un chantier déjà prévu.
    const debutJour = new Date(rdv.date);
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(rdv.date);
    finJour.setHours(23, 59, 59, 999);

    const { data: evenementsJour, error: erreurConflit } = await supabase
      .from("evenements_planning")
      .select("id, titre, date_heure, duree_minutes")
      .eq("organisation_id", organisationId)
      .eq("type", "rendez_vous")
      .neq("statut", "annule")
      .gte("date_heure", debutJour.toISOString())
      .lte("date_heure", finJour.toISOString());

    // Sprint Robustesse (30/08) — 🔴 corrigé : cette requête ne servait
    // qu'à VÉRIFIER l'absence de conflit, mais son résultat d'erreur
    // n'était jamais regardé. Sur une coupure réseau, `evenementsJour`
    // retombait sur `undefined` -> `[]` via le `??` plus bas, donc "aucun
    // conflit détecté" alors qu'on n'avait tout simplement pas pu vérifier
    // — un chantier déjà planifié à cette heure pouvait se faire doubler
    // en silence. On refuse maintenant de continuer si la vérification
    // elle-même a échoué, plutôt que de supposer optimistement "c'est bon".
    if (erreurConflit) {
      setTraitementRdv(false);
      setErreur("Impossible de vérifier les créneaux déjà pris. Réessayez.");
      return;
    }

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
      organisation_id: organisationId,
      demande_id: projetId,
      titre: `Rendez-vous ${nomClient}`,
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
      demandeId: projetId,
      artisanId: user.id,
      organisationId,
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
    router.push(`/dashboard/planning/nouveau?projetId=${projetId}`);
  }

  const dateFormatee = new Date(`${rdv.date}T${rdv.heure}`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="p-8 max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-ink">Projet créé</h1>
      <Card className="mt-6 p-6">
        <p className="text-sm text-ink/80">
          {nomClient} propose un rendez-vous le <span className="font-semibold">{dateFormatee}</span>{" "}
          à <span className="font-semibold">{rdv.heure}</span>.
        </p>
        <p className="mt-2 text-sm text-ink/60">Ce créneau vous convient-il ?</p>
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
        href={`/dashboard/demandes/${projetId}`}
        className="mt-4 inline-block text-sm text-ink/50 hover:text-ink transition-colors"
      >
        Voir le projet sans planifier maintenant →
      </Link>
    </div>
  );
}
