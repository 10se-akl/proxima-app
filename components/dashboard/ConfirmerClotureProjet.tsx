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
import { vibrer, vibrerEchec } from "@/lib/retour";

type ProjetAConfirmer = { id: string; nom_client: string };

// Filet de sécurité pour la question "le chantier est-il aussi terminé ?"
// posée juste après avoir confirmé un rendez-vous fait (voir AConfirmer).
// Cette question-là ne vit que dans un état React temporaire : si l'artisan
// change de page avant d'y répondre, elle disparaît pour de bon — le
// rendez-vous est déjà marqué "fait", donc plus rien ne la fait
// réapparaître. C'est exactement le bug remonté : un chantier confirmé
// resté actif indéfiniment, sans plus jamais être redemandé.
//
// Ce composant recalcule la même question à chaque chargement de l'accueil,
// à partir de données en base plutôt que d'un état perdable : tout projet
// actif dont le dernier rendez-vous a été confirmé fait et rien de plus
// n'est prévu ensuite. Elle continue de s'afficher tant qu'il n'y a pas eu
// de réponse "oui" — répondre "non" propose directement de planifier la
// suite (sinon la question reviendrait le lendemain pour rien : on sait déjà
// que ce n'est pas fini, ce qui manque c'est un prochain rendez-vous).
// 26/09 (lot B) — `integre` : voir AConfirmer, même bloc sur l'accueil.
export function ConfirmerClotureProjet({ projets, integre = false }: { projets: ProjetAConfirmer[]; integre?: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [traites, setTraites] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState<string | null>(null);
  const [proposerPlanification, setProposerPlanification] = useState<Set<string>>(new Set());
  const [erreurId, setErreurId] = useState<string | null>(null);

  async function marquerTermine(p: ProjetAConfirmer) {
    setEnCours(p.id);
    setErreurId(null);
    const { data, error } = await supabase
      .from("demandes")
      .update({ statut: "termine", termine_le: new Date().toISOString() })
      .eq("id", p.id)
      .select("id");

    if (error || !data || data.length === 0) {
      setEnCours(null);
      setErreurId(p.id);
      return;
    }
    // 27/09 — Le planning suit (voir actionsEvenement.ts).
    await marquerRendezVousDuChantierFaits(supabase, p.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const organisationId = await getOrganisationId(supabase, user.id);
      if (organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: p.id,
          artisanId: user.id,
          organisationId,
          type: "chantier_termine",
          titre: "Chantier terminé",
        });
      }
    }
    setEnCours(null);
    setTraites((s) => new Set(s).add(p.id));
    router.refresh();
  }

  // Refonte (02/10, duel C lot 3) — « Pas encore » écrit une trace
  // (masquée au carnet) : la question ne revient qu'après un nouveau
  // rendez-vous fait, au lieu de revenir chaque jour. Avant, rien n'était
  // écrit et seul un « Plus tard » gardé dans le navigateur la cachait.
  async function pasEncore(p: ProjetAConfirmer) {
    setEnCours(p.id);
    setErreurId(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const organisationId = user ? await getOrganisationId(supabase, user.id) : null;
    const ok =
      !!user &&
      !!organisationId &&
      (await enregistrerEvenement(supabase, {
        demandeId: p.id,
        artisanId: user.id,
        organisationId,
        type: "chantier_pas_termine",
        titre: "Chantier pas encore terminé",
      }));
    setEnCours(null);
    if (!ok) {
      vibrerEchec();
      setErreurId(p.id);
      return;
    }
    vibrer();
    setProposerPlanification((s) => new Set(s).add(p.id));
  }

  const restants = projets.filter((p) => !traites.has(p.id));
  if (restants.length === 0) return null;

  const liste = (
      <div className="flex flex-col gap-2">
        {restants.map((p) =>
          proposerPlanification.has(p.id) ? (
            <Card key={p.id} className="p-4">
              <p className="text-sm text-ink/80 flex items-center gap-2 flex-wrap">
                <Avatar nom={p.nom_client || "?"} taille={22} />
                D&apos;accord. Voulez-vous planifier le prochain rendez-vous pour{" "}
                <span className="font-semibold">{p.nom_client}</span> ?
              </p>
              <div className="mt-3 flex gap-2">
                <Link href={`/dashboard/planning/nouveau?projetId=${p.id}`}>
                  <Button>+ Planifier un rendez-vous</Button>
                </Link>
                <Button variant="ghost" onClick={() => setTraites((s) => new Set(s).add(p.id))}>
                  Plus tard
                </Button>
              </div>
            </Card>
          ) : (
            <Card key={p.id} className="p-3 pl-4">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{p.nom_client}</span>
                  <span className="block truncate text-[13px] text-ink/55">Chantier terminé ?</span>
                </p>
                <button type="button" onClick={() => marquerTermine(p)} disabled={enCours === p.id} className="min-h-12 shrink-0 rounded-xl bg-ink px-4 text-[15px] font-semibold text-paper transition disabled:opacity-50">
                  {enCours === p.id ? "…" : "Oui"}
                </button>
                <button type="button" onClick={() => pasEncore(p)} disabled={enCours === p.id} className="min-h-12 shrink-0 rounded-xl px-3.5 text-[15px] font-medium text-ink/70 ring-1 ring-ink/15 transition hover:text-ink disabled:opacity-50">
                  Pas encore
                </button>
              </div>
              {erreurId === p.id && (
                <p className="mt-2 text-[13px] text-signal-fonce dark:text-signal-clair">
                  La mise à jour n&apos;a pas pu être enregistrée. Réessayez.
                </p>
              )}
            </Card>
          )
        )}
      </div>
  );

  if (integre) return liste;
  return (
    <div className="mt-8">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-3">Chantiers à confirmer</p>
      {liste}
    </div>
  );
}
