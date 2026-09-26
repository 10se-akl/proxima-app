"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marquerNoteTerminee } from "@/lib/notes";
import { IconeCoche } from "@/components/projet/icones";
import { BlocAccueil, LigneAccueil, LIGNES_MAX } from "./Blocs";

// ============================================================
// « Aujourd'hui » (26/09, lot B) — une seule liste, triée par heure, à la
// place de trois blocs qui répondaient à la même question (notes en
// retard, notes du jour, rappels) et d'un quatrième (rendez-vous).
// Ce qui est en retard passe en tête, avec sa pastille. Une note se coche
// directement sur la ligne.
// ============================================================

export type ElementJour = {
  cle: string;
  genre: "note" | "rdv" | "tache";
  /** L'identifiant de la note, pour la cocher. */
  noteId?: string;
  date: string;
  enRetard: boolean;
  principal: string;
  secondaire?: string;
  href: string;
};

const HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

export function ListeAujourdhui({ elements }: { elements: ElementJour[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [faites, setFaites] = useState<Set<string>>(new Set());
  const [erreur, setErreur] = useState(false);

  async function cocher(noteId: string) {
    setErreur(false);
    setFaites((s) => new Set(s).add(noteId));
    const ok = await marquerNoteTerminee(supabase, noteId, true);
    if (!ok) {
      // La note revient si l'enregistrement a échoué : rien ne disparaît à tort.
      setFaites((s) => {
        const n = new Set(s);
        n.delete(noteId);
        return n;
      });
      setErreur(true);
      return;
    }
    router.refresh();
  }

  const visibles = elements.filter((e) => !(e.noteId && faites.has(e.noteId)));
  if (visibles.length === 0) return null;

  return (
    <BlocAccueil titre="Aujourd'hui" nombre={visibles.length} lienTous="/dashboard/planning">
      {erreur && <p className="text-[13px] text-signal-fonce dark:text-signal-clair">Pas enregistré. Réessayez.</p>}
      {visibles.slice(0, LIGNES_MAX).map((e) => (
        <LigneAccueil
          key={e.cle}
          href={e.href}
          repere={e.enRetard ? "Retard" : HEURE.format(new Date(e.date)).replace(":", "h")}
          repereAccent={e.enRetard}
          principal={e.principal}
          secondaire={e.secondaire}
          fin={
            e.noteId ? (
              <button
                type="button"
                onClick={() => cocher(e.noteId!)}
                aria-label={`Fait : ${e.principal}`}
                className="group grid w-14 shrink-0 place-items-center border-l border-ink/[0.07] focus-visible:outline-none"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-ink/25 text-transparent transition group-hover:border-succes group-hover:text-succes group-focus-visible:ring-2 group-focus-visible:ring-signal/50">
                  <IconeCoche className="h-4 w-4" />
                </span>
              </button>
            ) : undefined
          }
        />
      ))}
    </BlocAccueil>
  );
}
