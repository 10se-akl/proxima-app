import { ImageResponse } from "next/og";

// Favicon généré dynamiquement par Next.js (convention app/icon.tsx) —
// aucun fichier image à maintenir. Reprend le symbole officiel de la
// marque (voir components/marketing/CompyoMark.tsx et BRAND.md) plutôt
// que la simple lettre "C" utilisée avant l'identité visuelle v2 :
// l'anneau ouvert (border avec le côté droit transparent, ce qui ouvre
// l'anneau à 3h sans avoir besoin de rotation) + un cœur dans
// l'ouverture. next/og (Satori) ne restitue pas un <path> SVG arbitraire
// de façon fiable, d'où cette approximation en CSS pur — volontairement
// SANS transform: rotate() sur l'anneau : une rotation appliquée
// uniquement à l'anneau désynchronise son ouverture de la position (non
// tournée) des formes à côté (bug réel corrigé une première fois ici).
//
// Le cœur est approximé avec la technique CSS classique "deux cercles +
// un carré tourné à 45°" : chaque cercle est centré exactement sur un
// coin (avant rotation) du carré, donc le rotate(45deg) du carré (autour
// de son propre centre, valeur par défaut) ne désynchronise rien — les
// coordonnées des cercles ne dépendent pas de la rotation du carré.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF8F5",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 40,
            height: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "9px solid #C96B4A",
              borderRightColor: "transparent",
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 12,
              right: -6,
              width: 16,
              height: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 0,
                top: 0,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#E8C5B6",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 8,
                top: 0,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#E8C5B6",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: 4,
                top: 4,
                width: 8,
                height: 8,
                background: "#E8C5B6",
                transform: "rotate(45deg)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
