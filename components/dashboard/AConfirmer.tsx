"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type EvenementAConfirmer = {
  id: string;
  titre: string;
  demande_id: string | null;
  date_heure: string;
  demandes?: { nom_client?: string } | null;
};

export function AConfirmer({ evenements }: { evenements: EvenementAConfirmer[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [traites, setTraites] = useState<Set<string>>(new Set());
  const [replanification, setReplanification] = useState<string | null>(null);
  const [nouvelleDate, setNouvelleDate] = useState("");
  const [nouvelleHeure, setNouvelleHeure] = useState("");
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

  async function confirmerFait(e: EvenementAConfirmer) {
    setErreurId(null);
    const { data, error } = await supabase
      .from("evenements_planning")
      .update({ statut: "termine" })
      .eq("id", e.id)
      .select("id");

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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await enregistrerEvenement(supabase, {
          demandeId: e.demande_id,
          artisanId: user.id,
          type: "chantier_termine",
          titre: "Chantier terminé",
        });
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

  async function confirmerReplanifie(id: string) {
    if (!nouvelleDate || !nouvelleHeure) return;
    const dateHeure = new Date(`${nouvelleDate}T${nouvelleHeure}`).toISOString();
    await supabase
      .from("evenements_planning")
      .update({ date_heure: dateHeure })
      .eq("id", id);
    setTraites((s) => new Set(s).add(id));
    setReplanification(null);
    setNouvelleDate("");
    setNouvelleHeure("");
    router.refresh();
  }

  const restants = evenements.filter((e) => !traites.has(e.id));
  if (restants.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">
        À confirmer
      </p>
      <div className="flex flex-col gap-2">
        {restants.map((e) =>
          proposerPlanification.has(e.id) ? (
            <Card key={e.id} className="p-4">
              <p className="text-sm text-ink/80">
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
              <p className="text-sm text-ink/80">
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
                <p className="mt-2 text-[11px] text-[#C23B22]">
                  La mise à jour n&apos;a pas pu être enregistrée. Réessayez.
                </p>
              )}
            </Card>
          ) : (
            <Card key={e.id} className="p-4">
              <p className="text-sm text-ink/80">
                Avez-vous fait <span className="font-semibold">{e.titre}</span>
                {e.demandes?.nom_client && ` (${e.demandes.nom_client})`} — prévu le{" "}
                {new Date(e.date_heure).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                ?
              </p>

              {replanification === e.id ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-[11px] text-ink/50 mb-1">
                      Nouvelle date
                    </label>
                    <input
                      type="date"
                      value={nouvelleDate}
                      onChange={(ev) => setNouvelleDate(ev.target.value)}
                      className="rounded-xl border border-ink/15 bg-paper px-2 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink/50 mb-1">Heure</label>
                    <input
                      type="time"
                      value={nouvelleHeure}
                      onChange={(ev) => setNouvelleHeure(ev.target.value)}
                      className="rounded-xl border border-ink/15 bg-paper px-2 py-1.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
                    />
                  </div>
                  <Button onClick={() => confirmerReplanifie(e.id)}>Replanifier</Button>
                  <Button variant="ghost" onClick={() => setReplanification(null)}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => confirmerFait(e)}>✓ Oui, c&apos;est fait</Button>
                  <Button variant="ghost" onClick={() => setReplanification(e.id)}>
                    Non, replanifier
                  </Button>
                </div>
              )}
              {erreurId === e.id && (
                <p className="mt-2 text-[11px] text-[#C23B22]">
                  La mise à jour n&apos;a pas pu être enregistrée. Réessayez.
                </p>
              )}
            </Card>
          )
        )}
      </div>
    </div>
  );
}
