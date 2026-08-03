import { ImageResponse } from "next/og";

// Favicon généré dynamiquement par Next.js (convention app/icon.tsx) —
// aucun fichier image à maintenir, aligné sur les couleurs de la marque
// (voir tailwind.config.ts). Remplace l'ancien favicon "P" resté en cache
// dans certains navigateurs après le rebranding Proxima → Compyo.
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
          background: "#1C2A33",
          color: "#F3F0E8",
          fontSize: 40,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
