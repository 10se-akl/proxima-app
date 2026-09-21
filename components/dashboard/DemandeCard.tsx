"use client";

import { useState } from "react";
import Link from "next/link";
import { LABEL_TYPE_CHANTIER } from "@/lib/libellesChantier";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import { getOrganisationId } from "@/lib/organisation";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import type { Projet } from "@/types";

export const LABEL_STATUT: Record<Projet["statut"], string> = {
  nouveau: "Nouveau",
  analyse: "Analysé par l'IA",
  devis_genere: "Devis généré",
  devis_envoye: "Devis envoyé",
  accepte: "Accepté",
  en_cours: "Chantier en cours",
  termine: "Terminé",
};

// Déplacé dans lib/libellesChantier.ts (21/09) — voir ce fichier.
export { LABEL_TYPE_CHANTIER };

// Ce qu'il reste concrètement à faire, en langage simple — pas le nom
// technique du statut, mais la prochaine action. Affiché uniquement pour
// les projets pas encore terminés (voir demande explicite : "si c'est pas
// fini on dit ce qu'il reste à faire").
const RESTE_A_FAIRE: Record<Projet["statut"], string | null> = {
  nouveau: "à cadrer",
  analyse: "devis à générer",
  devis_genere: "devis à valider et envoyer",
  devis_envoye: "en attente de réponse du client",
  accepte: "chantier à démarrer",
  en_cours: "chantier à terminer",
  termine: null,
};

const COULEUR_PRIORITE: Record<Projet["priorite"], string> = {
  urgent: "bg-[#C23B22]",
  important: "bg-[#D9861A]",
  normal: "bg-[#2F8F5B]",
};

export function DemandeCard({ demande }: { demande: Projet }) {
  const supabase = createClient();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState(false);

  // Action rapide directement depuis la carte : pas besoin d'ouvrir le
  // projet pour dire "c'est fini". e.preventDefault() empêche le clic de
  // suivre le lien vers la fiche projet (toute la carte est cliquable).
  async function marquerTermine(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEnCours(true);
    setErreur(false);
    const { data, error } = await supabase
      .from("demandes")
      .update({ statut: "termine", termine_le: new Date().toISOString() })
      .eq("id", demande.id)
      .select("id");

    if (error || !data || data.length === 0) {
      setEnCours(false);
      setErreur(true);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const organisationId = await getOrganisationId(supabase, user.id);
      if (organisationId) {
        await enregistrerEvenement(supabase, {
          demandeId: demande.id,
          artisanId: user.id,
          organisationId,
          type: "chantier_termine",
          titre: "Chantier terminé",
        });
      }
    }
    setEnCours(false);
    setFait(true);
    router.refresh();
  }

  // Une fois cliqué, on masque la carte immédiatement (avant même le
  // rafraîchissement serveur) — sinon elle resterait affichée une seconde
  // de trop dans "projets prioritaires", ce qui donnait l'impression que
  // rien ne s'était passé.
  if (fait) return null;

  const resteAFaire = RESTE_A_FAIRE[demande.statut];

  return (
    <Link href={`/dashboard/demandes/${demande.id}`}>
      <Card className="p-5 transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${COULEUR_PRIORITE[demande.priorite ?? "normal"]}`}
              title={demande.priorite}
            />
            <Avatar nom={demande.nom_client || "?"} taille={24} />
            <p className="font-semibold text-sm truncate">{demande.nom_client}</p>
            {LABEL_TYPE_CHANTIER[demande.type_chantier] && (
              <span className="text-[10px] text-ink/40 rounded-full border border-ink/10 px-1.5 py-0.5 shrink-0">
                {LABEL_TYPE_CHANTIER[demande.type_chantier]}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-steel shrink-0">
            {LABEL_STATUT[demande.statut] ?? demande.statut}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink/60 line-clamp-2 pl-4">
          {demande.description}
        </p>

        {demande.statut !== "termine" && (
          <div className="mt-3 pl-4">
            <div className="flex items-center justify-between gap-3">
              {resteAFaire && (
                <p className="text-[11px] text-ink/40">Reste à faire : {resteAFaire}</p>
              )}
              <button
                onClick={marquerTermine}
                disabled={enCours}
                className="shrink-0 text-[11px] text-ink/50 hover:text-ink underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {enCours ? "…" : "✓ Marquer chantier terminé"}
              </button>
            </div>
            {erreur && (
              <p className="mt-1 text-[11px] text-[#C23B22]">
                La mise à jour n&apos;a pas pu être enregistrée. Réessayez.
              </p>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
