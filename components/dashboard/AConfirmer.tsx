"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { marquerRendezVousDuChantierFaits } from "@/components/planning/actionsEvenement";
import { getOrganisationId } from "@/lib/organisation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FeuilleDeplacer, type EvenementADeplacer } from "@/components/planning/FeuilleDeplacer";
import { FeuilleMessageClient, type DemandeMessage } from "@/components/projet/FeuilleMessageClient";

type EvenementAConfirmer = {
  id: string;
  /** "rendez_vous" ou "tache" : seul un rendez-vous propose de prévenir le client. */
  type?: string;
  titre: string;
  demande_id: string | null;
  date_heure: string;
  demandes?: { nom_client?: string } | null;
};

// 26/09 (lot B) — `integre` : rendu sans son propre titre, à l'intérieur
// du bloc « À confirmer » de l'accueil, qui le fusionne avec la clôture
// des chantiers (ConfirmerClotureProjet). Une question par ligne, un
// bouton par réponse, directement sur la ligne.
export function AConfirmer({ evenements, integre = false }: { evenements: EvenementAConfirmer[]; integre?: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [traites, setTraites] = useState<Set<string>>(new Set());
  // Refonte (02/10 — duel C, lot 2) : « Non » ouvre la feuille « Déplacer »
  // (demain même heure déjà rempli), puis, pour un rendez-vous client, le
  // message au client avec la nouvelle date. Plus de formulaire en ligne
  // qui déplaçait le rendez-vous sans jamais proposer de prévenir.
  const [aDeplacer, setADeplacer] = useState<(EvenementADeplacer & { demandeId: string | null; rdv: boolean }) | null>(null);
  const [message, setMessage] = useState<{ demandeId: string; demande: DemandeMessage } | null>(null);
  // Une fois un rendez-vous confirmé "fait", si un projet y est lié, on
  // propose (jamais on ne décide seul) de clôturer aussi le chantier —
  // c'est ce qui le fait disparaître de la liste des projets actifs.
  const [proposerCloture, setProposerCloture] = useState<Set<string>>(new Set());
  const [clotureEnCours, setClotureEnCours] = useState<string | null>(null);
  // Si le chantier n'est pas terminé, ce qui manque presque toujours c'est
  // le prochain rendez-vous — le proposer tout de suite évite un aller-
  // retour inutile vers le planning.
  const [proposerPlanification, setProposerPlanification] = useState<Set<string>>(new Set());
  const [erreurId, setErreurId] = useState<string | null>(null);
  // Audit Cycle 2 (Agent Destructeur) : "✓ Oui, c'est fait" n'avait aucune
  // protection anti double-clic (contrairement à cloturerProjet, juste en
  // dessous, qui utilise déjà clotureEnCours) — un clic répété sur réseau
  // de chantier lent pouvait déclencher deux updates + deux refresh qui se
  // chevauchent.
  const [traitementId, setTraitementId] = useState<string | null>(null);

  async function confirmerFait(e: EvenementAConfirmer) {
    if (traitementId === e.id) return;
    setTraitementId(e.id);
    setErreurId(null);
    const { data, error } = await supabase
      .from("evenements_planning")
      .update({ statut: "termine" })
      .eq("id", e.id)
      .select("id");

    setTraitementId(null);

    if (error || !data || data.length === 0) {
      setErreurId(e.id);
      return;
    }

    if (e.demande_id) {
      setProposerCloture((s) => new Set(s).add(e.id));
    } else {
      setTraites((s) => new Set(s).add(e.id));
    }
    router.refresh();
  }

  async function cloturerProjet(e: EvenementAConfirmer, cloturer: boolean) {
    if (cloturer && e.demande_id) {
      setClotureEnCours(e.id);
      setErreurId(null);
      const { data, error } = await supabase
        .from("demandes")
        .update({ statut: "termine", termine_le: new Date().toISOString() })
        .eq("id", e.demande_id)
        .select("id");

      if (error || !data || data.length === 0) {
        setClotureEnCours(null);
        setErreurId(e.id);
        return;
      }
      // 27/09 — Le planning suit (voir actionsEvenement.ts).
      await marquerRendezVousDuChantierFaits(supabase, e.demande_id);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const organisationId = await getOrganisationId(supabase, user.id);
        if (organisationId) {
          await enregistrerEvenement(supabase, {
            demandeId: e.demande_id,
            artisanId: user.id,
            organisationId,
            type: "chantier_termine",
            titre: "Chantier terminé",
          });
        }
      }
      setClotureEnCours(null);
      setTraites((s) => new Set(s).add(e.id));
      router.refresh();
      return;
    }
    // Pas terminé : on propose directement de planifier la suite plutôt que
    // de simplement faire disparaître la question.
    setProposerPlanification((s) => new Set(s).add(e.id));
  }

  function apresDeplacement(e: EvenementADeplacer & { demandeId: string | null; rdv: boolean }, nouvelleDate: string) {
    setTraites((t) => new Set(t).add(e.id));
    setADeplacer(null);
    if (e.rdv && e.demandeId) {
      // Le rafraîchissement attend la fermeture du message : recalculé tout
      // de suite, l'accueil pourrait retirer ce bloc, et la feuille avec.
      setMessage({ demandeId: e.demandeId, demande: { cle: "decalage", ancienneDate: e.date_heure, nouvelleDate } });
      return;
    }
    router.refresh();
  }

  const restants = evenements.filter((e) => !traites.has(e.id));

  // Les feuilles vivent hors de la liste : après le déplacement, la ligne
  // disparaît (et la liste peut devenir vide) pendant que le message au
  // client reste ouvert.
  const feuilles = (
    <>
      <FeuilleDeplacer
        evenement={aDeplacer}
        surFermer={() => setADeplacer(null)}
        surDeplace={(_, d) => aDeplacer && apresDeplacement(aDeplacer, d)}
      />
      {message && (
        <FeuilleMessageClient
          ouverte
          surFermer={() => {
            setMessage(null);
            router.refresh();
          }}
          demandeId={message.demandeId}
          demande={message.demande}
        />
      )}
    </>
  );
  if (restants.length === 0) return feuilles;

  const liste = (
      <div className="flex flex-col gap-2">
        {restants.map((e) =>
          proposerPlanification.has(e.id) ? (
            <Card key={e.id} className="p-4">
              <p className="text-sm text-ink/80 flex items-center gap-2 flex-wrap">
                {e.demandes?.nom_client && (
                  <Avatar nom={e.demandes.nom_client} taille={22} />
                )}
                D&apos;accord. Voulez-vous planifier le prochain rendez-vous pour{" "}
                <span className="font-semibold">
                  {e.demandes?.nom_client ?? "ce projet"}
                </span>{" "}
                ?
              </p>
              <div className="mt-3 flex gap-2">
                {e.demande_id && (
                  <Link href={`/dashboard/planning/nouveau?projetId=${e.demande_id}`}>
                    <Button>+ Planifier un rendez-vous</Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setTraites((s) => new Set(s).add(e.id))}
                >
                  Plus tard
                </Button>
              </div>
            </Card>
          ) : proposerCloture.has(e.id) ? (
            <Card key={e.id} className="p-4">
              <p className="text-sm text-ink/80 flex items-center gap-2 flex-wrap">
                {e.demandes?.nom_client && (
                  <Avatar nom={e.demandes.nom_client} taille={22} />
                )}
                Le chantier{" "}
                <span className="font-semibold">
                  {e.demandes?.nom_client ?? "concerné"}
                </span>{" "}
                est-il aussi terminé ?
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => cloturerProjet(e, true)}
                  disabled={clotureEnCours === e.id}
                >
                  {clotureEnCours === e.id ? "…" : "✓ Oui, chantier terminé"}
                </Button>
                <Button variant="ghost" onClick={() => cloturerProjet(e, false)}>
                  Non, pas encore
                </Button>
              </div>
              {erreurId === e.id && (
                <p className="mt-2 text-[13px] text-signal-fonce dark:text-signal-clair">
                  La mise à jour n&apos;a pas pu être enregistrée. Réessayez.
                </p>
              )}
            </Card>
          ) : (
            <Card key={e.id} className="p-3 pl-4">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {e.demandes?.nom_client ?? e.titre}
                  </span>
                  <span className="block truncate text-[13px] text-ink/55">
                    Fait ? {e.demandes?.nom_client ? `${e.titre} · ` : ""}
                    {new Date(e.date_heure).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </p>
                <button type="button" onClick={() => confirmerFait(e)} disabled={traitementId === e.id} className="min-h-12 shrink-0 rounded-xl bg-ink px-4 text-[15px] font-semibold text-paper transition disabled:opacity-50">
                  {traitementId === e.id ? "…" : "Oui"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setADeplacer({
                      id: e.id,
                      titre: e.titre,
                      date_heure: e.date_heure,
                      nomClient: e.demandes?.nom_client,
                      demandeId: e.demande_id,
                      rdv: e.type !== "tache",
                    })
                  }
                  className="min-h-12 shrink-0 rounded-xl px-3.5 text-[15px] font-medium text-ink/70 ring-1 ring-ink/15 transition hover:text-ink"
                >
                  Non
                </button>
              </div>

              {erreurId === e.id && (
                <p className="mt-2 text-[13px] text-signal-fonce dark:text-signal-clair">
                  La mise à jour n&apos;a pas pu être enregistrée. Réessayez.
                </p>
              )}
            </Card>
          )
        )}
      </div>
  );

  if (integre)
    return (
      <>
        {liste}
        {feuilles}
      </>
    );
  return (
    <div className="mt-8">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">À confirmer</p>
      {liste}
      {feuilles}
    </div>
  );
}
