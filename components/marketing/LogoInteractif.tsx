"use client";

import { useState } from "react";
import { TRACE_COEUR } from "./CompyoMark";

// ============================================================
// "Le logo qui se décompose" (06/09) — exploration demandée par Axel :
// pousser l'accueil vers quelque chose de plus interactif que de simples
// cartes flottantes, en utilisant la vraie marque Compyo (voir
// CompyoMark.tsx) plutôt qu'une forme générique.
//
// Au repos : le symbole officiel, tel quel (arc ouvert + cœur dans
// l'ouverture, qui se lisent ensemble comme un "C"). Au survol (ou au tap
// sur mobile — pas de souris, donc bascule au toucher plutôt qu'un hover
// qui ne se déclencherait jamais) : l'arc pivote et s'estompe comme s'il
// se desserrait, le cœur grossit et devient le point central, et une
// phrase explique ce que fait Compyo. Au départ de la souris (ou un
// second tap), tout revient à sa place — jamais de réassemblage brutal,
// toujours la même transition douce dans les deux sens.
//
// 100% CSS (transform + opacity), aucune dépendance : cohérent avec le
// reste de LandingImmersiveV2. Le texte d'explication reste toujours
// présent dans le DOM (juste à opacité 0 au repos) : un lecteur d'écran
// le restitue quel que soit l'état visuel, contrairement à un
// display:none qui l'aurait masqué aux deux.
// ============================================================

const COULEUR_ARC = "#C96B4A";
const COULEUR_COEUR = "#E8956F";

export function LogoInteractif({
  taille = 128,
  className,
  onChangeActif,
}: {
  taille?: number;
  className?: string;
  onChangeActif?: (actif: boolean) => void;
}) {
  const [survol, setSurvol] = useState(false);
  const [verrouille, setVerrouille] = useState(false);
  const actif = survol || verrouille;

  function surSurvol(valeur: boolean) {
    setSurvol(valeur);
    onChangeActif?.(valeur || verrouille);
  }

  function surActivation() {
    const nouveau = !verrouille;
    setVerrouille(nouveau);
    onChangeActif?.(nouveau || survol);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={actif}
      aria-label={actif ? "Masquer l'explication de Compyo" : "Découvrir ce que fait Compyo"}
      onMouseEnter={() => surSurvol(true)}
      onMouseLeave={() => surSurvol(false)}
      onClick={surActivation}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          surActivation();
        }
      }}
      className={`logo-interactif relative inline-flex cursor-pointer items-center justify-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#E8956F]/60 ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 100 100"
        width={taille}
        height={taille}
        className={`logo-svg ${actif ? "actif" : ""}`}
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        {/* Recentrage (06/09) : l'anneau (cercle complet centré en 50,50)
            et le cœur logé dans son ouverture forment ensemble une silhouette
            dont le CENTRE VISUEL réel n'est pas à 50,50 — le cœur, plus
            "lourd" visuellement, tire le regard vers la droite. Mesuré
            précisément (bbox combinée avec fermeture du trait) : centre réel
            ≈ (53, 50) sur un viewBox 0-100, donc décalé vers la droite par
            rapport au point (50,50) où convergent les lignes pointillées des
            cartes. Ce groupe recentre l'ensemble en compensant ce décalage,
            plutôt que de déplacer le point de convergence des cartes
            lui-même (qui, lui, doit rester le vrai centre géométrique de la
            zone). */}
        <g transform="translate(-5, 0)">
          <path
            className="logo-arc"
            d="M 74.04 74.04 A 34 34 0 1 1 74.04 25.96"
            fill="none"
            stroke={COULEUR_ARC}
            strokeWidth={16}
            strokeLinecap="round"
          />
          <g className="logo-coeur" transform="translate(71.6,35.39) scale(1.2)">
            <path d={TRACE_COEUR} fill={COULEUR_COEUR} />
          </g>
        </g>
      </svg>

      {/* Bug de centrage corrigé (06/09) : ce texte, même invisible au repos
          (opacity-0), occupait quand même de la place dans la mise en page
          tant qu'il vivait dans le flux normal (flex-col) — ça poussait le
          logo visible vers le haut de son emplacement centré, un décalage
          d'autant plus visible que le logo est maintenant grand (110px,
          plus qu'un simple badge). Position absolute : le texte se place
          sous le logo sans jamais compter dans la boîte que le parent
          centre (voir "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          dans LandingImmersiveV2.tsx) — désormais c'est bien le SVG seul
          qui détermine le centre. */}
      <p
        className={`absolute left-1/2 top-full mt-4 w-[230px] -translate-x-1/2 text-center text-xs font-medium leading-relaxed text-[#E8DCCB] transition-opacity duration-500 ${
          actif ? "opacity-100" : "opacity-0"
        }`}
      >
        Compyo capte vos messages, vos photos et vos notes vocales, et prépare vos devis —
        automatiquement.
      </p>

      <style jsx>{`
        .logo-arc {
          transform-box: fill-box;
          transform-origin: center;
          transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease;
        }
        .logo-svg.actif .logo-arc {
          transform: rotate(55deg) scale(1.2);
          opacity: 0.45;
        }
        .logo-coeur {
          transform-box: fill-box;
          transform-origin: center;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .logo-svg.actif .logo-coeur {
          transform: scale(1.55);
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-arc,
          .logo-coeur {
            transition: opacity 0.3s ease !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
