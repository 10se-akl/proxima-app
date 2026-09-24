"use client";

// ============================================================================
// Brouillon isolé — "Aperçu visuel" (voir app/apercu-visuel/page.tsx)
// ----------------------------------------------------------------------------
// Explore jusqu'où pousser le rendu visuel de l'accueil (référence : mockup
// "Compyo — Immersive Landing" façon Lovable + un site vitrine d'agence en
// rendu 3D Unreal Engine) SANS ajouter de dépendance ni sacrifier le temps
// de chargement mobile — un artisan consulte souvent Compyo depuis un
// chantier, sur une connexion moyenne. Quatre ajouts, tous CSS/SVG purs :
//
// 1. Profondeur 3D légère (perspective + rotateX/rotateY pilotés par la
//    souris) sur le nœud central et les cartes flottantes du hero — desktop
//    uniquement (pointer fin + hover disponibles), jamais sur mobile où ça
//    n'aurait aucun sens (pas de souris) et coûterait de la batterie pour
//    rien. Écouteurs JAMAIS attachés si prefers-reduced-motion, ni sur un
//    pointeur tactile (voir peutInteragirEnProfondeur()).
// 2. Halos radiaux plus travaillés (dégradés, pas d'image) derrière le hero
//    et le CTA final, pour un rendu plus "cinématique".
// 3. Un grain de film très subtil (SVG <feTurbulence>, encodé en data URI,
//    quelques centaines d'octets) en overlay sur toute la page — renforce
//    le côté "atelier premium" sans texture téléchargée.
// 4. "Le logo qui se décompose" (voir LogoInteractif.tsx) : la vraie marque
//    Compyo remplace le badge générique au centre du hero — au survol
//    (ou au tap sur mobile), l'arc s'ouvre et s'estompe, le cœur grossit,
//    et une phrase explique ce que fait le produit. Intensifie aussi les
//    lignes de convergence déjà en place pendant qu'il est actif.
//
// Réutilise directement les sections non concernées par ces ajouts
// (AvantApres, MetiersInteractifs, Temoignage, CtaFinal) depuis
// LandingImmersive.tsx plutôt que de les dupliquer — seul le hero change
// vraiment ici. Reste 100% autonome vis-à-vis du reste de l'app : aucune
// nouvelle dépendance (pas de Three.js/WebGL — testé et jugé disproportionné
// pour ce que ces trois effets apportent, voir rapport de cycle).
// ============================================================================

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Header, Footer } from "./Cadre";
import { LogoInteractif } from "./LogoInteractif";
import {
  AvantApres,
  MetiersInteractifs,
  Temoignage,
  CtaFinal,
  CARTES_HERO,
} from "./LandingImmersive";

// Grain de film — bruit fin généré par filtre SVG, encodé en data URI et
// posé en <img> plein écran à très faible opacité (mix-blend-mode
// "overlay") : aucun fichier à charger, quelques centaines d'octets une
// fois gzippé dans le HTML, jamais retéléchargé (contrairement à une image
// de texture classique). baseFrequency élevée + peu de tuiles ("0 0 90 90"
// répété) donne un grain fin plutôt que des taches.
const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 90'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
  );

// Vrai souris fine (pas un doigt) ET l'utilisateur n'a pas demandé de
// réduire les animations : conditions réunies pour activer la profondeur
// 3D pilotée par la souris. Vérifié une seule fois au montage (un artisan
// ne change pas de type de pointeur en pleine visite) plutôt qu'en continu.
function peutInteragirEnProfondeur() {
  if (typeof window === "undefined") return false;
  const reduitMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointeurFin = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  return pointeurFin && !reduitMotion;
}

/** Grille de halos + grain, posée une fois derrière tout le contenu — voir
 * commentaire en tête de fichier, point 2 et 3. */
function AtmosphereVisuelle() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-1/4 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(201,107,74,0.16) 0%, rgba(201,107,74,0.05) 45%, transparent 72%)",
        }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] h-[55vh] w-[55vh] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(232,149,111,0.12) 0%, rgba(232,149,111,0.03) 50%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_SVG}")`, backgroundSize: "180px 180px" }}
      />
    </div>
  );
}

function HeroConvergenceV2() {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const [actif, setActif] = useState(false);
  // Inclinaison courante (degrés) — état plutôt que manipulation DOM directe
  // pour rester dans le modèle React standard du reste du fichier ; le
  // volume d'updates (un pointeur, une zone) reste négligeable pour du
  // state React classique, pas besoin d'une ref + rAF ici.
  const [inclinaison, setInclinaison] = useState({ x: 0, y: 0 });
  // "Le logo qui se décompose" (06/09) — voir LogoInteractif.tsx. Remontée
  // ici uniquement pour intensifier les lignes de convergence pendant que
  // le logo est décomposé (voir la classe "lignes-actives" plus bas) :
  // renforce visuellement l'idée que tout converge vers lui, sans dupliquer
  // la logique d'activation elle-même, qui reste entièrement dans
  // LogoInteractif.
  const [logoDecompose, setLogoDecompose] = useState(false);

  useEffect(() => {
    setActif(peutInteragirEnProfondeur());
  }, []);

  function surMouvement(e: React.PointerEvent<HTMLDivElement>) {
    if (!actif || !zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    // Position normalisée -1..1 depuis le centre de la zone, dans les deux
    // axes — c'est ce ratio qui pilote l'angle d'inclinaison ci-dessous.
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setInclinaison({ x: px * 2, y: py * 2 });
  }

  function surSortie() {
    setInclinaison({ x: 0, y: 0 });
  }

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

      {/* Constellation desktop/tablette, avec profondeur 3D pilotée par la
          souris — voir peutInteragirEnProfondeur(). "perspective" sur le
          conteneur, "transform-style: preserve-3d" implicite via les
          rotateX/Y appliqués aux enfants (le nœud central directement, les
          cartes via un wrapper séparé pour ne pas entrer en conflit avec
          leur animation de flottement, qui possède déjà son propre
          transform — voir le commentaire sur .carte-flottante-profondeur). */}
      <div
        ref={zoneRef}
        onPointerMove={surMouvement}
        onPointerLeave={surSortie}
        className="relative mx-auto mt-16 hidden h-[420px] max-w-xl sm:block"
        style={{ perspective: "1000px" }}
      >
        <svg
          className={`absolute inset-0 h-full w-full ${logoDecompose ? "lignes-actives" : ""}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {CARTES_HERO.map((carte) => {
            const x = parseFloat(carte.style.left);
            const y = parseFloat(carte.style.top);
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
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            // Cette inclinaison (transform) et les transitions internes de
            // LogoInteractif (décomposition au survol) portent sur des
            // éléments différents (ce conteneur vs le SVG à l'intérieur) :
            // aucun conflit entre les deux. translateZ(30px) fait "sortir"
            // le logo du plan des cartes, cohérent avec son rôle central.
            transform: `translate(-50%, -50%) rotateX(${-inclinaison.y * 8}deg) rotateY(${inclinaison.x * 8}deg) translateZ(30px)`,
            transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <LogoInteractif taille={110} onChangeActif={setLogoDecompose} />
        </div>

        {CARTES_HERO.map((carte) => (
          <div
            key={carte.id}
            className="carte-flottante-profondeur absolute"
            style={
              {
                top: carte.style.top,
                left: carte.style.left,
                // Parallaxe : chaque carte se déplace un peu à contre-sens
                // du curseur, proportionnellement à sa distance au centre
                // (une carte loin du nœud "avance" plus qu'une carte
                // proche) — c'est ce qui vend l'illusion de profondeur au
                // survol, plutôt qu'un simple décor statique.
                "--dx": `${inclinaison.x * (6 + parseFloat(carte.style.left)) * 0.04}px`,
                "--dy": `${inclinaison.y * (6 + parseFloat(carte.style.top)) * 0.04}px`,
              } as CSSProperties
            }
          >
            <div
              className="flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-[#241C16]/90 px-3.5 py-2.5 shadow-lg shadow-black/30 backdrop-blur-sm carte-flottante"
              style={
                {
                  "--duree": `${carte.duree}s`,
                  "--retard": `${carte.retard}s`,
                  "--inclinaison": `${carte.inclinaison}deg`,
                } as CSSProperties
              }
            >
              <carte.Icon className="h-4 w-4 shrink-0 text-[#E8956F]" />
              <span className="whitespace-nowrap text-xs font-medium text-[#E8DCCB]">{carte.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Version mobile : identique à la V1, volontairement — aucun intérêt
          à une profondeur pilotée par la souris sur un écran tactile, et
          chaque effet ajouté ici coûterait de la batterie/des cycles CPU
          pour un artisan qui consulte souvent depuis un chantier. */}
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
        {/* Mobile : le logo interactif reste, volontairement — c'est un
            tap, pas un survol, donc aucun coût de batterie particulier
            (contrairement à la profondeur 3D pilotée par la souris, elle
            bien réservée au desktop). */}
        <div className="mt-2">
          <LogoInteractif taille={88} />
        </div>
      </div>

      <style jsx>{`
        .carte-flottante-profondeur {
          transform: translate(var(--dx, 0px), var(--dy, 0px));
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .carte-flottante {
          animation: flotter var(--duree) ease-in-out var(--retard) infinite;
        }
        .ligne-convergence {
          stroke-dashoffset: 8;
          animation: dessiner 3.6s linear infinite;
          transition: stroke-opacity 0.4s ease;
        }
        /* "Le logo qui se décompose" (06/09) — pendant que LogoInteractif
           est actif (survol/tap), les lignes qui relient les cartes au
           centre se marquent davantage et tournent plus vite : renforce
           visuellement l'idée que tout converge vers le logo au moment
           précis où il "s'ouvre" pour l'expliquer. */
        .lignes-actives .ligne-convergence {
          stroke-opacity: 0.85 !important;
          animation-duration: 1.6s;
        }
        @keyframes flotter {
          0%,
          100% {
            transform: rotate(var(--inclinaison)) translateY(0);
          }
          50% {
            transform: rotate(var(--inclinaison)) translateY(-8px);
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
          .ligne-convergence,
          .carte-flottante-mobile,
          .carte-flottante-profondeur {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}

export function LandingImmersiveV2() {
  return (
    <div className="theme-sombre-fixe relative min-h-screen bg-[#171512] text-[#E8DCCB]">
      <AtmosphereVisuelle />
      <div className="relative z-10">
        <Header masquerToggleTheme />
        <main>
          <HeroConvergenceV2 />
          <AvantApres />
          <MetiersInteractifs />
          <Temoignage />
          <CtaFinal />
        </main>
        <Footer />
      </div>
    </div>
  );
}
