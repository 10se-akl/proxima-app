"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Input";

// ============================================================
// "Carte des problèmes" — voir Module 15 (supabase/schema.sql) et la
// route app/api/retours/route.ts (NE PAS MODIFIER, déjà en place).
//
// Chaque problème est placé sur un cercle autour d'un centre, par pure
// trigonométrie (pas de simulation physique, pas de librairie de graphe
// — le registre npm n'est pas accessible dans cet environnement, voir
// le commentaire de components/marketing/IntroAnimation.tsx pour le
// même choix). La taille du point reflète le nombre d'avis, sa couleur/
// opacité reflète l'importance moyenne perçue.
//
// Important côté confidentialité : la réponse de GET /api/retours ne
// contient JAMAIS de nom ni d'identifiant de personne (voir le
// commentaire en tête de route.ts) — uniquement id/titre/description/
// nombreAvis/importanceMoyenne/monAvis. On ne suppose donc jamais
// l'existence d'un champ auteur ici.
// ============================================================

type Probleme = {
  id: string;
  titre: string;
  description: string | null;
  nombreAvis: number;
  importanceMoyenne: number;
  monAvis: number | null;
};

const TAILLE_VIEWBOX = 200;
const CENTRE = TAILLE_VIEWBOX / 2;
const RAYON_DISPOSITION = 70;

function rayonPoint(nombreAvis: number) {
  // 8 de base (visible même à 0 avis) + 2 par avis, plafonné pour qu'un
  // problème très populaire ne mange pas toute la carte.
  return Math.min(8 + nombreAvis * 2, 26);
}

function opacitePoint(importanceMoyenne: number) {
  // 0 avis → importanceMoyenne à 0 côté API : on garde un minimum visible
  // plutôt qu'un point quasi invisible.
  const base = importanceMoyenne > 0 ? importanceMoyenne / 10 : 0.25;
  return Math.min(Math.max(base, 0.25), 1);
}

function positionPoint(index: number, total: number) {
  if (total <= 1) {
    return { x: CENTRE, y: CENTRE - RAYON_DISPOSITION };
  }
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: CENTRE + RAYON_DISPOSITION * Math.cos(angle),
    y: CENTRE + RAYON_DISPOSITION * Math.sin(angle),
  };
}

export default function RetoursPage() {
  const [problemes, setProblemes] = useState<Probleme[] | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [selectionId, setSelectionId] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreurChargement(null);
    try {
      const res = await fetch("/api/retours");
      const data = await res.json();
      if (!res.ok) {
        setErreurChargement(data.error || "Impossible de charger les retours.");
        return;
      }
      setProblemes(data.problemes);
    } catch {
      setErreurChargement("Impossible de charger les retours. Vérifiez votre connexion.");
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const problemeSelectionne = useMemo(
    () => problemes?.find((p) => p.id === selectionId) ?? null,
    [problemes, selectionId]
  );

  return (
    <div className="p-8 max-w-3xl">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-steel mb-2">
        Retours
      </p>
      <h1 className="font-display text-2xl font-semibold">Vos retours sur Compyo</h1>
      <p className="mt-2 text-sm text-ink/60">
        Signalez ce qui vous pose problème, notez à quel point ça compte pour vous. Les
        autres artisans voient les problèmes remontés (jamais qui les a remontés) — ça
        nous aide à savoir quoi améliorer en priorité.
      </p>

      {erreurChargement && (
        <p className="mt-4 text-sm text-signal">{erreurChargement}</p>
      )}

      {problemes === null && !erreurChargement && (
        <p className="mt-6 text-sm text-ink/50">Chargement…</p>
      )}

      {problemes !== null && (
        <>
          <CarteProblemes
            problemes={problemes}
            selectionId={selectionId}
            onSelect={setSelectionId}
          />

          {problemeSelectionne && (
            <Card className="mt-4 p-5">
              <PanneauProbleme
                probleme={problemeSelectionne}
                onVoteEnvoye={charger}
                onFermer={() => setSelectionId(null)}
              />
            </Card>
          )}

          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold text-ink/70 mb-4">
              Tous les problèmes remontés
            </h2>
            {problemes.length === 0 ? (
              <p className="text-sm text-ink/50">
                Aucun problème remonté pour l&apos;instant.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {problemes.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectionId(p.id)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors duration-200 ${
                        p.id === selectionId
                          ? "border-signal/40 bg-signal/5"
                          : "border-ink/10 hover:border-ink/20 hover:bg-ink/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-ink">{p.titre}</p>
                        <span className="shrink-0 text-[11px] font-mono text-steel">
                          {p.nombreAvis} avis · {p.importanceMoyenne}/10
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink/50">
                        {p.monAvis !== null
                          ? `Vous avez noté ce problème ${p.monAvis}/10`
                          : "Vous n'avez pas encore donné votre avis"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-ink/70 mb-1">Signaler un nouveau problème</h2>
        <p className="text-xs text-ink/50 mb-4">
          Décrivez ce qui vous bloque ou vous fait perdre du temps, avec vos mots. On
          rapproche automatiquement votre message d&apos;un problème déjà connu si c&apos;est le
          même sujet.
        </p>
        <FormulaireNouveauProbleme onEnvoye={charger} />
      </Card>
    </div>
  );
}

function CarteProblemes({
  problemes,
  selectionId,
  onSelect,
}: {
  problemes: Probleme[];
  selectionId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl bg-anthracite p-4 overflow-hidden">
      {problemes.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-12">
          Aucun problème remonté pour l&apos;instant — soyez le premier.
        </p>
      ) : (
        <svg viewBox={`0 0 ${TAILLE_VIEWBOX} ${TAILLE_VIEWBOX}`} className="w-full h-auto max-h-[420px]">
          {/* Lignes de liaison vers le centre, dessinées avant les points
              pour rester en dessous. */}
          {problemes.map((p, i) => {
            const { x, y } = positionPoint(i, problemes.length);
            return (
              <line
                key={`ligne-${p.id}`}
                x1={CENTRE}
                y1={CENTRE}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={0.6}
              />
            );
          })}

          {/* Point central, purement décoratif : représente "Compyo". */}
          <circle cx={CENTRE} cy={CENTRE} r={4} fill="rgba(255,255,255,0.35)" />

          {problemes.map((p, i) => {
            const { x, y } = positionPoint(i, problemes.length);
            const actif = p.id === selectionId;
            return (
              <g
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="cursor-pointer"
                role="button"
                aria-label={p.titre}
              >
                {actif && (
                  <circle
                    cx={x}
                    cy={y}
                    r={rayonPoint(p.nombreAvis) + 4}
                    fill="none"
                    stroke="#E8A487"
                    strokeWidth={1}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={rayonPoint(p.nombreAvis)}
                  fill="#C96B4A"
                  opacity={opacitePoint(p.importanceMoyenne)}
                  className="transition-opacity duration-200"
                />
              </g>
            );
          })}
        </svg>
      )}
      <p className="mt-2 text-center text-[11px] text-white/40">
        Taille = nombre d&apos;avis · Couleur = importance moyenne · Cliquez un point pour le détail
      </p>
    </div>
  );
}

function PanneauProbleme({
  probleme,
  onVoteEnvoye,
  onFermer,
}: {
  probleme: Probleme;
  onVoteEnvoye: () => void;
  onFermer: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{probleme.titre}</h3>
        <button
          onClick={onFermer}
          className="text-xs text-ink/40 hover:text-ink/70 shrink-0"
          aria-label="Fermer"
        >
          Fermer
        </button>
      </div>
      {probleme.description && (
        <p className="mt-2 text-sm text-ink/60">{probleme.description}</p>
      )}
      <p className="mt-2 text-xs font-mono text-steel">
        {probleme.nombreAvis} avis · importance moyenne {probleme.importanceMoyenne}/10
      </p>

      <div className="mt-4">
        <ControleVote
          probleteId={probleme.id}
          monAvis={probleme.monAvis}
          onEnvoye={onVoteEnvoye}
        />
      </div>
    </div>
  );
}

function ControleVote({
  probleteId,
  monAvis,
  onEnvoye,
}: {
  probleteId: string;
  monAvis: number | null;
  onEnvoye: () => void;
}) {
  const [modifier, setModifier] = useState(monAvis === null);
  const [importance, setImportance] = useState(monAvis ?? 5);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    setModifier(monAvis === null);
    setImportance(monAvis ?? 5);
  }, [monAvis, probleteId]);

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probleme_id: probleteId, importance }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error || "Impossible d'enregistrer votre avis.");
        setEnvoi(false);
        return;
      }
      setEnvoi(false);
      setModifier(false);
      onEnvoye();
    } catch {
      setErreur("Impossible d'enregistrer votre avis. Vérifiez votre connexion.");
      setEnvoi(false);
    }
  }

  if (!modifier && monAvis !== null) {
    return (
      <p className="text-sm text-ink/70">
        Vous avez noté ce problème{" "}
        <span className="font-semibold text-ink">{monAvis}/10</span>.{" "}
        <button
          onClick={() => setModifier(true)}
          className="text-signal underline underline-offset-2 hover:text-signal-fonce"
        >
          Changer ma note
        </button>
      </p>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-2">
        À quel point ça compte pour vous ? ({importance}/10)
      </label>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={importance}
        onChange={(e) => setImportance(Number(e.target.value))}
        className="w-full accent-signal"
      />
      {erreur && <p className="mt-2 text-xs text-signal">{erreur}</p>}
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={envoyer} disabled={envoi} className="!px-4 !py-2 text-xs">
          {envoi ? "Enregistrement…" : monAvis !== null ? "Mettre à jour ma note" : "Confirmer"}
        </Button>
        {monAvis !== null && (
          <button
            onClick={() => setModifier(false)}
            className="text-xs text-ink/40 hover:text-ink/70"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function FormulaireNouveauProbleme({ onEnvoye }: { onEnvoye: () => void }) {
  const [texte, setTexte] = useState("");
  const [importance, setImportance] = useState(5);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    setErreur(null);
    setConfirme(false);
    try {
      const res = await fetch("/api/retours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte, importance }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error || "Impossible d'envoyer votre retour.");
        setEnvoi(false);
        return;
      }
      setTexte("");
      setImportance(5);
      setEnvoi(false);
      setConfirme(true);
      onEnvoye();
    } catch {
      setErreur("Impossible d'envoyer votre retour. Vérifiez votre connexion.");
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextareaField
        label="Votre retour"
        rows={4}
        required
        placeholder="Ex : Je ne peux pas dupliquer un ancien devis, je dois tout retaper à chaque fois."
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
      />
      <div>
        <label className="block text-xs font-medium text-ink/70 mb-2">
          À quel point ça compte pour vous ? ({importance}/10)
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={importance}
          onChange={(e) => setImportance(Number(e.target.value))}
          className="w-full accent-signal"
        />
      </div>

      {erreur && <p className="text-sm text-signal">{erreur}</p>}
      {confirme && (
        <p className="text-sm text-steel">
          Merci, votre retour a bien été pris en compte.
        </p>
      )}

      <Button type="submit" disabled={envoi} className="self-start">
        {envoi ? "Analyse en cours…" : "Envoyer"}
      </Button>
    </form>
  );
}
