"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enregistrerEvenement } from "@/lib/timeline";
import {
  obtenirClasseReconnaissance,
  messageErreurDictee,
  type SpeechRecognitionInstance,
} from "@/lib/dictee";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { NoteVocale } from "@/types";

export function NotesVocales({
  demandeId,
  notes,
  onNouvelleNote,
}: {
  demandeId: string;
  notes: NoteVocale[];
  onNouvelleNote: () => void;
}) {
  const supabase = createClient();
  const [enregistrement, setEnregistrement] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [editionManuelle, setEditionManuelle] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const ClasseReconnaissance = obtenirClasseReconnaissance();

  function demarrer() {
    if (!ClasseReconnaissance) {
      // Pas de dictée sur ce navigateur : on ouvre directement la saisie
      // manuelle plutôt que de laisser un message d'erreur sans issue.
      setErreur(null);
      setTranscription("");
      setEditionManuelle(true);
      return;
    }
    setErreur(null);
    setTranscription("");
    setEditionManuelle(false);

    const recognition = new ClasseReconnaissance();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let texte = "";
      for (let i = 0; i < event.results.length; i++) {
        texte += event.results[i][0].transcript;
      }
      setTranscription(texte);
    };
    recognition.onend = () => setEnregistrement(false);
    recognition.onerror = (event) => {
      setEnregistrement(false);
      // "aborted" = l'artisan a cliqué sur Arrêter lui-même, pas une erreur.
      if (event?.error === "aborted") return;
      setErreur(messageErreurDictee(event?.error));
    };

    recognition.start();
    recognitionRef.current = recognition;
    setEnregistrement(true);
  }

  function arreter() {
    recognitionRef.current?.stop();
    setEnregistrement(false);
  }

  function ecrireManuel() {
    setErreur(null);
    setTranscription("");
    setEditionManuelle(true);
  }

  async function enregistrerNote() {
    if (!transcription.trim()) return;
    setSauvegarde(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setSauvegarde(false);
      return;
    }

    const { error } = await supabase.from("notes_vocales").insert({
      demande_id: demandeId,
      artisan_id: user.id,
      transcription: transcription.trim(),
    });

    setSauvegarde(false);

    if (error) {
      setErreur("Impossible d'enregistrer la note.");
      return;
    }

    await enregistrerEvenement(supabase, {
      demandeId,
      artisanId: user.id,
      type: "note_vocale_ajoutee",
      titre: "Note vocale ajoutée",
      detail: transcription.trim().slice(0, 80) + (transcription.trim().length > 80 ? "…" : ""),
    });

    setTranscription("");
    setEditionManuelle(false);
    onNouvelleNote();
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        {!enregistrement ? (
          <Button variant="ghost" onClick={demarrer}>
            🎙 Dicter une note
          </Button>
        ) : (
          <Button onClick={arreter} className="!bg-signal">
            ⏹ Arrêter l&apos;enregistrement
          </Button>
        )}
        {!enregistrement && !editionManuelle && (
          <button
            onClick={ecrireManuel}
            className="text-xs text-ink/50 hover:text-ink underline"
          >
            ✍️ Écrire à la place
          </button>
        )}
        {enregistrement && (
          <span className="text-xs text-signal animate-pulse">Écoute en cours…</span>
        )}
      </div>

      {erreur && <p className="mt-2 text-sm text-signal">{erreur}</p>}

      {(transcription || editionManuelle) && (
        <Card className="mt-3 p-4">
          <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-2">
            {editionManuelle && !transcription
              ? "Écrivez votre note"
              : "Transcription — relisez et corrigez si besoin"}
          </p>
          <textarea
            autoFocus={editionManuelle}
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            rows={3}
            placeholder={editionManuelle ? "Ex : deux chevrons à remplacer, client veut refaire l'isolation…" : undefined}
            className="w-full text-sm text-ink/80 leading-relaxed border border-ink/10 bg-paper p-3 focus:outline-none focus:border-ink resize-none"
          />
          <Button
            onClick={enregistrerNote}
            disabled={sauvegarde || !transcription.trim()}
            className="mt-3"
          >
            {sauvegarde ? "Enregistrement…" : "Ajouter cette note au projet"}
          </Button>
        </Card>
      )}

      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {notes.map((n) => (
            <NoteVocaleItem key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}

// Une note dictée peut faire plusieurs minutes de transcription — sans
// repli, une seule note suffit à rendre toute la fiche projet interminable
// à faire défiler. Repliée par défaut au-delà de ~280 caractères.
const LONGUEUR_APERCU = 280;

function NoteVocaleItem({ note }: { note: NoteVocale }) {
  const [etendue, setEtendue] = useState(false);
  const estLongue = note.transcription.length > LONGUEUR_APERCU;
  const texteAffiche =
    estLongue && !etendue
      ? note.transcription.slice(0, LONGUEUR_APERCU).trimEnd() + "…"
      : note.transcription;

  return (
    <div className="border-l-2 border-ink/10 pl-3">
      <p className="text-sm text-ink/80 whitespace-pre-line">{texteAffiche}</p>
      {estLongue && (
        <button
          onClick={() => setEtendue(!etendue)}
          className="mt-1 text-xs text-ink/50 hover:text-ink underline"
        >
          {etendue ? "Afficher moins" : "Afficher plus"}
        </button>
      )}
      <p className="mt-1 text-xs text-ink/40 font-mono">
        {new Date(note.created_at).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
