"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

// ============================================================
// La carte mentale (Module 16, voir supabase/schema.sql + app/api/retours
// et app/api/admin/retours) : Axel a explicitement demandé de ne PAS faire
// un simple graphe statique — fond sombre, bulles flottantes/respirantes,
// parallax souris, particules discrètes, panneau premium au clic. Tout en
// CSS pur (voir app/globals.css, bloc "Carte mentale") : le registre npm
// n'est pas accessible dans cet environnement (même contrainte que
// IntroAnimation.tsx et DemoInteractif.tsx), donc pas de librairie de
// graphe/physique/animation.
//
// Vue artisan : jamais de donnée nominative (voir app/api/retours/route.ts
// — la route ne renvoie que id/titre/description/résumé IA/comptages).
// Vue admin (estAdmin=true, calculé côté serveur dans
// app/carte-mentale/page.tsx via process.env.ADMIN_EMAIL) : charge EN PLUS
// app/api/admin/retours pour le détail nominatif, affiché uniquement dans
// le panneau de détail d'une bulle.
// ============================================================

type Probleme = {
  id: string;
  titre: string;
  description: string | null;
  resumeIa: string | null;
  nombreAvis: number;
  importanceMoyenne: number;
  monAvis: number | null;
};

type AvisNominatif = {
  id: string;
  artisanNom: string;
  organisationNom: string;
  type: string;
  importance: number;
  texteOriginal: string | null;
  texteNettoye: string | null;
  pieceJointeUrl: string | null;
  createdAt: string;
};

type ProblemeDetailleAdmin = {
  id: string;
  propositionsIa: string | null;
  evolution: { semaine: string; nombreAvis: number }[];
  avis: AvisNominatif[];
};

const LABELS_TYPE: Record<string, string> = {
  probleme: "Problème",
  idee: "Idée",
  amelioration: "Amélioration",
  bug: "Bug",
};

// Interpolation entre deux teintes de la palette Compyo (sable clair →
// terracotta profond) selon l'importance moyenne perçue — "change
// légèrement de couleur selon l'urgence", jamais une couleur hors palette.
function couleurUrgence(importance: number) {
  const t = Math.max(0, Math.min(1, importance / 10));
  const debut = { r: 232, g: 197, b: 182 }; // #E8C5B6
  const fin = { r: 154, g: 58, b: 30 }; // terracotta profond
  const r = Math.round(debut.r + (fin.r - debut.r) * t);
  const g = Math.round(debut.g + (fin.g - debut.g) * t);
  const b = Math.round(debut.b + (fin.b - debut.b) * t);
  return `rgb(${r} ${g} ${b})`;
}

function rayonBulle(nombreAvis: number) {
  return Math.min(30 + nombreAvis * 3.5, 78);
}

// Petit générateur déterministe (pas de vrai hasard) à partir de l'index :
// donne à chaque bulle une position/vitesse légèrement différente, mais
// STABLE d'un rendu à l'autre (pas de saut visuel au re-fetch).
function pseudoAlea(graine: number) {
  const x = Math.sin(graine * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function CarteMentale({ estAdmin }: { estAdmin: boolean }) {
  const [problemes, setProblemes] = useState<Probleme[] | null>(null);
  const [detailsAdmin, setDetailsAdmin] = useState<Map<string, ProblemeDetailleAdmin> | null>(null);
  const [connecte, setConnecte] = useState(false);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [survolId, setSurvolId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const champRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setConnecte(Boolean(data.user)));

    fetch("/api/retours")
      .then((r) => r.json())
      .then((d) => setProblemes(d.problemes ?? []))
      .catch(() => setErreur("Impossible de charger la carte mentale."));

    if (estAdmin) {
      fetch("/api/admin/retours")
        .then((r) => r.json())
        .then((d) => {
          const map = new Map<string, ProblemeDetailleAdmin>();
          for (const p of d.problemes ?? []) {
            map.set(p.id, {
              id: p.id,
              propositionsIa: p.propositionsIa,
              evolution: p.evolution,
              avis: p.avis,
            });
          }
          setDetailsAdmin(map);
        })
        .catch(() => {});
    }
  }, [estAdmin]);

  // Parallax : posé directement en CSS custom properties sur le conteneur
  // (hérité par toutes les bulles enfants, voir .cm-champ dans globals.css)
  // via une ref plutôt qu'un state React, pour ne jamais re-render à
  // chaque pixel de mousemove.
  useEffect(() => {
    const noeud = champRef.current;
    if (!noeud) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onMove(e: MouseEvent) {
      if (!noeud) return;
      const rect = noeud.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      noeud.style.setProperty("--parallax-x", `${(x * 14).toFixed(1)}px`);
      noeud.style.setProperty("--parallax-y", `${(y * 14).toFixed(1)}px`);
    }
    noeud.addEventListener("mousemove", onMove);
    return () => noeud.removeEventListener("mousemove", onMove);
  }, []);

  const dispositions = useMemo(() => {
    if (!problemes) return [];
    const total = problemes.length;
    return problemes.map((p, i) => {
      const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2;
      // Léger désalignement volontaire (effet de profondeur : certaines
      // bulles "plus proches", d'autres "plus loin") plutôt qu'un cercle
      // parfait — jamais un graphe mécanique.
      const rayonVariation = 30 + pseudoAlea(i + 1) * 12;
      const profondeur = 0.6 + pseudoAlea(i + 7) * 0.8;
      return {
        id: p.id,
        x: 50 + rayonVariation * Math.cos(angle),
        y: 50 + rayonVariation * Math.sin(angle) * 0.82,
        profondeur,
        delai: `${(pseudoAlea(i + 2) * 3).toFixed(2)}s`,
        duree: `${(6 + pseudoAlea(i + 3) * 4).toFixed(2)}s`,
        dureeResp: `${(4 + pseudoAlea(i + 4) * 3).toFixed(2)}s`,
        flotteX: `${(pseudoAlea(i + 5) * 10 - 5).toFixed(1)}px`,
        flotteY: `${(pseudoAlea(i + 6) * 12 - 6).toFixed(1)}px`,
      };
    });
  }, [problemes]);

  const particules = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: pseudoAlea(i + 100) * 100,
        y: pseudoAlea(i + 200) * 100,
        delai: `${(pseudoAlea(i + 300) * 8).toFixed(2)}s`,
        duree: `${(10 + pseudoAlea(i + 400) * 8).toFixed(2)}s`,
        flotteY: `${(-30 - pseudoAlea(i + 500) * 40).toFixed(0)}px`,
      })),
    []
  );

  const problemeSelectionne = problemes?.find((p) => p.id === selectionId) ?? null;

  async function recharger() {
    const res = await fetch("/api/retours");
    const data = await res.json();
    setProblemes(data.problemes ?? []);
  }

  return (
    <div className="relative">
      <div
        ref={champRef}
        className="cm-champ relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-3xl overflow-hidden bg-[radial-gradient(ellipse_at_center,_#241a15_0%,_#140f0c_70%)] border border-white/5"
      >
        {/* Particules discrètes — décoratives uniquement. */}
        {particules.map((p, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="cm-particule absolute w-[3px] h-[3px] rounded-full bg-white/40"
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                "--delai": p.delai,
                "--duree": p.duree,
                "--flotte-y": p.flotteY,
              } as React.CSSProperties
            }
          />
        ))}

        {erreur && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/50 px-6 text-center">
            {erreur}
          </p>
        )}

        {problemes !== null && problemes.length === 0 && !erreur && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/50 px-6 text-center">
            Aucun retour pour l&apos;instant — soyez le premier à en laisser un depuis l&apos;app.
          </p>
        )}

        {/* Lignes de liaison — SVG en overlay, sous les bulles. */}
        {problemes !== null && problemes.length > 0 && (
          <svg viewBox="0 0 100 82" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {dispositions.map((d, i) => {
              const estLiee = survolId === null || survolId === d.id;
              return (
                <line
                  key={d.id}
                  className="cm-ligne"
                  style={{ "--delai": `${i * 0.15}s` } as React.CSSProperties}
                  x1={50}
                  y1={41}
                  x2={d.x}
                  y2={d.y * 0.82}
                  stroke={survolId === d.id ? "#E8A487" : "rgba(255,255,255,0.5)"}
                  strokeWidth={survolId === d.id ? 0.35 : 0.15}
                  opacity={estLiee ? undefined : 0.05}
                />
              );
            })}
          </svg>
        )}

        {/* Cœur : COMPYO. */}
        <div
          className="absolute grid place-items-center rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm"
          style={{ left: "50%", top: "50%", width: 84, height: 84, transform: "translate(-50%,-50%)" }}
        >
          <span className="font-display text-[13px] font-semibold tracking-[0.15em] text-white/90">
            COMPYO
          </span>
        </div>

        {/* Bulles. */}
        {problemes !== null &&
          dispositions.map((d) => {
            const p = problemes.find((pp) => pp.id === d.id)!;
            const rayon = rayonBulle(p.nombreAvis);
            const estSurvolee = survolId === d.id;
            const estAttenuee = survolId !== null && !estSurvolee;

            return (
              <div
                key={d.id}
                className="absolute"
                style={{
                  left: `${d.x}%`,
                  top: `${d.y * 0.82}%`,
                  transform: `translate(calc(-50% + var(--parallax-x) * ${d.profondeur}), calc(-50% + var(--parallax-y) * ${d.profondeur}))`,
                }}
              >
                <div
                  className="cm-bulle-flotte"
                  style={{ "--delai": d.delai, "--duree": d.duree } as React.CSSProperties}
                >
                  <button
                    type="button"
                    onClick={() => setSelectionId(d.id)}
                    onMouseEnter={() => setSurvolId(d.id)}
                    onMouseLeave={() => setSurvolId(null)}
                    onFocus={() => setSurvolId(d.id)}
                    onBlur={() => setSurvolId(null)}
                    aria-label={`${p.titre} — ${p.nombreAvis} retours, importance ${p.importanceMoyenne} sur 10`}
                    className="cm-bulle-respire block rounded-full transition-[width,height,box-shadow] duration-300 ease-out"
                    style={
                      {
                        "--delai": d.delai,
                        "--duree-resp": d.dureeResp,
                        width: estSurvolee ? rayon * 2 + 10 : rayon * 2,
                        height: estSurvolee ? rayon * 2 + 10 : rayon * 2,
                        background: couleurUrgence(p.importanceMoyenne),
                        opacity: estAttenuee ? 0.25 : 1,
                        boxShadow: estSurvolee
                          ? `0 0 0 1px rgba(255,255,255,0.25), 0 8px 30px -4px ${couleurUrgence(p.importanceMoyenne)}`
                          : "0 2px 12px -2px rgba(0,0,0,0.4)",
                      } as React.CSSProperties
                    }
                  />
                </div>

                {estSurvolee && (
                  <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-10 w-max max-w-[220px] rounded-xl bg-anthracite/95 border border-white/10 px-3 py-2 text-center pointer-events-none">
                    <p className="text-xs font-semibold text-white">{p.titre}</p>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      {p.nombreAvis} retour{p.nombreAvis > 1 ? "s" : ""} · {p.importanceMoyenne}/10
                    </p>
                  </div>
                )}
              </div>
            );
          })}

        {problemes === null && !erreur && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/40">Chargement…</p>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-white/40 sm:text-white/0 sm:hidden">
        Taille = nombre de retours · Couleur = importance moyenne
      </p>

      {problemeSelectionne && (
        <PanneauDetail
          probleme={problemeSelectionne}
          detailAdmin={estAdmin ? (detailsAdmin?.get(problemeSelectionne.id) ?? null) : null}
          estAdmin={estAdmin}
          connecte={connecte}
          onFermer={() => setSelectionId(null)}
          onVoteEnvoye={recharger}
        />
      )}
    </div>
  );
}

function PanneauDetail({
  probleme,
  detailAdmin,
  estAdmin,
  connecte,
  onFermer,
  onVoteEnvoye,
}: {
  probleme: Probleme;
  detailAdmin: ProblemeDetailleAdmin | null;
  estAdmin: boolean;
  connecte: boolean;
  onFermer: () => void;
  onVoteEnvoye: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cm-panneau-entree w-full sm:max-w-lg bg-[#1a1310] text-white rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/40 mb-1">
              {probleme.nombreAvis} retour{probleme.nombreAvis > 1 ? "s" : ""} · importance{" "}
              {probleme.importanceMoyenne}/10
            </p>
            <h3 className="font-display text-lg font-semibold">{probleme.titre}</h3>
          </div>
          <button onClick={onFermer} aria-label="Fermer" className="shrink-0 text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {probleme.resumeIa && <p className="mt-3 text-sm text-white/70 leading-relaxed">{probleme.resumeIa}</p>}

        <div className="mt-5">
          <VoteRapide probleteId={probleme.id} monAvis={probleme.monAvis} connecte={connecte} onEnvoye={onVoteEnvoye} />
        </div>

        {estAdmin && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/40 mb-3">
              Vue admin — détail nominatif
            </p>

            <PropositionsIA problemeId={probleme.id} propositionsInitiales={detailAdmin?.propositionsIa ?? null} />

            {detailAdmin && detailAdmin.evolution.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-white/60 mb-2">Évolution</p>
                <div className="flex items-end gap-1 h-12">
                  {detailAdmin.evolution.map((pt) => (
                    <div
                      key={pt.semaine}
                      title={`${pt.semaine} : ${pt.nombreAvis}`}
                      className="flex-1 bg-signal/60 rounded-t"
                      style={{ height: `${Math.max(10, (pt.nombreAvis / Math.max(...detailAdmin.evolution.map((e) => e.nombreAvis))) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {(detailAdmin?.avis ?? []).map((a) => (
                <div key={a.id} className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">
                      {a.artisanNom} <span className="text-white/40 font-normal">· {a.organisationNom}</span>
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-white/40">
                      {LABELS_TYPE[a.type] ?? a.type} · {a.importance}/10
                    </span>
                  </div>
                  {a.texteNettoye && <p className="mt-1.5 text-white/70">{a.texteNettoye}</p>}
                  {a.pieceJointeUrl && (
                    <a href={a.pieceJointeUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-signal underline">
                      Voir la pièce jointe
                    </a>
                  )}
                  <p className="mt-1.5 font-mono text-[10px] text-white/30">
                    {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
              {!detailAdmin && <p className="text-xs text-white/40">Chargement du détail…</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PropositionsIA({
  problemeId,
  propositionsInitiales,
}: {
  problemeId: string;
  propositionsInitiales: string | null;
}) {
  const [propositions, setPropositions] = useState(propositionsInitiales);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function generer() {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/admin/retours/propositions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probleme_id: problemeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error || "Échec de la génération.");
        setChargement(false);
        return;
      }
      setPropositions(data.propositions_ia);
      setChargement(false);
    } catch {
      setErreur("Échec de la génération.");
      setChargement(false);
    }
  }

  return (
    <div>
      {propositions ? (
        <div className="rounded-xl bg-signal/10 border border-signal/20 p-3 text-sm text-white/80 whitespace-pre-line">
          {propositions}
        </div>
      ) : (
        <p className="text-xs text-white/40">Pas encore de propositions générées pour ce thème.</p>
      )}
      {erreur && <p className="mt-2 text-xs text-red-300">{erreur}</p>}
      <button
        onClick={generer}
        disabled={chargement}
        className="mt-2 text-xs text-signal underline disabled:opacity-50"
      >
        {chargement ? "Génération…" : propositions ? "Régénérer les propositions IA" : "Générer des propositions IA"}
      </button>
    </div>
  );
}

function VoteRapide({
  probleteId,
  monAvis,
  connecte,
  onEnvoye,
}: {
  probleteId: string;
  monAvis: number | null;
  connecte: boolean;
  onEnvoye: () => void;
}) {
  const [importance, setImportance] = useState(monAvis ?? 5);
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!connecte) {
    return (
      <p className="text-sm text-white/50">
        <a href="/login" className="text-signal underline">
          Connectez-vous
        </a>{" "}
        pour dire si vous rencontrez aussi cette difficulté.
      </p>
    );
  }

  if (monAvis !== null || fait) {
    return <p className="text-sm text-white/60">Vous avez déjà signalé ce sujet (importance {fait ? importance : monAvis}/10). Merci.</p>;
  }

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
      setFait(true);
      onEnvoye();
    } catch {
      setErreur("Impossible d'enregistrer votre avis.");
      setEnvoi(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-2">
        Vous aussi ? À quel point ça compte pour vous ({importance}/10)
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
      {erreur && <p className="mt-2 text-xs text-red-300">{erreur}</p>}
      <Button onClick={envoyer} disabled={envoi} className="mt-3 !px-4 !py-2 text-xs">
        {envoi ? "Enregistrement…" : "Moi aussi"}
      </Button>
    </div>
  );
}
