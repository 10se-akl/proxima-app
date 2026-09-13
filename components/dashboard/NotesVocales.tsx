"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import { creerNote } from "@/lib/notes";
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
  telephoneClient,
  onNouvelleNote,
}: {
  demandeId: string;
  notes: NoteVocale[];
  telephoneClient?: string | null;
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

  // Sprint Robustesse (30/08) — 🔴 corrigé : une note dictée/tapée sur
  // chantier n'existait qu'en mémoire React tant qu'elle n'était pas
  // enregistrée. Une coupure réseau pendant l'envoi, ou même juste un
  // artisan qui change de page par erreur avant de cliquer "Ajouter",
  // faisait perdre définitivement plusieurs minutes de transcription.
  // Sauvegarde locale de secours (localStorage, par projet) : la note en
  // cours de rédaction est retrouvée automatiquement à la réouverture de
  // la fiche, même après une fermeture accidentelle de l'onglet. Purement
  // un filet de sécurité local — jamais envoyée nulle part tant que
  // l'artisan ne clique pas "Ajouter cette note au projet".
  const cleBrouillon = `compyo_brouillon_note_vocale_${demandeId}`;
  const [brouillonRestaure, setBrouillonRestaure] = useState(false);

  useEffect(() => {
    try {
      const brouillon = window.localStorage.getItem(cleBrouillon);
      if (brouillon && brouillon.trim()) {
        setTranscription(brouillon);
        setEditionManuelle(true);
        setBrouillonRestaure(true);
      }
    } catch {
      // localStorage indisponible (navigation privée, quota...) : le
      // filet de sécurité est simplement absent, jamais bloquant.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (transcription.trim()) {
        window.localStorage.setItem(cleBrouillon, transcription);
      } else {
        window.localStorage.removeItem(cleBrouillon);
      }
    } catch {
      // Idem — best effort, ne doit jamais faire planter la saisie.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcription]);

  function effacerBrouillon() {
    try {
      window.localStorage.removeItem(cleBrouillon);
    } catch {
      // best effort
    }
  }

  function demarrer() {
    // Sprint Robustesse (30/08) — repéré en revue de régression : sans ce
    // reset, le bandeau "Note non enregistrée retrouvée" restait affiché
    // à tort au-dessus d'une toute nouvelle dictée, laissant croire que le
    // nouveau texte était l'ancien brouillon restauré.
    setBrouillonRestaure(false);
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
    setBrouillonRestaure(false);
    setErreur(null);
    setTranscription("");
    setEditionManuelle(true);
  }

  // Journal chantier vocal (06/09) — interprétation best-effort d'une note
  // déjà enregistrée avec succès. Ne doit JAMAIS faire échouer ou ralentir
  // visiblement la sauvegarde de la note elle-même (voir l'appel plus bas,
  // volontairement non "await"é dans le flux principal ni signalé par une
  // erreur visible en cas d'échec) — un compte-rendu mal interprété reste
  // quand même une note vocale correctement sauvegardée.
  async function enregistrerNote() {
    if (!transcription.trim()) return;
    setSauvegarde(true);
    setErreur(null);

    // Sprint Robustesse (30/08) — 🔴 try/catch ajouté autour de toute la
    // fonction : avant, une exception réseau (pas juste une erreur
    // Supabase "propre") laissait le bouton bloqué sur "Enregistrement…"
    // pour toujours, sans message, sans possibilité de réessayer. La
    // transcription elle-même n'est jamais effacée avant confirmation du
    // succès — elle reste affichée et modifiable, et le brouillon local
    // (voir plus haut) la protège même si l'artisan quitte la page.
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErreur("Session expirée, reconnectez-vous.");
        setSauvegarde(false);
        return;
      }

      const organisationId = await getOrganisationId(supabase, user.id);
      if (!organisationId) {
        setErreur("Aucune organisation associée à ce compte, reconnectez-vous.");
        setSauvegarde(false);
        return;
      }

      const { error } = await supabase.from("notes_vocales").insert({
        demande_id: demandeId,
        artisan_id: user.id,
        organisation_id: organisationId,
        transcription: transcription.trim(),
      });

      if (error) {
        setSauvegarde(false);
        setErreur("Impossible d'enregistrer la note. Votre texte est conservé — réessayez.");
        return;
      }

      const texteNote = transcription.trim();

      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        organisationId,
        type: "note_vocale_ajoutee",
        titre: "Note vocale ajoutée",
        detail: texteNote.slice(0, 80) + (texteNote.length > 80 ? "…" : ""),
      });

      effacerBrouillon();
      setSauvegarde(false);
      setTranscription("");
      setEditionManuelle(false);
      setBrouillonRestaure(false);
      onNouvelleNote();

      // (13/09) — Plus AUCUN appel IA ici. Chaque note vocale déclenchait
      // auparavant une interprétation immédiate : quatre dictées sur un
      // chantier = quatre appels facturés, et quatre notes "Tâches
      // restantes" empilées, parfois identiques mot pour mot. L'extraction
      // des tâches et la détection d'urgence se font désormais en UNE fois,
      // quand l'artisan demande explicitement "Analyser avec l'IA" (voir
      // app/api/ai/analyser-demande/route.ts) : moins cher, moins bruyant,
      // et plus juste — l'IA voit alors toutes les notes ensemble, donc
      // elle dédoublonne et retire ce qui a été fait entre-temps.
      //
      // La dictée elle-même reste évidemment intacte : la transcription est
      // enregistrée telle quelle, immédiatement, sans dépendre de l'IA.
    } catch {
      setSauvegarde(false);
      setErreur("Connexion perdue. Votre texte est conservé — réessayez dès que le réseau revient.");
    }
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
            className="text-xs text-ink/50 hover:text-ink underline transition-colors"
          >
            ✍️ Écrire à la place
          </button>
        )}
        {enregistrement && (
          <span className="text-xs text-signal animate-pulse">Écoute en cours…</span>
        )}
      </div>

      {erreur && <p className="mt-2 text-sm text-signal">{erreur}</p>}

      {brouillonRestaure && !erreur && (
        <p className="mt-2 text-xs text-steel">
          Note non enregistrée retrouvée — relisez-la avant de l&apos;ajouter.
        </p>
      )}

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
            className="w-full text-sm text-ink/80 leading-relaxed rounded-xl border border-ink/10 bg-paper p-3 transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15 resize-none"
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
          className="mt-1 text-xs text-ink/50 hover:text-ink underline transition-colors"
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
