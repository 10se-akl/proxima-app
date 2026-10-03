"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { enregistrerEvenement } from "@/lib/timeline";
import {
  assemblerTranscription,
  obtenirClasseReconnaissance,
  messageErreurDictee,
  type SpeechRecognitionInstance,
} from "@/lib/dictee";
import { Button } from "@/components/ui/Button";
import { BOUTON_CONTOUR, BOUTON_TEXTE } from "@/components/projet/Blocs";
import type { NoteVocale } from "@/types";

// La reconnaissance vocale sait aussi s'interrompre sans rien rendre
// (abort) : c'est ce qu'il faut quand la feuille se ferme.
type Reconnaissance = SpeechRecognitionInstance & { abort?: () => void };

export function NotesVocales({
  demandeId,
  notes,
  onNouvelleNote,
  masquerListe = false,
  demarrerAuMontage = false,
}: {
  demandeId: string;
  notes: NoteVocale[];
  telephoneClient?: string | null;
  onNouvelleNote: () => void;
  /** Fiche projet (24/09) : la dictée s’ouvre dans une feuille, les notes
   *  déjà enregistrées vivent dans le Carnet — pas besoin de les répéter. */
  masquerListe?: boolean;
  /** Refonte (03/10, duel D lot 2) — l'écoute démarre dès l'ouverture de
   *  la feuille (Dicter, parler, Terminé, Ajouter : trois gestes au lieu de
   *  cinq), SAUF si un brouillon est retrouvé : il s'affiche, et rien ne
   *  l'efface. */
  demarrerAuMontage?: boolean;
}) {
  const supabase = createClient();
  const [enregistrement, setEnregistrement] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [editionManuelle, setEditionManuelle] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const recognitionRef = useRef<Reconnaissance | null>(null);
  // 27/09 (Axel) — Toucher le texte arrête l'écoute : sinon chaque mot
  // entendu réécrivait le champ, et on ne pouvait pas corriger ni effacer.
  const ignorerResultats = useRef(false);
  // Refonte (03/10) — dicter à nouveau ajoute à la suite du texte déjà là
  // au lieu de l'effacer : un brouillon retrouvé ne se perd plus d'un appui.
  const texteAvant = useRef("");

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

  /** Coupe le micro sans rien rendre : fermeture de la feuille, geste
   *  retour, application quittée. */
  function couper() {
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (!r) return;
    r.onresult = null;
    r.onend = null;
    r.onerror = null;
    try {
      if (r.abort) r.abort();
      else r.stop();
    } catch {
      // Déjà arrêtée.
    }
  }

  useEffect(() => {
    let restaure = false;
    try {
      const brouillon = window.localStorage.getItem(cleBrouillon);
      if (brouillon && brouillon.trim()) {
        setTranscription(brouillon);
        setEditionManuelle(true);
        setBrouillonRestaure(true);
        restaure = true;
      }
    } catch {
      // localStorage indisponible (navigation privée, quota...) : le
      // filet de sécurité est simplement absent, jamais bloquant.
    }
    // L'écoute ne démarre seule que s'il n'y a rien à retrouver.
    if (!restaure && demarrerAuMontage) demarrer();

    // Application quittée (appel, écran éteint) : le micro se coupe, le
    // texte reste, l'écoute ne repart pas d'elle-même.
    const surVisibilite = () => {
      if (document.visibilityState === "hidden" && recognitionRef.current) {
        couper();
        setEnregistrement(false);
      }
    };
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      document.removeEventListener("visibilitychange", surVisibilite);
      // Feuille fermée (✕, voile, geste retour) : le micro ne reste pas
      // ouvert derrière.
      couper();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le texte est gardé à chaque mot. Il n'est effacé qu'explicitement
  // (note enregistrée, champ vidé à la main) : jamais par un rendu.
  useEffect(() => {
    try {
      if (transcription.trim()) window.localStorage.setItem(cleBrouillon, transcription);
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
    setBrouillonRestaure(false);
    setErreur(null);
    if (!ClasseReconnaissance) {
      // Pas de dictée sur ce navigateur : on ouvre directement la saisie
      // manuelle plutôt que de laisser un message d'erreur sans issue.
      setEditionManuelle(true);
      return;
    }
    couper();
    ignorerResultats.current = false;
    // Le texte déjà là est gardé : la dictée s'écrit à la suite.
    texteAvant.current = transcription.trim();

    const recognition: Reconnaissance = new ClasseReconnaissance();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      if (ignorerResultats.current) return;
      const dicte = assemblerTranscription(event.results);
      setTranscription([texteAvant.current, dicte].filter(Boolean).join(" "));
    };
    recognition.onend = () => setEnregistrement(false);
    recognition.onerror = (event) => {
      setEnregistrement(false);
      // "aborted" = l'artisan a cliqué sur Arrêter lui-même, pas une erreur.
      if (event?.error === "aborted") return;
      setErreur(messageErreurDictee(event?.error));
    };

    try {
      recognition.start();
    } catch {
      setErreur(messageErreurDictee());
      return;
    }
    recognitionRef.current = recognition;
    setEnregistrement(true);
  }

  function arreter() {
    recognitionRef.current?.stop();
    setEnregistrement(false);
  }

  function ecrireManuel() {
    couper();
    setEnregistrement(false);
    setBrouillonRestaure(false);
    setErreur(null);
    setEditionManuelle(true);
  }

  // Journal chantier vocal (06/09) — interprétation best-effort d'une note
  // déjà enregistrée avec succès. Ne doit JAMAIS faire échouer ou ralentir
  // visiblement la sauvegarde de la note elle-même.
  async function enregistrerNote() {
    if (!transcription.trim()) return;
    if (enregistrement) {
      ignorerResultats.current = true;
      couper();
      setEnregistrement(false);
    }
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
        setErreur("Pas enregistré. Gardé sur ce téléphone.");
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

      // (13/09) — Plus AUCUN appel IA ici : l'extraction des tâches et la
      // détection d'urgence se font en une fois, quand l'artisan demande
      // « Résumer mes notes avec l'IA » (app/api/ai/analyser-demande).
    } catch {
      setSauvegarde(false);
      setErreur("Pas de réseau. Gardé sur ce téléphone.");
    }
  }

  const aDuTexte = transcription.trim().length > 0;
  const montrerChamp = enregistrement || aDuTexte || editionManuelle;

  return (
    <div>
      {enregistrement && (
        <p className="flex items-center gap-2 text-sm text-ink" aria-live="polite">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-signal-fonce motion-safe:animate-pulse dark:bg-signal-clair" />
          J&apos;écoute… Parlez, le texte s&apos;écrit ici.
        </p>
      )}

      <div aria-live="polite">
        {erreur && <p className="text-sm font-semibold text-signal-fonce dark:text-signal-clair">{erreur}</p>}
        {brouillonRestaure && !erreur && <p className="text-sm text-steel">Retrouvé sur ce téléphone. Relisez avant d&apos;ajouter.</p>}
      </div>

      {montrerChamp && (
        <textarea
          aria-label="Texte de la note"
          autoFocus={editionManuelle && !aDuTexte}
          value={transcription}
          onFocus={() => {
            if (!enregistrement) return;
            ignorerResultats.current = true;
            arreter();
          }}
          onChange={(e) => {
            setTranscription(e.target.value);
            // Vidé pour être retapé : le champ reste là.
            setEditionManuelle(true);
            if (!e.target.value.trim()) effacerBrouillon();
          }}
          rows={4}
          placeholder={editionManuelle ? "Ex : deux chevrons à remplacer…" : undefined}
          className="mt-2 w-full resize-none rounded-2xl bg-surface p-3 text-base text-ink ring-1 ring-inset ring-ink/15 placeholder:text-steel focus:outline-none focus:ring-2 focus:ring-ink"
        />
      )}

      {/* Un seul bouton plein : « Terminé » pendant l'écoute, « Ajouter au
          projet » ensuite, « Dicter » quand il n'y a rien. */}
      <div className="mt-3 flex flex-col gap-2">
        {enregistrement ? (
          <Button onClick={arreter} className="min-h-14 w-full">
            Terminé
          </Button>
        ) : aDuTexte ? (
          <>
            <Button onClick={enregistrerNote} loading={sauvegarde} className="min-h-14 w-full">
              Ajouter au projet
            </Button>
            {ClasseReconnaissance && (
              <button type="button" onClick={demarrer} disabled={sauvegarde} className={BOUTON_CONTOUR}>
                Dicter la suite
              </button>
            )}
          </>
        ) : (
          <>
            {ClasseReconnaissance && (
              <Button onClick={demarrer} className="min-h-14 w-full">
                {erreur ? "Réessayer" : "Dicter"}
              </Button>
            )}
            {!editionManuelle && (
              <button type="button" onClick={ecrireManuel} className={`self-center ${BOUTON_TEXTE}`}>
                Écrire à la place
              </button>
            )}
          </>
        )}
      </div>

      {!masquerListe && notes.length > 0 && (
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
    <div className="border-l-2 border-ink/15 pl-3">
      <p className="whitespace-pre-line text-sm text-ink">{texteAffiche}</p>
      {estLongue && (
        <button type="button" onClick={() => setEtendue(!etendue)} className={`-ml-3 ${BOUTON_TEXTE}`}>
          {etendue ? "Afficher moins" : "Afficher plus"}
        </button>
      )}
      <p className="mt-1 font-mono text-xs tabular-nums text-steel">{new Date(note.created_at).toLocaleString("fr-FR")}</p>
    </div>
  );
}
