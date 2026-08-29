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

  async function terminer(noteId: string) {
    setTraitees((prev) => new Set(prev).add(noteId));
    await marquerNoteTerminee(supabase, noteId, true);
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
      <div className="flex flex-col gap-2.5">
        {visibles.map((note) => (
          <NoteCard key={note.id} note={note} onTerminer={terminer} />
        ))}
      </div>
    </div>
  );
}
