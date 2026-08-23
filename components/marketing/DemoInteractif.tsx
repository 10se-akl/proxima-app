"use client";

import { useState } from "react";
import { useParallaxSouris } from "@/components/useParallaxSouris";

// ============================================================
// Le mockup interactif de l'accueil — la pièce centrale demandée par
// Axel : "je veux qu'on comprenne le produit sans lire une seule ligne
// de texte". Un vrai cadre d'application avec 4 onglets cliquables
// (Planning, Projet, Devis, Notes vocales) : cliquer change le contenu
// du cadre avec une animation, sans jamais changer de page ni recharger
// quoi que ce soit — tout est en mémoire (useState), 100% CSS/React,
// aucune dépendance ajoutée (même contrainte que partout ailleurs sur ce
// site : rien qui ne puisse être vérifié avant d'être livré).
//
// Le contenu de chaque onglet reprend fidèlement les mockups déjà
// existants (DemoPlanning, DemoDevis, DemoNotesVocales...) en version
// condensée pour tenir dans un seul cadre, plutôt que d'inventer une
// nouvelle maquette qui ne correspondrait plus à ce que montre
// /fonctionnalites — cohérence visuelle et factuelle entre les deux.
// ============================================================

type IdOnglet = "planning" | "projet" | "devis" | "notes";

const ONGLETS: { id: IdOnglet; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "projet", label: "Projet" },
  { id: "devis", label: "Devis" },
  { id: "notes", label: "Notes vocales" },
];

export function DemoInteractif() {
  const [actif, setActif] = useState<IdOnglet>("planning");
  const ref = useParallaxSouris<HTMLDivElement>(4, "section");

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-3xl transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
    >
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-ink/5"
      />
      <div className="relative rounded-2xl border border-ink/10 bg-surface shadow-xl shadow-ink/[0.08] overflow-hidden">
        {/* Barre façon fenêtre d'application — même langage visuel que
            MockupProduit et les autres mockups du site. */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink/10 bg-paper/60">
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
          <span className="ml-3 font-mono text-[11px] text-ink/50">Compyo</span>
        </div>

        {/* Barre d'onglets — le cœur de l'interactivité. Chaque bouton
            change juste l'état local `actif`, rien de plus. */}
        <div className="flex items-center gap-1 px-3 pt-3 border-b border-ink/10 bg-paper/30 overflow-x-auto">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.id}
              type="button"
              onClick={() => setActif(onglet.id)}
              className={`relative shrink-0 px-4 py-2.5 text-[13px] font-medium rounded-t-lg transition-colors duration-200 whitespace-nowrap ${
                actif === onglet.id ? "text-ink" : "text-ink/45 hover:text-ink/70"
              }`}
            >
              {onglet.label}
              {/* Soulignement animé : translateX/scale plutôt qu'un
                  changement brutal de bordure, pour un vrai effet de
                  "glissement" d'un onglet à l'autre. */}
              <span
                className={`absolute left-3 right-3 -bottom-px h-[2px] rounded-full bg-signal transition-opacity duration-200 ${
                  actif === onglet.id ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet actif — key={actif} force React à démonter
            puis remonter ce noeud à chaque changement d'onglet, ce qui
            relance systématiquement l'animation CSS .anim-contenu-demo
            (définie dans globals.css) même en cliquant deux fois de
            suite sur des onglets différents. Hauteur minimale fixe pour
            qu'aucun contenu ne fasse "sauter" le cadre en changeant. */}
        <div className="p-6 sm:p-7 min-h-[340px] sm:min-h-[380px]">
          <div key={actif} className="anim-contenu-demo">
            {actif === "planning" && <ContenuPlanning />}
            {actif === "projet" && <ContenuProjet />}
            {actif === "devis" && <ContenuDevis />}
            {actif === "notes" && <ContenuNotes />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContenuPlanning() {
  const creneaux = [
    { h: "9h00", c: "bg-signal", t: "RDV — Sophie Martin, salle de bain" },
    { h: "11h00", c: "bg-[#D9861A]", t: "Tâche — Envoyer devis Durand" },
    { h: "14h30", c: "bg-[#2F8F5B]", t: "RDV — Nicolas Girard, chaudière" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
          Aujourd&apos;hui — mardi
        </p>
        <span className="font-mono text-[10px] text-ink/30">4 créneaux</span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {creneaux.map((c) => (
          <div
            key={c.h}
            className="flex items-center gap-4 rounded-xl border border-ink/10 px-4 py-3 text-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <span className="font-mono text-[11px] text-steel w-11 shrink-0">{c.h}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${c.c}`} />
            <span className="flex-1">{c.t}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-signal/25 bg-signal/[0.06] p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-signal mb-1.5">
          Conflit détecté
        </p>
        <p className="text-xs text-ink/70 leading-relaxed">
          Nouveau RDV 14h45 impossible — chevauche Nicolas Girard.
        </p>
      </div>
    </div>
  );
}

function ContenuProjet() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Sophie Martin
          </p>
          <p className="text-sm font-semibold mt-0.5">Salle de bain — douche italienne</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-signal rounded-full border border-signal/30 px-2.5 py-1">
          En cours
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">Avancement</p>
          <p className="font-mono text-[10px] text-ink/40">3 / 5 étapes</p>
        </div>
        <div className="h-1.5 rounded-full bg-paper overflow-hidden">
          <div className="h-full w-3/5 rounded-full bg-signal transition-all duration-500" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {["IMG_0142", "IMG_0143", "IMG_0144"].map((nom) => (
          <div
            key={nom}
            className="aspect-square rounded-lg bg-paper border border-ink/10 grid place-items-center transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className="font-mono text-[9px] text-ink/30">{nom}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-paper p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-steel mb-2">
          Résumé de l&apos;IA
        </p>
        <p className="text-xs text-ink/70 leading-relaxed">
          Douche italienne, 4m². Accès facile. Mesures prises, il manque encore le choix de la
          robinetterie avant de finaliser le devis.
        </p>
      </div>
    </div>
  );
}

function ContenuDevis() {
  const lignes = [
    { d: "Dépose ancienne baignoire", p: "180 €" },
    { d: "Fourniture et pose receveur extra-plat", p: "620 €" },
    { d: "Étanchéité + faïence murale", p: "540 €" },
    { d: "Robinetterie thermostatique", p: "310 €" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-ink/50">Devis n°2026-0142</p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-signal">
          Brouillon
        </span>
      </div>
      <div className="mt-4 flex flex-col divide-y divide-ink/10">
        {lignes.map((ligne) => (
          <div
            key={ligne.d}
            className="flex items-center justify-between py-2.5 text-sm transition-colors duration-200 hover:bg-paper/60 rounded-md px-1.5 -mx-1.5"
          >
            <span className="text-ink/80">{ligne.d}</span>
            <span className="font-mono text-xs text-ink/60 shrink-0 ml-4">{ligne.p}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-paper p-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Total TTC — TVA 10%
          </p>
          <p className="text-[11px] text-ink/40 mt-0.5">Calculé selon vos paramètres</p>
        </div>
        <span className="font-display text-xl font-semibold text-ink">1 815 €</span>
      </div>
    </div>
  );
}

function ContenuNotes() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="relative shrink-0 grid place-items-center w-10 h-10 rounded-full bg-signal/10 text-signal">
          <span aria-hidden className="absolute inset-0 rounded-full bg-signal/20 animate-ping" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
            <path
              d="M5 11a7 7 0 0 0 14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-steel">
            Transcription en cours
          </p>
          <p className="font-mono text-[10px] text-ink/30">00:14</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-paper p-4">
        <p className="text-sm text-ink/70 leading-relaxed">
          &laquo; Douche italienne, 4m², accès facile. Il manque le choix de la robinetterie. &raquo;
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-start gap-2.5 rounded-xl border border-ink/10 px-4 py-3 text-sm transition-transform duration-200 hover:-translate-y-0.5">
          <span className="shrink-0">⚠️</span>
          <span className="text-ink/70">
            <strong className="text-ink">Dupont</strong> — dossier urgent, pas de RDV prévu.
          </span>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-ink/10 px-4 py-3 text-sm opacity-70">
          <span className="shrink-0">💬</span>
          <span className="text-ink/70">
            <strong className="text-ink">Sophie Martin</strong> attend une réponse.
          </span>
        </div>
      </div>
    </div>
  );
}
