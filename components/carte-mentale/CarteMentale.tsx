"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/retours/taxonomie";

// ============================================================
// "Le cerveau de Compyo" — refonte complète (voir supabase/schema.sql
// Module 20/21 et lib/retours/taxonomie.ts). Demande explicite d'Axel après
// une première version en bulles/lignes SVG statiques jugée trop proche
// d'un "exercice de SVG" : un rendu vivant, une planète par CATÉGORIE
// entière (pas par sous-thème isolé), des connexions qui ondulent avec de
// petites particules lumineuses qui y circulent, un cœur qui respire, et
// une dérive indépendante très légère (jamais liée à la souris).
//
// Choix technique : Canvas 2D (pas WebGL). Avec 7 à 11 planètes, quelques
// dizaines de particules ambiantes et de particules de flux, un contexte
// 2D suffit largement à tenir 60fps — WebGL n'apporterait que de la
// complexité (shaders à la main, aucune librairie npm disponible dans cet
// environnement) sans bénéfice mesurable à cette échelle. Le rendu vivant
// est entièrement porté par UNE boucle requestAnimationFrame sur UN seul
// <canvas> ; le reste du DOM se limite à quelques boutons invisibles
// (accessibilité + clic, positionnés sur la position DE BASE de chaque
// planète — la dérive "quelques pixels" est trop faible pour justifier un
// suivi de position en direct) et au panneau de détail. Jamais des
// centaines de composants React.
//
// Vue artisan : jamais de donnée nominative (voir app/api/retours/route.ts).
// Vue admin (estAdmin=true, calculé côté serveur dans
// app/carte-mentale/page.tsx) : charge en plus app/api/admin/retours pour
// le détail nominatif, affiché uniquement dans le panneau.
// ============================================================

type Probleme = {
  id: string;
  titre: string;
  description: string | null;
  resumeIa: string | null;
  categorie: string | null;
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

// Une planète = une catégorie entière (Planning, Devis...), agrégeant tous
// ses sous-thèmes. "Je préfère 7 catégories parfaitement animées que 50
// bulles statiques" — seules les catégories avec au moins un retour
// deviennent une planète, jamais un point vide juste pour occuper l'espace.
type Planete = {
  slug: string;
  label: string;
  icone: string;
  nombreAvis: number;
  importanceMoyenne: number;
  monAvis: number | null;
  themes: Probleme[];
};

const LABELS_TYPE: Record<string, string> = {
  probleme: "Problème",
  idee: "Idée",
  amelioration: "Amélioration",
  bug: "Bug",
};

const CATEGORIE_AUTRE = { slug: "autre", label: "Autre", icone: "📦" };

function infosCategorie(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIE_AUTRE;
}

// Petit générateur déterministe (pas de vrai hasard) à partir d'une graine :
// donne à chaque planète une phase/vitesse légèrement différente, mais
// STABLE d'un rendu à l'autre (pas de saut visuel au re-fetch).
function pseudoAlea(graine: number) {
  const x = Math.sin(graine * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Retour d'Axel (v1) : une seule planète à 1 avis faisait déjà 60px de
// diamètre. Courbe de saturation : petite au premier avis, grossit
// nettement autour de 5, continue plus doucement au-delà.
function rayonPlanete(nombreAvis: number) {
  return Math.min(16 + 50 * (1 - Math.exp(-nombreAvis / 6)), 68);
}

// Teinte de la planète : sable clair → terracotta profond selon
// l'importance moyenne perçue, jamais une couleur hors palette (orange
// Compyo = seul accent, comme demandé).
function teinteUrgence(importance: number) {
  const t = Math.max(0, Math.min(1, importance / 10));
  const debut = { r: 214, g: 178, b: 158 };
  const fin = { r: 201, g: 107, b: 74 }; // --c-signal
  return {
    r: Math.round(debut.r + (fin.r - debut.r) * t),
    g: Math.round(debut.g + (fin.g - debut.g) * t),
    b: Math.round(debut.b + (fin.b - debut.b) * t),
  };
}

type EtatPlanete = {
  slug: string;
  xPct: number;
  yPct: number;
  rayon: number;
  phaseDerive: number;
  vitesseDerive: number;
  phaseRespire: number;
  vitesseRespire: number;
  couleur: { r: number; g: number; b: number };
  courbePhase: number;
  particules: number[]; // progression (0-1) de chaque particule de flux sur la connexion
};

export function CarteMentale({ estAdmin }: { estAdmin: boolean }) {
  const [problemes, setProblemes] = useState<Probleme[] | null>(null);
  const [detailsAdmin, setDetailsAdmin] = useState<Map<string, ProblemeDetailleAdmin> | null>(null);
  const [connecte, setConnecte] = useState(false);
  const [selectionSlug, setSelectionSlug] = useState<string | null>(null);
  const [survolSlug, setSurvolSlug] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const champRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const survolRef = useRef<string | null>(null);
  const selectionRef = useRef<string | null>(null);
  const etatsRef = useRef<Map<string, EtatPlanete>>(new Map());
  const nombreAvisPrecedent = useRef<Map<string, number>>(new Map());

  survolRef.current = survolSlug;
  selectionRef.current = selectionSlug;

  async function charger() {
    try {
      const res = await fetch("/api/retours");
      const data = await res.json();
      setProblemes(data.problemes ?? []);
    } catch {
      setErreur("Impossible de charger la carte mentale.");
    }
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setConnecte(Boolean(data.user)));

    charger();

    if (estAdmin) {
      fetch("/api/admin/retours")
        .then((r) => r.json())
        .then((d) => {
          const map = new Map<string, ProblemeDetailleAdmin>();
          for (const p of d.problemes ?? []) {
            map.set(p.id, { id: p.id, propositionsIa: p.propositionsIa, evolution: p.evolution, avis: p.avis });
          }
          setDetailsAdmin(map);
        })
        .catch(() => {});
    }

    // La carte se veut "vivante" : un léger rafraîchissement périodique
    // (pas de websocket, pas d'infra supplémentaire) plutôt qu'une page
    // figée tant qu'on ne la recharge pas soi-même — voir plus bas
    // (comparaison avec nombreAvisPrecedent) pour le petit "sursaut" de
    // particules quand une donnée vient d'arriver.
    const intervalle = setInterval(charger, 25000);
    return () => clearInterval(intervalle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAdmin]);

  // Regroupement par catégorie — le cœur de la refonte : une planète par
  // catégorie entière, triée dans l'ordre de la taxonomie pour une carte
  // stable d'un chargement à l'autre, et jamais de planète vide.
  const planetes = useMemo<Planete[]>(() => {
    if (!problemes) return [];
    const parCategorie = new Map<string, Probleme[]>();
    for (const p of problemes) {
      const slug = p.categorie ?? "autre";
      if (!parCategorie.has(slug)) parCategorie.set(slug, []);
      parCategorie.get(slug)!.push(p);
    }

    const ordre = [...CATEGORIES.map((c) => c.slug), "autre"];
    const slugsTries = [...parCategorie.keys()].sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b));

    return slugsTries.map((slug) => {
      const themes = (parCategorie.get(slug) ?? []).sort(
        (a, b) => b.nombreAvis * b.importanceMoyenne - a.nombreAvis * a.importanceMoyenne
      );
      const nombreAvis = themes.reduce((s, t) => s + t.nombreAvis, 0);
      const importanceMoyenne =
        nombreAvis > 0
          ? Math.round((themes.reduce((s, t) => s + t.importanceMoyenne * t.nombreAvis, 0) / nombreAvis) * 10) / 10
          : 0;
      const infos = infosCategorie(slug);
      const monAvis = themes.find((t) => t.monAvis !== null)?.monAvis ?? null;

      return { slug, label: infos.label, icone: infos.icone, nombreAvis, importanceMoyenne, monAvis, themes };
    });
  }, [problemes]);

  // Position de BASE de chaque planète (déterministe, pas de dérive) —
  // calculée directement au rendu React, indépendamment de etatsRef.
  // Nécessaire pour les boutons DOM (accessibilité/clic) et l'infobulle :
  // etatsRef n'est peuplée que dans un effect qui s'exécute APRÈS le rendu
  // (et sa mutation ne déclenche pas de re-render), donc s'appuyer dessus
  // pour positionner du JSX affichait les boutons figés au centre jusqu'au
  // premier survol. Le canvas, lui, continue de lire etatsRef à chaque
  // frame (avec la dérive) via la boucle d'animation.
  const dispositionsBase = useMemo(() => {
    const total = planetes.length;
    return new Map(
      planetes.map((p, i) => {
        const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2;
        const rayonCercle = 30 + pseudoAlea(i + 1) * 12;
        return [
          p.slug,
          { xPct: 50 + rayonCercle * Math.cos(angle), yPct: 42 + rayonCercle * Math.sin(angle) * 0.78 },
        ] as const;
      })
    );
  }, [planetes]);

  // Dispositions déterministes (angle, rayon du cercle, phases d'animation)
  // — recalculées seulement quand la LISTE des planètes change (pas à
  // chaque frame), stockées ensuite dans etatsRef pour que la boucle
  // d'animation les lise sans re-render React.
  useEffect(() => {
    const total = planetes.length;
    const nouveauxEtats = new Map<string, EtatPlanete>();

    planetes.forEach((p, i) => {
      const existant = etatsRef.current.get(p.slug);
      const angle = (2 * Math.PI * i) / Math.max(total, 1) - Math.PI / 2;
      const rayonCercle = 30 + pseudoAlea(i + 1) * 12;

      nouveauxEtats.set(p.slug, {
        slug: p.slug,
        xPct: 50 + rayonCercle * Math.cos(angle),
        // Centré sur (50%, 42%) — même point que le cœur COMPYO dessiné sur
        // le canvas (centreY = hauteur * 0.42) et le libellé HTML superposé
        // juste en dessous, pour que les planètes orbitent vraiment autour
        // du cœur plutôt qu'autour du centre géométrique du cadre.
        yPct: 42 + rayonCercle * Math.sin(angle) * 0.78,
        rayon: existant?.rayon ?? rayonPlanete(p.nombreAvis),
        phaseDerive: existant?.phaseDerive ?? pseudoAlea(i + 11) * Math.PI * 2,
        vitesseDerive: existant?.vitesseDerive ?? 0.15 + pseudoAlea(i + 12) * 0.15,
        phaseRespire: existant?.phaseRespire ?? pseudoAlea(i + 13) * Math.PI * 2,
        vitesseRespire: existant?.vitesseRespire ?? 0.3 + pseudoAlea(i + 14) * 0.25,
        couleur: teinteUrgence(p.importanceMoyenne),
        courbePhase: existant?.courbePhase ?? pseudoAlea(i + 15) * Math.PI * 2,
        particules: existant?.particules ?? [pseudoAlea(i + 16), pseudoAlea(i + 17)],
      });

      // "Une nouvelle donnée arrive → une particule traverse immédiatement
      // le réseau" : si le comptage vient d'augmenter depuis le dernier
      // chargement, on réinjecte une particule au tout début du trajet.
      const precedent = nombreAvisPrecedent.current.get(p.slug);
      if (precedent !== undefined && p.nombreAvis > precedent) {
        nouveauxEtats.get(p.slug)!.particules.push(0);
      }
      nombreAvisPrecedent.current.set(p.slug, p.nombreAvis);
    });

    etatsRef.current = nouveauxEtats;
  }, [planetes]);

  // La boucle d'animation elle-même : montée une seule fois, lit toujours
  // la version la plus récente de `planetes` et des refs via closures sur
  // des refs (jamais de dépendance qui la relancerait à chaque re-render).
  useEffect(() => {
    const canvas = canvasRef.current;
    const conteneur = champRef.current;
    if (!canvas || !conteneur) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduitMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let largeur = 0;
    let hauteur = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function redimensionner() {
      if (!conteneur || !canvas) return;
      const rect = conteneur.getBoundingClientRect();
      largeur = rect.width;
      hauteur = rect.height;
      canvas.width = largeur * dpr;
      canvas.height = hauteur * dpr;
      canvas.style.width = `${largeur}px`;
      canvas.style.height = `${hauteur}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    redimensionner();
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(conteneur);

    // Particules ambiantes de fond — discrètes, dérivent lentement, se
    // recyclent en boucle (jamais de tableau qui grossit).
    const particulesAmbiantes = Array.from({ length: 22 }, (_, i) => ({
      x: pseudoAlea(i + 500) * 100,
      y: pseudoAlea(i + 600) * 100,
      vx: (pseudoAlea(i + 700) - 0.5) * 0.6,
      vy: (pseudoAlea(i + 800) - 0.5) * 0.4,
      taille: 0.6 + pseudoAlea(i + 900) * 1.2,
      alphaBase: 0.08 + pseudoAlea(i + 950) * 0.14,
    }));

    let idAnimation = 0;
    let dernierTemps = performance.now();

    function image(tempsMs: number) {
      const dt = Math.min((tempsMs - dernierTemps) / 1000, 0.05);
      dernierTemps = tempsMs;
      const t = tempsMs / 1000;

      if (!ctx || largeur === 0 || hauteur === 0) {
        idAnimation = requestAnimationFrame(image);
        return;
      }

      ctx.clearRect(0, 0, largeur, hauteur);

      const centreX = largeur / 2;
      const centreY = hauteur * 0.42;

      // --- Particules ambiantes (brouillard discret) ---
      for (const part of particulesAmbiantes) {
        if (!reduitMouvement) {
          part.x += part.vx * dt;
          part.y += part.vy * dt;
          if (part.x < -2) part.x = 102;
          if (part.x > 102) part.x = -2;
          if (part.y < -2) part.y = 102;
          if (part.y > 102) part.y = -2;
        }
        const x = (part.x / 100) * largeur;
        const y = (part.y / 100) * hauteur;
        ctx.beginPath();
        ctx.arc(x, y, part.taille, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 235, 220, ${part.alphaBase})`;
        ctx.fill();
      }

      const etats = etatsRef.current;
      const survol = survolRef.current;
      const selection = selectionRef.current;
      const accent = survol ?? selection;

      // --- Connexions (sous les planètes) + particules de flux ---
      etats.forEach((etat) => {
        const estAccentuee = accent === null || accent === etat.slug;
        const deriveX = reduitMouvement ? 0 : Math.cos(t * etat.vitesseDerive + etat.phaseDerive) * 5;
        const deriveY = reduitMouvement ? 0 : Math.sin(t * etat.vitesseDerive * 0.8 + etat.phaseDerive) * 4;
        const px = (etat.xPct / 100) * largeur + deriveX;
        const py = (etat.yPct / 100) * hauteur + deriveY;

        const milieuX = (centreX + px) / 2;
        const milieuY = (centreY + py) / 2;
        const segX = px - centreX;
        const segY = py - centreY;
        const longueur = Math.max(Math.hypot(segX, segY), 0.001);
        const perpX = -segY / longueur;
        const perpY = segX / longueur;
        // "Ondule légèrement, comme si elle respirait" : le point de
        // contrôle de la courbe oscille doucement dans le temps.
        const ondulation = reduitMouvement ? 8 : 8 + Math.sin(t * 0.6 + etat.courbePhase) * 5;
        const ctrlX = milieuX + perpX * ondulation;
        const ctrlY = milieuY + perpY * ondulation;

        ctx.beginPath();
        ctx.moveTo(centreX, centreY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, px, py);
        const degrade = ctx.createLinearGradient(centreX, centreY, px, py);
        const alphaBase = estAccentuee ? (survol === etat.slug ? 0.55 : 0.16) : 0.04;
        degrade.addColorStop(0, `rgba(255, 255, 255, ${alphaBase * 0.4})`);
        degrade.addColorStop(1, `rgba(${etat.couleur.r}, ${etat.couleur.g}, ${etat.couleur.b}, ${alphaBase})`);
        ctx.strokeStyle = degrade;
        ctx.lineWidth = survol === etat.slug ? 1.6 : 0.9;
        ctx.stroke();

        // Particules de flux : petits points lumineux qui parcourent la
        // courbe lentement, boucle infinie — "on a l'impression que des
        // informations circulent dans un cerveau".
        if (!reduitMouvement) {
          for (let i = 0; i < etat.particules.length; i++) {
            etat.particules[i] += dt * 0.09;
            if (etat.particules[i] > 1) etat.particules[i] -= 1;
            const p = etat.particules[i];
            const inv = 1 - p;
            const bx = inv * inv * centreX + 2 * inv * p * ctrlX + p * p * px;
            const by = inv * inv * centreY + 2 * inv * p * ctrlY + p * p * py;
            const alphaParticule = (estAccentuee ? 0.85 : 0.2) * Math.sin(p * Math.PI);
            ctx.beginPath();
            ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232, 164, 135, ${Math.max(alphaParticule, 0)})`;
            ctx.shadowColor = "rgba(232, 164, 135, 0.9)";
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // --- Cœur COMPYO : lumière douce qui respire très lentement ---
      const respirationCoeur = reduitMouvement ? 1 : 1 + Math.sin(t * 0.35) * 0.06;
      const rayonGlow = 70 * respirationCoeur;
      const glow = ctx.createRadialGradient(centreX, centreY, 0, centreX, centreY, rayonGlow);
      glow.addColorStop(0, "rgba(232, 164, 135, 0.22)");
      glow.addColorStop(0.5, "rgba(201, 107, 74, 0.08)");
      glow.addColorStop(1, "rgba(201, 107, 74, 0)");
      ctx.beginPath();
      ctx.arc(centreX, centreY, rayonGlow, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      const rayonCoeur = 40 * respirationCoeur;
      const coeurDegrade = ctx.createRadialGradient(
        centreX - rayonCoeur * 0.3,
        centreY - rayonCoeur * 0.3,
        0,
        centreX,
        centreY,
        rayonCoeur
      );
      coeurDegrade.addColorStop(0, "rgba(255, 255, 255, 0.1)");
      coeurDegrade.addColorStop(1, "rgba(255, 255, 255, 0.03)");
      ctx.beginPath();
      ctx.arc(centreX, centreY, rayonCoeur, 0, Math.PI * 2);
      ctx.fillStyle = coeurDegrade;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // --- Planètes ---
      etats.forEach((etat) => {
        const estSurvolee = survol === etat.slug;
        const estAttenuee = accent !== null && accent !== etat.slug;
        const deriveX = reduitMouvement ? 0 : Math.cos(t * etat.vitesseDerive + etat.phaseDerive) * 5;
        const deriveY = reduitMouvement ? 0 : Math.sin(t * etat.vitesseDerive * 0.8 + etat.phaseDerive) * 4;
        const px = (etat.xPct / 100) * largeur + deriveX;
        const py = (etat.yPct / 100) * hauteur + deriveY;

        const respiration = reduitMouvement ? 1 : 1 + Math.sin(t * etat.vitesseRespire + etat.phaseRespire) * 0.035;
        // Léger grossissement (5%) au survol, jamais brutal (lerp doux via
        // une simple interpolation exponentielle indépendante du frame rate).
        const cibleHover = estSurvolee ? 1.05 : 1;
        const r = (etat.rayon || 20) * respiration * cibleHover;

        ctx.save();
        ctx.shadowColor = `rgba(${etat.couleur.r}, ${etat.couleur.g}, ${etat.couleur.b}, ${estSurvolee ? 0.55 : 0.28})`;
        ctx.shadowBlur = estSurvolee ? 26 : 14;

        const degradePlanete = ctx.createRadialGradient(
          px - r * 0.35,
          py - r * 0.35,
          r * 0.1,
          px,
          py,
          r
        );
        const { r: cr, g: cg, b: cb } = etat.couleur;
        degradePlanete.addColorStop(0, `rgba(${Math.min(cr + 45, 255)}, ${Math.min(cg + 40, 255)}, ${Math.min(cb + 35, 255)}, ${estAttenuee ? 0.35 : 1})`);
        degradePlanete.addColorStop(0.6, `rgba(${cr}, ${cg}, ${cb}, ${estAttenuee ? 0.3 : 0.92})`);
        degradePlanete.addColorStop(1, `rgba(${Math.max(cr - 40, 0)}, ${Math.max(cg - 30, 0)}, ${Math.max(cb - 20, 0)}, ${estAttenuee ? 0.28 : 0.88})`);

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = degradePlanete;
        ctx.fill();
        ctx.restore();
      });

      idAnimation = requestAnimationFrame(image);
    }

    idAnimation = requestAnimationFrame(image);

    return () => {
      cancelAnimationFrame(idAnimation);
      observateur.disconnect();
    };
    // Montée une seule fois : tout ce qui varie (planètes, survol,
    // sélection) est lu via refs à l'intérieur de la boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repositionne le rayon "cible" de chaque planète quand les données
  // changent (nouvelle donnée = bulle qui grossit), sans recréer tout
  // l'état d'animation (dérive/respiration continuent sans à-coup).
  useEffect(() => {
    for (const p of planetes) {
      const etat = etatsRef.current.get(p.slug);
      if (etat) {
        etat.rayon = rayonPlanete(p.nombreAvis);
        etat.couleur = teinteUrgence(p.importanceMoyenne);
      }
    }
  }, [planetes]);

  const planeteSelectionnee = planetes.find((p) => p.slug === selectionSlug) ?? null;
  const planeteSurvolee = planetes.find((p) => p.slug === survolSlug) ?? null;

  return (
    <div className="relative">
      <div
        ref={champRef}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-3xl overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,_#241a15_0%,_#100b09_75%)] border border-white/5"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

        <div className="absolute inset-0" style={{ top: "42%", left: "50%", transform: "translate(-50%, -50%)" }}>
          <span className="font-display text-[13px] font-semibold tracking-[0.15em] text-white/90 whitespace-nowrap">
            COMPYO
          </span>
        </div>

        {erreur && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/50 px-6 text-center">{erreur}</p>
        )}

        {problemes !== null && planetes.length === 0 && !erreur && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/50 px-6 text-center">
            Aucun retour pour l&apos;instant — soyez le premier à en laisser un depuis l&apos;app.
          </p>
        )}

        {problemes === null && !erreur && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/40">Chargement…</p>
        )}

        {/* Boutons invisibles superposés — accessibilité + clic, positionnés
            sur la position DE BASE de chaque planète (la dérive visuelle
            est trop légère pour justifier un suivi en direct). */}
        {planetes.map((p) => {
          const position = dispositionsBase.get(p.slug);
          const xPct = position?.xPct ?? 50;
          const yPct = position?.yPct ?? 50;
          const rayon = rayonPlanete(p.nombreAvis);
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSelectionSlug(p.slug)}
              onMouseEnter={() => setSurvolSlug(p.slug)}
              onMouseLeave={() => setSurvolSlug(null)}
              onFocus={() => setSurvolSlug(p.slug)}
              onBlur={() => setSurvolSlug(null)}
              aria-label={`${p.label} — ${p.nombreAvis} retours, importance ${p.importanceMoyenne} sur 10`}
              className="absolute rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: rayon * 2.4,
                height: rayon * 2.4,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}

        {planeteSurvolee && !selectionSlug && (
          <div
            className="absolute z-10 w-max max-w-[220px] rounded-xl bg-anthracite/95 border border-white/10 px-3 py-2 text-center pointer-events-none transition-opacity duration-200"
            style={{
              left: `${dispositionsBase.get(planeteSurvolee.slug)?.xPct ?? 50}%`,
              top: `${dispositionsBase.get(planeteSurvolee.slug)?.yPct ?? 50}%`,
              transform: `translate(-50%, calc(-100% - ${rayonPlanete(planeteSurvolee.nombreAvis) + 12}px))`,
            }}
          >
            <p className="text-xs font-semibold text-white">
              <span aria-hidden="true">{planeteSurvolee.icone}</span> {planeteSurvolee.label}
            </p>
            <p className="mt-0.5 text-[11px] text-white/50">
              {planeteSurvolee.nombreAvis} retour{planeteSurvolee.nombreAvis > 1 ? "s" : ""} ·{" "}
              {planeteSurvolee.importanceMoyenne}/10
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-white/40 sm:hidden">
        Taille = activité · Couleur = importance moyenne
      </p>

      {planeteSelectionnee && (
        <PanneauDetail
          planete={planeteSelectionnee}
          detailsAdmin={estAdmin ? detailsAdmin : null}
          estAdmin={estAdmin}
          connecte={connecte}
          onFermer={() => setSelectionSlug(null)}
          onVoteEnvoye={charger}
        />
      )}
    </div>
  );
}

function PanneauDetail({
  planete,
  detailsAdmin,
  estAdmin,
  connecte,
  onFermer,
  onVoteEnvoye,
}: {
  planete: Planete;
  detailsAdmin: Map<string, ProblemeDetailleAdmin> | null;
  estAdmin: boolean;
  connecte: boolean;
  onFermer: () => void;
  onVoteEnvoye: () => void;
}) {
  // Fusion des données admin (nominatif, évolution) de TOUS les sous-thèmes
  // de la catégorie — la planète représente la catégorie entière, le détail
  // doit donc l'être aussi.
  const avisFusionnes = useMemo(() => {
    if (!detailsAdmin) return [];
    const tout: AvisNominatif[] = [];
    for (const theme of planete.themes) {
      const d = detailsAdmin.get(theme.id);
      if (d) tout.push(...d.avis);
    }
    return tout.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [detailsAdmin, planete]);

  const evolutionFusionnee = useMemo(() => {
    if (!detailsAdmin) return [];
    const compteParSemaine = new Map<string, number>();
    for (const theme of planete.themes) {
      const d = detailsAdmin.get(theme.id);
      for (const pt of d?.evolution ?? []) {
        compteParSemaine.set(pt.semaine, (compteParSemaine.get(pt.semaine) ?? 0) + pt.nombreAvis);
      }
    }
    return Array.from(compteParSemaine.entries())
      .map(([semaine, nombreAvis]) => ({ semaine, nombreAvis }))
      .sort((a, b) => (a.semaine < b.semaine ? -1 : 1));
  }, [detailsAdmin, planete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-sm"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cm-panneau-glisse w-full sm:w-[440px] sm:h-full bg-[#160f0c] text-white sm:border-l border-white/10 shadow-2xl p-6 sm:p-7 max-h-[85vh] sm:max-h-none overflow-y-auto rounded-t-3xl sm:rounded-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/40 mb-1">
              {planete.nombreAvis} retour{planete.nombreAvis > 1 ? "s" : ""} · importance {planete.importanceMoyenne}
              /10
            </p>
            <h3 className="font-display text-xl font-semibold">
              <span aria-hidden="true">{planete.icone}</span> {planete.label}
            </h3>
          </div>
          <button onClick={onFermer} aria-label="Fermer" className="shrink-0 text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <p className="mt-3 text-sm text-white/60">
          {planete.nombreAvis <= 1
            ? "Vous êtes le premier à remonter ce sujet."
            : `${planete.nombreAvis} artisans ont également signalé un sujet dans cette catégorie.`}
        </p>

        {/* Sous-thèmes — le résumé de la catégorie, sans appel IA : juste
            les retours déjà agrégés côté serveur. */}
        <div className="mt-5 flex flex-col gap-2">
          {planete.themes.map((theme) => (
            <div key={theme.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white/90">{theme.titre.replace(`${planete.label} · `, "")}</p>
                <span className="shrink-0 font-mono text-[10px] text-white/40">
                  {theme.nombreAvis} · {theme.importanceMoyenne}/10
                </span>
              </div>
              {theme.resumeIa && <p className="mt-1.5 text-xs text-white/60 leading-relaxed">{theme.resumeIa}</p>}
              <div className="mt-2">
                <VoteRapide probleteId={theme.id} monAvis={theme.monAvis} connecte={connecte} onEnvoye={onVoteEnvoye} />
              </div>
            </div>
          ))}
        </div>

        {estAdmin && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/40 mb-3">
              Vue admin — détail nominatif
            </p>

            <PropositionsIA categorie={planete.slug} />

            {evolutionFusionnee.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-white/60 mb-2">Évolution</p>
                <div className="flex items-end gap-1 h-12">
                  {evolutionFusionnee.map((pt) => (
                    <div
                      key={pt.semaine}
                      title={`${pt.semaine} : ${pt.nombreAvis}`}
                      className="flex-1 bg-signal/60 rounded-t"
                      style={{
                        height: `${Math.max(10, (pt.nombreAvis / Math.max(...evolutionFusionnee.map((e) => e.nombreAvis))) * 100)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <TachesProduit categorie={planete.slug} />

            <div className="mt-4 flex flex-col gap-2">
              {avisFusionnes.map((a) => (
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
              {!detailsAdmin && <p className="text-xs text-white/40">Chargement du détail…</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PropositionsIA({ categorie }: { categorie: string }) {
  const [propositions, setPropositions] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function generer() {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/admin/retours/propositions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorie }),
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
        <p className="text-xs text-white/40">Pas encore de propositions générées pour cette catégorie.</p>
      )}
      {erreur && <p className="mt-2 text-xs text-signal">{erreur}</p>}
      <button onClick={generer} disabled={chargement} className="mt-2 text-xs text-signal underline disabled:opacity-50">
        {chargement ? "Génération…" : propositions ? "Régénérer les propositions IA" : "Générer des propositions IA"}
      </button>
    </div>
  );
}

type Tache = { id: string; categorie: string; titre: string; statut: "a_faire" | "en_cours" | "fait"; created_at: string };

const LABELS_STATUT: Record<Tache["statut"], string> = { a_faire: "À faire", en_cours: "En cours", fait: "Fait" };

function TachesProduit({ categorie }: { categorie: string }) {
  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [titre, setTitre] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/retours/ameliorations?categorie=${encodeURIComponent(categorie)}`)
      .then((r) => r.json())
      .then((d) => setTaches(d.taches ?? []))
      .catch(() => setTaches([]));
  }, [categorie]);

  async function ajouter() {
    if (!titre.trim() || envoi) return;
    setEnvoi(true);
    const res = await fetch("/api/admin/retours/ameliorations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, titre }),
    });
    const data = await res.json();
    setEnvoi(false);
    if (res.ok) {
      setTaches((t) => [data.tache, ...(t ?? [])]);
      setTitre("");
    }
  }

  async function basculerStatut(t: Tache) {
    const prochain: Tache["statut"] = t.statut === "a_faire" ? "en_cours" : t.statut === "en_cours" ? "fait" : "a_faire";
    setTaches((liste) => (liste ?? []).map((x) => (x.id === t.id ? { ...x, statut: prochain } : x)));
    await fetch("/api/admin/retours/ameliorations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, statut: prochain }),
    });
  }

  return (
    <div className="mt-5">
      <p className="text-xs font-medium text-white/60 mb-2">Tâches liées à cette catégorie</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          placeholder="Créer une tâche…"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-signal"
        />
        <Button onClick={ajouter} disabled={envoi || !titre.trim()} className="!px-3 !py-1.5 text-xs">
          Ajouter
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {(taches ?? []).map((t) => (
          <button
            key={t.id}
            onClick={() => basculerStatut(t)}
            className={`text-left rounded-lg border border-white/10 px-3 py-1.5 text-xs transition-colors ${
              t.statut === "fait" ? "text-white/35 line-through bg-white/[0.02]" : "text-white/80 bg-white/5 hover:bg-white/10"
            }`}
          >
            {LABELS_STATUT[t.statut]} — {t.titre}
          </button>
        ))}
      </div>
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
      <p className="text-xs text-white/50">
        <a href="/login" className="text-signal underline">
          Connectez-vous
        </a>{" "}
        pour signaler que vous rencontrez aussi cette difficulté.
      </p>
    );
  }

  if (monAvis !== null || fait) {
    return <p className="text-xs text-white/50">Déjà signalé (importance {fait ? importance : monAvis}/10). Merci.</p>;
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
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={importance}
        onChange={(e) => setImportance(Number(e.target.value))}
        className="fr-slider flex-1"
      />
      <span className="w-6 text-right text-xs text-white/60">{importance}</span>
      <button
        onClick={envoyer}
        disabled={envoi}
        className="shrink-0 rounded-lg bg-signal/15 text-signal px-2.5 py-1 text-[11px] font-medium hover:bg-signal/25 disabled:opacity-50"
      >
        {envoi ? "…" : "Moi aussi"}
      </button>
      {erreur && <p className="text-[11px] text-signal">{erreur}</p>}
    </div>
  );
}
