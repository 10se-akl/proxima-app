"use client";

// ============================================================================
// Accueil en production (app/page.tsx) — également monté depuis
// app/apercu-immersif/page.tsx (doublon conservé comme page de comparaison,
// exclu du référencement).
// ----------------------------------------------------------------------------
// Composant quasi autonome : aucune dépendance ajoutée (pas de
// framer-motion), uniquement React + Tailwind + IntersectionObserver/scroll
// natif. Ne touche à aucun composant partagé EXTÉRIEUR à ce module — les
// seuls imports externes sont next/link et components/ui/Button (en lecture
// seule, non modifié). Plusieurs sous-sections et données sont exportées
// (05/09) pour être réutilisées par components/marketing/LandingImmersiveV2
// (voir app/apercu-visuel/page.tsx) sans dupliquer leur code : ça reste un
// module interne au dossier marketing, pas un composant partagé au sens du
// reste de l'app.
//
// Direction artistique validée par Axel : thème sombre café/atelier
// (réutilise les tokens --c-* du mode sombre existant plutôt que des hex en
// dur, pour rester cohérent avec le reste du produit), accent terracotta,
// énormément d'espace, très peu de texte, animations qui montrent plutôt
// qu'elles ne décorent.
// ============================================================================

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Header, Footer } from "./LandingPage";

/** Signature commune à toutes les icônes inline de cette page : une icône
 * accepte toujours une classe (couleur/taille via Tailwind) et, pour les
 * usages animés (avant/après), un style inline optionnel (opacité/couleur
 * interpolées en JS). */
export type IconComponent = (props: { className?: string; style?: CSSProperties }) => ReactNode;

// ----------------------------------------------------------------------------
// Petits hooks locaux (pas de dépendance externe)
// ----------------------------------------------------------------------------

/** Révèle un élément (fade + léger déplacement) la première fois qu'il entre
 * dans le viewport. Un seul déclenchement — pas de va-et-vient au scroll,
 * pour rester "doux" plutôt que nerveux. */
function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/** Progression de scroll (0 → 1) d'une section "pinnable" : 0 quand le haut
 * du bloc atteint le haut du viewport, 1 quand son bas l'atteint. Utilisé
 * pour le scrollytelling avant/après — un simple listener scroll + rAF,
 * pas de librairie de scroll. */
function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const total = rect.height - viewportHeight;
    const raw = total > 0 ? (-rect.top) / total : 0;
    setProgress(Math.min(1, Math.max(0, raw)));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        measure();
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [measure]);

  return { ref, progress };
}

/** Interpolation linéaire simple. */
function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

/** Easing "smoothstep" — accélère puis ralentit, plus organique qu'une
 * interpolation linéaire brute pour un mouvement de convergence. */
function smoothstep(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

// ----------------------------------------------------------------------------
// Icônes inline (SVG minimalistes, pas de librairie d'icônes)
// ----------------------------------------------------------------------------

export const IconMicro: IconComponent = ({ className, style }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

export const IconPhoto: IconComponent = ({ className, style }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 16.5 8.5 12l3.5 3 3-2.5L21 16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
};

export const IconMessage: IconComponent = ({ className, style }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M4 5h16v11H9l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};

export const IconDevis: IconComponent = ({ className, style }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M6 3h9l4 4v14H6V3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 15h6M9 9h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};

const IconCarnet: IconComponent = ({ className, style }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 3v18" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 8h5M12 11h5M12 14h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
};

export const IconCheck: IconComponent = ({ className, style }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ----------------------------------------------------------------------------
// Illustrations "métiers" — formes géométriques simples, distinctes par
// métier (pas de détail réaliste, juste une silhouette immédiatement
// reconnaissable + une couleur d'accent propre).
// ----------------------------------------------------------------------------

type Metier = {
  id: string;
  nom: string;
  accent: string;
  phrase: string;
  illustration: (accent: string) => ReactNode;
};

const METIERS: Metier[] = [
  {
    id: "electricien",
    nom: "Électricien",
    accent: "#E8B23D",
    phrase: "Un devis chiffré en 30 secondes après la visite.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <path
          d="M112 30 62 108h34l-14 62 58-84h-36l8-56Z"
          fill={accent}
          fillOpacity="0.85"
        />
      </svg>
    ),
  },
  {
    id: "chauffagiste",
    nom: "Chauffagiste",
    accent: "#E8734A",
    phrase: "Chaque intervention retrouvée en un instant, même un an après.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <path
          d="M100 44c-18 20-28 36-28 52a28 28 0 0 0 56 0c0-10-4-18-10-26 1 10-4 16-10 16-8 0-10-8-8-16-10 6-16 14-16 24"
          fill={accent}
          fillOpacity="0.85"
        />
      </svg>
    ),
  },
  {
    id: "peintre",
    nom: "Peintre",
    accent: "#4A9E8E",
    phrase: "Les teintes et quantités exactes, sans rouvrir un carnet.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <rect x="58" y="56" width="70" height="26" rx="4" fill={accent} fillOpacity="0.85" />
        <rect x="70" y="82" width="20" height="52" rx="4" fill={accent} fillOpacity="0.6" />
        <path d="M120 82v18a14 14 0 0 0 14 14h0" stroke={accent} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: "couvreur",
    nom: "Couvreur",
    accent: "#C96B4A",
    phrase: "Les photos d'avant-chantier retrouvées en un clic.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <path d="M40 118 100 58l60 60" stroke={accent} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.9" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={58 + col * 22 - (row % 2 === 0 ? 0 : 11)}
              y={124 + row * 14}
              width="18"
              height="10"
              rx="2"
              fill={accent}
              fillOpacity={0.35 + row * 0.15}
            />
          ))
        )}
      </svg>
    ),
  },
  {
    id: "plombier",
    nom: "Plombier",
    accent: "#4A7FA5",
    phrase: "Un historique client complet avant même de sonner.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <path
          d="M60 60h30v24a14 14 0 0 0 14 14h0a14 14 0 0 1 14 14v28"
          stroke={accent}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <circle cx="118" cy="140" r="10" fill={accent} fillOpacity="0.85" />
      </svg>
    ),
  },
  {
    id: "macon",
    nom: "Maçon",
    accent: "#A87C5A",
    phrase: "Chaque étape du chantier, horodatée et organisée.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        {[0, 1, 2, 3].map((row) => (
          <g key={row}>
            {[0, 1, 2].map((col) => (
              <rect
                key={col}
                x={56 + col * 30 - (row % 2 === 0 ? 0 : 15)}
                y={130 - row * 20}
                width="26"
                height="16"
                rx="2"
                fill={accent}
                fillOpacity={0.4 + row * 0.14}
              />
            ))}
          </g>
        ))}
      </svg>
    ),
  },
  // Revue métier (06/09) — cette section n'en montrait que 6 sur les 18
  // métiers réellement couverts par Compyo (voir lib/metiers.ts) :
  // menuisier, carreleur, serrurier, paysagiste et bien d'autres ne se
  // reconnaissaient nulle part sur l'accueil. Ajout d'un échantillon plus
  // large, réparti sur les mêmes familles que lib/metiers.ts (bois/finitions,
  // sécurité, extérieur) plutôt que d'ajouter les 18 (onglets illisibles) —
  // toujours pas exhaustif, mais beaucoup plus représentatif qu'avant.
  {
    id: "menuisier",
    nom: "Menuisier",
    accent: "#C08A52",
    phrase: "Vos mesures et références de matériel toujours à portée de main.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <rect x="58" y="52" width="84" height="96" rx="6" fill="none" stroke={accent} strokeWidth="8" opacity="0.85" />
        <path d="M100 52v96M58 100h84" stroke={accent} strokeWidth="6" opacity="0.55" />
      </svg>
    ),
  },
  {
    id: "carreleur",
    nom: "Carreleur",
    accent: "#5C7A99",
    phrase: "Le bon métrage retrouvé, sans ressortir le mètre à chaque devis.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={62 + col * 28}
              y={62 + row * 28}
              width="24"
              height="24"
              rx="2"
              fill={accent}
              fillOpacity={(row + col) % 2 === 0 ? 0.85 : 0.35}
            />
          ))
        )}
      </svg>
    ),
  },
  {
    id: "serrurier",
    nom: "Serrurier",
    accent: "#9B8F6E",
    phrase: "Un dépannage urgent facturé avant même de reprendre la route.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <circle cx="76" cy="76" r="18" fill="none" stroke={accent} strokeWidth="9" opacity="0.85" />
        <path
          d="M88 88 136 136M112 112l16-16M128 128l16-16"
          stroke={accent}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      </svg>
    ),
  },
  {
    id: "paysagiste",
    nom: "Paysagiste",
    accent: "#6FA05C",
    phrase: "Le suivi de chaque jardin, jamais deux fois la même visite.",
    illustration: (accent) => (
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="72" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1.5" />
        <path
          d="M100 146c-32-10-44-42-33-75 32 1 58 17 63 48 4 20-9 33-30 27Z"
          fill={accent}
          fillOpacity="0.85"
        />
        <path d="M100 146c4-27 15-49 37-64" stroke={accent} strokeWidth="4" fill="none" opacity="0.55" />
      </svg>
    ),
  },
];

// ----------------------------------------------------------------------------
// Données du hero (cartes flottantes)
// ----------------------------------------------------------------------------

export type CarteFlottante = {
  id: string;
  label: string;
  Icon: IconComponent;
  style: { top: string; left: string };
  duree: number;
  retard: number;
  inclinaison: number;
};

// Positions volontairement irrégulières (coins, distances différentes du
// centre, légère bascule) — un cercle parfait N/E/S/O fait "schéma
// technique", ce placement organique fait "constellation vivante".
export const CARTES_HERO: CarteFlottante[] = [
  { id: "voix", label: "Note vocale", Icon: IconMicro, style: { top: "10%", left: "16%" }, duree: 6.2, retard: 0, inclinaison: -3 },
  { id: "photo", label: "Photo de chantier", Icon: IconPhoto, style: { top: "16%", left: "80%" }, duree: 7.1, retard: 0.4, inclinaison: 2 },
  { id: "message", label: "Message WhatsApp", Icon: IconMessage, style: { top: "86%", left: "22%" }, duree: 6.7, retard: 0.9, inclinaison: 2.5 },
  { id: "devis", label: "Devis PDF", Icon: IconDevis, style: { top: "82%", left: "76%" }, duree: 7.6, retard: 0.2, inclinaison: -2 },
];

// ----------------------------------------------------------------------------
// Données de la section "avant / après" — positions codées en dur (pas de
// Math.random() : on veut un rendu identique à chaque montage, serveur et
// client, et un contrôle précis du "chaos" initial).
// ----------------------------------------------------------------------------

type ElementDisperse = {
  id: string;
  label: string;
  Icon: IconComponent;
  depart: { x: number; y: number; rot: number };
  arrivee: { x: number; y: number };
};

const ELEMENTS_AVANT_APRES: ElementDisperse[] = [
  { id: "voix", label: "Note vocale", Icon: IconMicro, depart: { x: 12, y: 18, rot: -14 }, arrivee: { x: 34, y: 42 } },
  { id: "sms", label: "SMS", Icon: IconMessage, depart: { x: 78, y: 12, rot: 10 }, arrivee: { x: 66, y: 40 } },
  { id: "photo", label: "Photo", Icon: IconPhoto, depart: { x: 20, y: 74, rot: 8 }, arrivee: { x: 40, y: 60 } },
  { id: "devis", label: "Devis", Icon: IconDevis, depart: { x: 85, y: 68, rot: -9 }, arrivee: { x: 60, y: 60 } },
  { id: "carnet", label: "Carnet papier", Icon: IconCarnet, depart: { x: 50, y: 88, rot: 16 }, arrivee: { x: 50, y: 74 } },
];

const CENTRE_AVANT_APRES = { x: 50, y: 50 };

const ETAPES_TEXTE = [
  "Tout est dispersé.",
  "Puis, progressivement...",
  "Tout converge.",
];

// ----------------------------------------------------------------------------
// Sous-composants de section
// ----------------------------------------------------------------------------

function HeroConvergence() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-28 sm:pt-36">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-[#F5F1EA] sm:text-6xl">
          Passez plus de temps
          <br />
          sur vos chantiers.
          <br />
          <span className="text-[#E8956F]">Compyo s&apos;occupe du reste.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base text-[#C9C0B4] sm:text-lg">
          L&apos;assistant conçu pour les artisans du bâtiment : vos clients, vos chantiers et vos
          devis, réunis au même endroit.
        </p>

        {/* Résumé concret, présent dans le HTML mais non affiché à l'écran
            (page volontairement très visuelle, peu de texte) : donne aux
            moteurs de recherche et aux assistants IA de quoi expliquer
            précisément ce que fait Compyo, sans dépendre uniquement de la
            meta description. */}
        <p className="sr-only">
          Compyo importe automatiquement vos messages WhatsApp et SMS, transcrit vos notes
          vocales, range vos photos de chantier par projet, et génère vos devis à partir de ces
          informations. Chaque artisan du bâtiment — électricien, chauffagiste, peintre, couvreur,
          plombier, maçon et autres métiers — retrouve ainsi tout l&apos;historique d&apos;un
          chantier ou d&apos;un client sans avoir à le ressaisir.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/fonctionnalites"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E8DCCB]/25 px-7 py-3.5 font-medium text-[#E8DCCB] transition-all hover:scale-[1.03] hover:border-[#E8DCCB]/45 active:scale-[0.97]"
          >
            Découvrir Compyo
          </Link>
          <Link
            href="/demander-acces"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C96B4A] px-7 py-3.5 font-medium text-white shadow-sm shadow-[#C96B4A]/30 transition-all hover:scale-[1.03] hover:bg-[#B85F40] active:scale-[0.97]"
          >
            Demander un accès
          </Link>
        </div>

        <p className="mt-6 font-mono text-xs tracking-wide text-[#C9C0B4]/60">
          Bêta privée — sur candidature, réponse sous 48h.
        </p>
      </div>

      {/* Constellation desktop/tablette : nœud central + 4 cartes en cercle */}
      <div className="relative mx-auto mt-16 hidden h-[420px] max-w-xl sm:block">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {CARTES_HERO.map((carte) => {
            const x = parseFloat(carte.style.left);
            const y = parseFloat(carte.style.top);
            // Courbe légère plutôt qu'une ligne droite : le point de
            // contrôle est décalé perpendiculairement au segment, à une
            // distance proportionnelle à sa longueur — donne un arc doux,
            // jamais un schéma technique à angles droits.
            const mx = (50 + x) / 2;
            const my = (50 + y) / 2;
            const dx = x - 50;
            const dy = y - 50;
            const longueur = Math.hypot(dx, dy) || 1;
            const decalage = longueur * 0.12;
            const cx = mx + (-dy / longueur) * decalage;
            const cy = my + (dx / longueur) * decalage;
            return (
              <path
                key={carte.id}
                d={`M 50 50 Q ${cx} ${cy} ${x} ${y}`}
                fill="none"
                stroke="#C96B4A"
                strokeOpacity="0.45"
                strokeWidth="0.4"
                strokeDasharray="2 2"
                className="ligne-convergence"
              />
            );
          })}
        </svg>

        <div
          className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-[#C96B4A]/40 bg-[#2A2019] text-center shadow-[0_0_40px_-8px_rgba(201,107,74,0.55)] noeud-central"
          role="img"
          aria-label="Votre entreprise se souvient"
        >
          <IconCheck className="h-6 w-6 text-[#E8956F]" />
          <span className="px-2 text-[10px] font-medium leading-tight text-[#E8DCCB]">
            Votre entreprise se souvient
          </span>
        </div>

        {CARTES_HERO.map((carte) => (
          <div
            key={carte.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-[#241C16]/90 px-3.5 py-2.5 shadow-lg shadow-black/30 backdrop-blur-sm carte-flottante"
            style={
              {
                top: carte.style.top,
                left: carte.style.left,
                // Variables CSS custom consommées par le keyframe "flotter"
                // ci-dessous — non typées dans CSSProperties, d'où le cast.
                "--duree": `${carte.duree}s`,
                "--retard": `${carte.retard}s`,
                "--inclinaison": `${carte.inclinaison}deg`,
              } as CSSProperties
            }
          >
            <carte.Icon className="h-4 w-4 shrink-0 text-[#E8956F]" />
            <span className="whitespace-nowrap text-xs font-medium text-[#E8DCCB]">{carte.label}</span>
          </div>
        ))}
      </div>

      {/* Version mobile : liste verticale simplifiée, mouvement réduit */}
      <div className="mx-auto mt-12 flex max-w-xs flex-col items-center gap-3 sm:hidden">
        {CARTES_HERO.map((carte, i) => (
          <div
            key={carte.id}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#241C16]/90 px-4 py-3 carte-flottante-mobile"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <carte.Icon className="h-4 w-4 shrink-0 text-[#E8956F]" />
            <span className="text-sm font-medium text-[#E8DCCB]">{carte.label}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 rounded-full border border-[#C96B4A]/40 bg-[#2A2019] px-4 py-2.5">
          <IconCheck className="h-4 w-4 text-[#E8956F]" />
          <span className="text-xs font-medium text-[#E8DCCB]">Votre entreprise se souvient</span>
        </div>
      </div>

      <style jsx>{`
        .carte-flottante {
          animation: flotter var(--duree) ease-in-out var(--retard) infinite;
        }
        .noeud-central {
          animation: pulser 4.2s ease-in-out infinite;
        }
        .ligne-convergence {
          stroke-dashoffset: 8;
          animation: dessiner 3.6s linear infinite;
        }
        @keyframes flotter {
          0%,
          100% {
            transform: translate(-50%, -50%) rotate(var(--inclinaison)) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) rotate(var(--inclinaison)) translateY(-8px);
          }
        }
        @keyframes pulser {
          0%,
          100% {
            box-shadow: 0 0 40px -8px rgba(201, 107, 74, 0.55);
          }
          50% {
            box-shadow: 0 0 56px -6px rgba(201, 107, 74, 0.8);
          }
        }
        @keyframes dessiner {
          to {
            stroke-dashoffset: 0;
          }
        }
        .carte-flottante-mobile {
          animation: apparaitre 0.6s ease-out both;
        }
        @keyframes apparaitre {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .carte-flottante,
          .noeud-central,
          .ligne-convergence,
          .carte-flottante-mobile {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

export function AvantApres() {
  const { ref, progress } = useSectionProgress<HTMLDivElement>();
  const t = smoothstep(progress);

  const etapeIndex = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2;

  return (
    <section ref={ref} className="relative" style={{ height: "260vh" }}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-[0.2em] text-[#C96B4A]">
          {ETAPES_TEXTE[etapeIndex]}
        </p>

        <div className="relative h-[70vh] max-h-[560px] w-full max-w-2xl">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {ELEMENTS_AVANT_APRES.map((el) => {
              const x = lerp(el.depart.x, el.arrivee.x, t);
              const y = lerp(el.depart.y, el.arrivee.y, t);
              return (
                <line
                  key={el.id}
                  x1={CENTRE_AVANT_APRES.x}
                  y1={CENTRE_AVANT_APRES.y}
                  x2={x}
                  y2={y}
                  stroke="#C96B4A"
                  strokeWidth="0.35"
                  strokeDasharray="2 1.5"
                  style={{ opacity: t }}
                />
              );
            })}
          </svg>

          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C96B4A]"
            style={{
              left: `${CENTRE_AVANT_APRES.x}%`,
              top: `${CENTRE_AVANT_APRES.y}%`,
              opacity: 0.25 + 0.75 * t,
              boxShadow: `0 0 ${20 + 30 * t}px ${4 + 6 * t}px rgba(201,107,74,${0.15 + 0.35 * t})`,
            }}
          />

          {ELEMENTS_AVANT_APRES.map((el) => {
            const x = lerp(el.depart.x, el.arrivee.x, t);
            const y = lerp(el.depart.y, el.arrivee.y, t);
            const rot = lerp(el.depart.rot, 0, t);
            const opacity = lerp(0.4, 1, t);
            return (
              <div
                key={el.id}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-300"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                  opacity,
                  borderColor: `rgba(201,107,74,${0.15 + 0.35 * t})`,
                  backgroundColor: `rgba(36,28,22,${0.7 + 0.2 * t})`,
                }}
              >
                <el.Icon className="h-4 w-4 shrink-0" style={{ color: `rgba(232,149,111,${0.6 + 0.4 * t})` }} />
                <span className="whitespace-nowrap text-xs font-medium text-[#E8DCCB]">{el.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MetiersInteractifs() {
  const [actif, setActif] = useState(0);
  const metier = METIERS[actif];
  const { ref, visible } = useRevealOnce<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className={`px-6 py-24 transition-all duration-700 sm:py-32 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-semibold text-[#F5F1EA] sm:text-3xl">
          Pensé pour votre métier, pas pour un logiciel générique.
        </h2>
      </div>

      <div
        className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2"
        role="tablist"
        aria-label="Choisir un métier"
      >
        {METIERS.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={actif === i}
            onClick={() => setActif(i)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96B4A]/60 ${
              actif === i
                ? "border-transparent text-[#1B1512] shadow-md"
                : "border-white/12 text-[#C9C0B4] hover:border-white/25 hover:text-[#F5F1EA]"
            }`}
            style={actif === i ? { backgroundColor: m.accent } : undefined}
          >
            {m.nom}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-14 grid max-w-3xl items-center gap-10 sm:grid-cols-2 sm:gap-14">
        <div className="mx-auto h-48 w-48 sm:h-56 sm:w-56" key={metier.id + "-illu"}>
          <div className="metier-illustration h-full w-full">{metier.illustration(metier.accent)}</div>
        </div>
        <div className="text-center sm:text-left" key={metier.id + "-texte"}>
          <p className="metier-texte font-display text-xl font-semibold leading-snug text-[#F5F1EA] sm:text-2xl">
            {metier.phrase}
          </p>
        </div>
      </div>

      {/* Version texte complète, toujours présente dans le HTML (pas
          seulement le métier survolé/sélectionné) : les lecteurs d'écran et
          les moteurs qui lisent la page (recherche, IA) doivent pouvoir
          connaître les 6 métiers et leur bénéfice sans avoir à cliquer.
          Invisible à l'écran pour un visiteur voyant (identique en
          contenu à ce qui est déjà affiché un par un ci-dessus, donc pas
          du "cloaking" — juste rendu autrement). */}
      <ul className="sr-only">
        {METIERS.map((m) => (
          <li key={m.id}>
            {m.nom} : {m.phrase}
          </li>
        ))}
      </ul>

      <style jsx>{`
        .metier-illustration,
        .metier-texte {
          animation: entree-douce 0.5s ease-out both;
        }
        @keyframes entree-douce {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .metier-illustration,
          .metier-texte {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

export function Temoignage() {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  return (
    <section className="bg-[#C96B4A] px-6 py-24 sm:py-32">
      <div
        ref={ref}
        className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <span className="inline-block rounded-full border border-white/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/90">
          Extrait des retours bêta
        </span>
        <p className="mt-7 font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
          « Avant Compyo, je savais que l&apos;info existait quelque part.
          <br className="hidden sm:block" /> Maintenant, je sais où. »
        </p>
        <p className="mt-6 text-sm font-medium text-white/85">— Un artisan électricien, utilisateur bêta</p>
      </div>
    </section>
  );
}

export function CtaFinal() {
  const { ref, visible } = useRevealOnce<HTMLDivElement>();
  return (
    <section className="px-6 py-24 sm:py-32">
      <div
        ref={ref}
        className={`mx-auto max-w-xl text-center transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <h2 className="font-display text-2xl font-semibold leading-snug text-[#F5F1EA] sm:text-3xl">
          Votre entreprise a déjà une mémoire.
          <br />
          <span className="text-[#E8956F]">Compyo lui donne une forme.</span>
        </h2>
        <Link
          href="/demander-acces"
          className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-[#C96B4A] px-7 py-3.5 text-sm font-medium text-white shadow-sm shadow-[#C96B4A]/30 transition-all hover:scale-[1.03] hover:bg-[#A8563A] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96B4A]/60"
        >
          Rejoindre la bêta privée
        </Link>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Composant racine
// ----------------------------------------------------------------------------

export function LandingImmersive() {
  // Fond appliqué sur un wrapper local plutôt que sur <body> : cette page
  // reste isolée, elle ne doit rien changer au thème du reste du site
  // (pas de header/footer global à ce jour dans app/layout.tsx — voir
  // app/apercu-immersif/page.tsx pour le contexte).
  //
  // "theme-sombre-fixe" (voir globals.css, audit 05/09) : Header et Footer
  // sont partagés avec le reste du site et suivent normalement le réglage
  // clair/sombre du visiteur — sans cette classe, un visiteur en mode
  // clair voyait un bandeau d'en-tête presque blanc au-dessus du fond
  // sombre codé en dur ci-dessous. Cette direction artistique est un choix
  // volontaire et permanent, pas un thème : elle reste sombre quel que
  // soit le réglage du visiteur, sans jamais changer sa préférence
  // globale pour le reste du site (voir le commentaire dans globals.css).
  return (
    <div className="theme-sombre-fixe min-h-screen bg-[#171512] text-[#E8DCCB]">
      <Header masquerToggleTheme />
      <main>
        <HeroConvergence />
        <AvantApres />
        <MetiersInteractifs />
        <Temoignage />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
}
