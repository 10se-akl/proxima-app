"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getOrganisationId } from "@/lib/organisation";
import { creerNote, LABEL_IMPORTANCE, COULEUR_POINT_IMPORTANCE } from "@/lib/notes";
import { enregistrerEvenement } from "@/lib/timeline";
import { demanderAbonnementSiNecessaire } from "@/lib/pwa/notifications";
import {
  obtenirClasseReconnaissance,
  messageErreurDictee,
  type SpeechRecognitionInstance,
} from "@/lib/dictee";
import { Field, TextareaField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ImportanceNote } from "@/types";

type ProjetLeger = { id: string; nom_client: string };

// ============================================================
// Formulaire de création d'une note — réutilisé tel quel par
// app/dashboard/notes/nouvelle/page.tsx (page dédiée, projet à choisir)
// ET par la section Notes de la fiche projet (projetIdFixe déjà connu,
// sélecteur masqué — point 2 du brief : "Le projet est alors déjà
// sélectionné.").
//
// Dictée (point 7 du brief) : dicter → /api/notes/dicter structure la
// note (titre/description/importance estimée) → TOUJOURS relue et
// modifiable avant validation, jamais enregistrée directement — même
// philosophie "l'IA propose, l'artisan valide" que partout ailleurs dans
// Compyo.
//
// Permission de notification (philosophie du brief : jamais demandée au
// chargement de l'app) : demanderAbonnementSiNecessaire() n'est appelée
// qu'ici, uniquement si l'artisan a activé "Programmer un rappel" et
// valide le formulaire — le contexte le plus logique possible.
// ============================================================
export function FormulaireNote({
  projetIdFixe,
  nomProjetFixe,
  projets,
  onCree,
  onAnnuler,
}: {
  projetIdFixe?: string;
  nomProjetFixe?: string;
  projets?: ProjetLeger[];
  onCree?: () => void;
  onAnnuler?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [demandeId, setDemandeId] = useState(projetIdFixe ?? "");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<ImportanceNote>("verte");
  const [avecRappel, setAvecRappel] = useState(false);
  const [dateRappel, setDateRappel] = useState("");
  const [heureRappel, setHeureRappel] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [dicteeEnCours, setDicteeEnCours] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [brouillonRestaure, setBrouillonRestaure] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Audit pré-bêta (09/09), point 🔴 n°3 — même filet de sécurité que celui
  // déjà en place sur les notes vocales liées à un projet (voir
  // components/dashboard/NotesVocales.tsx, cleBrouillon) : ce formulaire
  // n'en avait aucun, alors qu'il sert AUSSI bien depuis /dashboard/notes/
  // nouvelle que depuis la fiche projet (voir onCree/projetIdFixe
  // ci-dessus) — un artisan interrompu en pleine dictée perdait tout, sans
  // avertissement. Clé par projet quand la note est liée à une fiche
  // (comportement identique à NotesVocales) ; clé générique sinon (note
  // générale, un seul brouillon en cours à la fois dans ce cas).
  const cleBrouillon = `compyo_brouillon_note_${projetIdFixe ?? "generale"}`;

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(cleBrouillon);
      if (!brut) return;
      const brouillon = JSON.parse(brut) as { titre?: string; description?: string };
      if (brouillon.titre?.trim() || brouillon.description?.trim()) {
        setTitre(brouillon.titre ?? "");
        setDescription(brouillon.description ?? "");
        setBrouillonRestaure(true);
      }
    } catch {
      // localStorage indisponible ou contenu corrompu : filet de sécurité
      // simplement absent, jamais bloquant pour la saisie.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (titre.trim() || description.trim()) {
        window.localStorage.setItem(cleBrouillon, JSON.stringify({ titre, description }));
      } else {
        window.localStorage.removeItem(cleBrouillon);
      }
    } catch {
      // Idem — best effort, ne doit jamais faire planter la saisie.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titre, description]);

  function effacerBrouillon() {
    try {
      window.localStorage.removeItem(cleBrouillon);
    } catch {
      // best effort
    }
  }

  // Point 🟠 (audit pré-bêta 09/09) — sur un navigateur sans reconnaissance
  // vocale (Safari iOS, Firefox), l'affordance de dictée n'est même pas
  // affichée (voir plus bas, `!!ClasseReconnaissance`) : aligné sur le
  // comportement de NotesVocales.tsx, qui bascule aussi silencieusement en
  // saisie manuelle sans jamais montrer d'erreur.
  const ClasseReconnaissance = obtenirClasseReconnaissance();

  function dicter() {
    if (!ClasseReconnaissance) return;
    setErreur(null);

    const recognition = new ClasseReconnaissance();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;
    let texteFinal = "";
    recognition.onresult = (event) => {
      let texte = "";
      for (let i = 0; i < event.results.length; i++) {
        texte += event.results[i][0].transcript;
      }
      texteFinal = texte;
    };
    recognition.onend = async () => {
      setEnregistrement(false);
      if (!texteFinal.trim()) return;
      setDicteeEnCours(true);
      try {
        const res = await fetch("/api/notes/dicter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texte: texteFinal }),
        });
        const data = await res.json();
        if (res.ok) {
          setTitre(data.titre);
          setDescription(data.description || "");
          setImportance(data.importance);
        } else {
          // Repli : le texte brut dicté reste utilisable tel quel dans le
          // titre plutôt que de tout perdre si l'IA échoue.
          setTitre(texteFinal.slice(0, 80));
          setErreur(data.error ?? "L'IA n'a pas pu structurer la note — vérifiez le texte ci-dessous.");
        }
      } catch {
        setTitre(texteFinal.slice(0, 80));
        setErreur("Impossible de contacter l'IA — vérifiez le texte ci-dessous.");
      } finally {
        setDicteeEnCours(false);
      }
    };
    recognition.onerror = (event) => {
      setEnregistrement(false);
      if (event?.error === "aborted") return;
      setErreur(messageErreurDictee(event?.error));
    };
    recognition.start();
    recognitionRef.current = recognition;
    setEnregistrement(true);
  }

  function arreterDictee() {
    recognitionRef.current?.stop();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (!titre.trim()) {
      setErreur("Le titre est nécessaire.");
      return;
    }
    if (avecRappel && (!dateRappel || !heureRappel)) {
      setErreur("Complétez la date et l'heure du rappel, ou désactivez-le.");
      return;
    }

    setChargement(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErreur("Session expirée, reconnectez-vous.");
      setChargement(false);
      return;
    }

    const organisationId = await getOrganisationId(supabase, user.id);
    if (!organisationId) {
      setErreur("Aucune organisation associée à ce compte.");
      setChargement(false);
      return;
    }

    const rappelA = avecRappel ? new Date(`${dateRappel}T${heureRappel}`).toISOString() : null;

    const { note, erreur: erreurCreation } = await creerNote(supabase, {
      organisationId,
      artisanId: user.id,
      demandeId: demandeId || null,
      titre: titre.trim(),
      description: description.trim() || null,
      importance,
      rappelA,
    });

    setChargement(false);

    if (erreurCreation || !note) {
      setErreur(erreurCreation ?? "Impossible d'enregistrer la note.");
      return;
    }

    effacerBrouillon();

    if (demandeId) {
      await enregistrerEvenement(supabase, {
        demandeId,
        artisanId: user.id,
        organisationId,
        type: "note_ajoutee",
        titre: "Note ajoutée",
        detail: titre.trim(),
      });
    }

    // Demande de permission notification UNIQUEMENT si un rappel a été
    // programmé — jamais sinon (voir commentaire en tête de fichier). Ne
    // bloque jamais la création : la note existe déjà, l'abonnement est un
    // bonus best-effort.
    if (rappelA) {
      demanderAbonnementSiNecessaire();
    }

    if (onCree) {
      onCree();
    } else {
      router.push(demandeId ? `/dashboard/demandes/${demandeId}` : "/dashboard/notes");
    }
  }

  const projetSelectionne = projets?.find((p) => p.id === demandeId);

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {projetIdFixe ? (
          nomProjetFixe && (
            <p className="text-xs text-ink/50">
              Projet : <span className="font-medium text-ink/70">{nomProjetFixe}</span>
            </p>
          )
        ) : (
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1.5">Projet concerné</label>
            <select
              value={demandeId}
              onChange={(e) => setDemandeId(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/15"
            >
              <option value="">Aucun projet (note générale)</option>
              {(projets ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom_client}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-ink/70">Titre, description...</p>
          {ClasseReconnaissance &&
            (!enregistrement ? (
              <button
                type="button"
                onClick={dicter}
                disabled={dicteeEnCours}
                className="text-xs text-ink/50 hover:text-ink underline transition-colors disabled:opacity-50"
              >
                {dicteeEnCours ? "Analyse…" : "🎙 Dicter plutôt que taper"}
              </button>
            ) : (
              <button
                type="button"
                onClick={arreterDictee}
                className="text-xs text-signal underline animate-pulse"
              >
                ⏹ Arrêter l'écoute
              </button>
            ))}
        </div>

        {brouillonRestaure && (
          <p className="text-xs text-steel -mt-2">
            Note non enregistrée retrouvée — relisez-la avant de l&apos;enregistrer.
          </p>
        )}

        <Field
          label="Titre"
          required
          placeholder="Ex : Commander les joints"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />

        <TextareaField
          label="Description (optionnel)"
          rows={3}
          placeholder="Détails, contexte..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1.5">Importance</label>
          <div className="flex gap-2">
            {(Object.keys(LABEL_IMPORTANCE) as ImportanceNote[]).map((niveau) => (
              <button
                key={niveau}
                type="button"
                onClick={() => setImportance(niveau)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm border transition-all duration-150 ${
                  importance === niveau
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/15 text-ink/60 hover:border-ink/30 hover:text-ink"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    importance === niveau ? "bg-paper" : COULEUR_POINT_IMPORTANCE[niveau]
                  }`}
                />
                {LABEL_IMPORTANCE[niveau]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2.5 text-sm text-ink/80 cursor-pointer">
            <input
              type="checkbox"
              checked={avecRappel}
              onChange={(e) => setAvecRappel(e.target.checked)}
              className="w-4 h-4 rounded border-ink/30 accent-signal"
            />
            Programmer un rappel
          </label>
          <p className="mt-1 text-xs text-ink/40">
            Jamais obligatoire — sans rappel, cette note n&apos;envoie aucune notification.
          </p>
          {avecRappel && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field
                label="Date"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={dateRappel}
                onChange={(e) => setDateRappel(e.target.value)}
              />
              <Field
                label="Heure"
                type="time"
                required
                value={heureRappel}
                onChange={(e) => setHeureRappel(e.target.value)}
              />
            </div>
          )}
        </div>

        {erreur && <p className="text-sm text-signal">{erreur}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={chargement}>
            {chargement ? "Enregistrement…" : "Enregistrer la note"}
          </Button>
          {onAnnuler && (
            <Button type="button" variant="ghost" onClick={onAnnuler}>
              Annuler
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
