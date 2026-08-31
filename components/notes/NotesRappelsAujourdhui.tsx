"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marquerNoteTerminee } from "@/lib/notes";
import { NoteCard } from "@/components/notes/NoteCard";
import type { Note } from "@/types";

// Wrapper client pour la section "Notes" de l'accueil (page serveur, voir
// app/dashboard/page.tsx) — permet le bouton "Marquer comme terminé"
// depuis une page par ailleurs entièrement rendue côté serveur, même
// pattern que components/dashboard/AConfirmer.tsx.
export function NotesRappelsAujourdhui({ titre, notes, accent }: { titre: string; notes: Note[]; accent?: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [traitees, setTraitees] = useState<Set<string>>(new Set());
  // Sprint Robustesse (30/08) — voir `terminer()` ci-dessous.
  const [erreurTerminer, setErreurTerminer] = useState<string | null>(null);

  async function terminer(noteId: string) {
    setTraitees((prev) => new Set(prev).add(noteId));
    setErreurTerminer(null);
    // Sprint Robustesse (30/08) — la note disparaissait de la liste locale
    // (via `traitees`) avant même de savoir si `marquerNoteTerminee` avait
    // réussi. Sur échec (réseau, session expirée), la note restait active
    // en base mais l'artisan la croyait traitée puisqu'elle avait disparu
    // de l'écran. On la remet dans la liste si l'appel échoue.
    const reussi = await marquerNoteTerminee(supabase, noteId, true);
    if (!reussi) {
      setTraitees((prev) => {
        const suivant = new Set(prev);
        suivant.delete(noteId);
        return suivant;
      });
      setErreurTerminer("Impossible de marquer cette note comme terminée. Réessayez.");
      return;
    }
    router.refresh();
  }

  const visibles = notes.filter((n) => !traitees.has(n.id));
  if (visibles.length === 0) return null;

  return (
    <div className="mt-8">
      <p
        className={`font-mono text-[11px] tracking-[0.2em] uppercase mb-3 ${
          accent ? "text-signal" : "text-steel"
        }`}
      >
        {titre}
      </p>
      {erreurTerminer && <p className="mb-2 text-xs text-signal">{erreurTerminer}</p>}
      <div className="flex flex-col gap-2.5">
        {visibles.map((note) => (
          <NoteCard key={note.id} note={note} onTerminer={terminer} />
        ))}
      </div>
    </div>
  );
}
