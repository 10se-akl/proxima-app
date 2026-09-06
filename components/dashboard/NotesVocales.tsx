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

// Journal chantier vocal (06/09) — résultat ÉPHÉMÈRE affiché juste après la
// dictée, même logique que le brouillon de réponse client ailleurs dans
// l'app (app/dashboard/demandes/[id]/page.tsx, brouillonReponse) : pas
// persisté tel quel, il disparaît à la fermeture/au rechargement de la
// page. Ce qui doit survivre (tâches restantes, signal de fin de chantier)
// est déjà enregistré en base à ce moment-là (note + événement timeline),
// donc rien n'est perdu — seul l'AFFICHAGE du brouillon de message est
// éphémère, comme partout ailleurs dans le produit.
type InterpretationNote = {
  brouillonMessageClient: string | null;
};

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
  const [interpretation, setInterpretation] = useState<InterpretationNote | null>(null);
  const [copie, setCopie] = useState(false);
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
    setInterpretation(null);
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
    setInterpretation(null);
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
  async function interpreterNote(texte: string, userId: string, orgId: string) {
    try {
      const res = await fetch("/api/ai/interpreter-note-vocale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandeId, transcription: texte }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const tachesRestantes: string[] = Array.isArray(data.tachesRestantes) ? data.tachesRestantes : [];
      const brouillonMessageClient: string | null = data.brouillonMessageClient ?? null;
      const rappelLendemain: boolean = Boolean(data.rappelLendemain);
      const chantierSembleTermine: boolean = Boolean(data.chantierSembleTermine);

      // Tâches restantes (06/09) — regroupées dans UNE seule note plutôt
      // qu'une par tâche : réutilise tel quel le système de notes déjà
      // coché/décoché existant (voir lib/notes/index.ts), sans créer de
      // nouvelle mécanique de liste à cocher. Choix de conception : une
      // note consolidée reste plus simple à lire qu'une rafale de 3-5
      // petites notes séparées pour un artisan qui n'a pas le temps.
      if (tachesRestantes.length > 0) {
        const demain = new Date();
        demain.setDate(demain.getDate() + 1);
        demain.setHours(8, 0, 0, 0);
        await creerNote(supabase, {
          organisationId: orgId,
          artisanId: userId,
          demandeId,
          titre: `Tâches restantes — ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`,
          description: tachesRestantes.map((t) => `- ${t}`).join("\n"),
          importance: "verte",
          rappelA: rappelLendemain ? demain.toISOString() : null,
        });
      }

      // Trace toujours un événement, même sans tâche détectée — sert de
      // signal pour la détection de fin de chantier (voir
      // app/dashboard/page.tsx, plusieurs signaux "chantier_semble_termine"
      // consécutifs) en plus de garder l'historique complet sur la fiche
      // projet.
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: userId,
        organisationId: orgId,
        type: "journal_chantier_interprete",
        titre: "Compte-rendu interprété",
        detail:
          tachesRestantes.length > 0
            ? `${tachesRestantes.length} tâche${tachesRestantes.length > 1 ? "s" : ""} restante${tachesRestantes.length > 1 ? "s" : ""} détectée${tachesRestantes.length > 1 ? "s" : ""}`
            : "Rien de particulier détecté",
        metadata: {
          chantier_semble_termine: chantierSembleTermine,
          rappel_lendemain: rappelLendemain,
          nb_taches: tachesRestantes.length,
        },
      });

      if (brouillonMessageClient) {
        setInterpretation({ brouillonMessageClient });
      }

      onNouvelleNote();
    } catch {
      // Best-effort — la note vocale elle-même est déjà en sécurité, voir
      // commentaire au-dessus de la fonction.
    }
  }

  async function envoyerMessageParSms() {
    if (!interpretation?.brouillonMessageClient) return;
    if (telephoneClient) {
      const numero = telephoneClient.replace(/[^\d+]/g, "");
      window.open(`sms:${numero}?body=${encodeURIComponent(interpretation.brouillonMessageClient)}`, "_self");
      return;
    }
    try {
      await navigator.clipboard.writeText(interpretation.brouillonMessageClient);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Copie best-effort — le texte reste de toute façon affiché et
      // sélectionnable manuellement.
    }
  }

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

      // Volontairement non "await"é : l'artisan n'a pas à attendre ce
      // second appel IA pour reprendre la main, la note est déjà en
      // sécurité (voir commentaire sur interpreterNote plus haut).
      interpreterNote(texteNote, user.id, organisationId);
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

      {interpretation?.brouillonMessageClient && (
        <Card className="mt-3 p-4">
          <p className="text-xs font-medium text-ink/50 uppercase tracking-wider mb-2">
            Message client suggéré — relisez avant d&apos;envoyer
          </p>
          <p className="text-sm text-ink/80 whitespace-pre-line">
            {interpretation.brouillonMessageClient}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="ghost" onClick={envoyerMessageParSms}>
              {telephoneClient ? "📱 Envoyer par SMS" : copie ? "✓ Copié" : "Copier le message"}
            </Button>
            <button
              onClick={() => setInterpretation(null)}
              className="text-xs text-ink/40 hover:text-ink/60 underline transition-colors"
            >
              Ignorer
            </button>
          </div>
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
