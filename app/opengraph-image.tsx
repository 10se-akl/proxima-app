import { ImageResponse } from "next/og";

// Image affichée quand le lien Compyo est partagé (WhatsApp, LinkedIn,
// SMS...) — générée dynamiquement, même logique que app/icon.tsx, pour
// ne pas avoir à maintenir un fichier image séparé. Sans elle, un lien
// partagé affichait un rectangle vide (voir audit pré-lancement).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#1F2937",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", position: "relative", width: 56, height: 56 }}>
            <div
              style={{
                display: "flex",
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "12px solid #C96B4A",
                borderRightColor: "transparent",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 16,
                right: -8,
                width: 22,
                height: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#E8C5B6",
                }}
              />
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: 11,
                  top: 0,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#E8C5B6",
                }}
              />
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: 5.5,
                  top: 5.5,
                  width: 11,
                  height: 11,
                  background: "#E8C5B6",
                  transform: "rotate(45deg)",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", color: "#FAF8F5", fontSize: 32, fontWeight: 600 }}>
            Compyo
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "#FAF8F5",
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 950,
          }}
        >
          Vos soirées ne sont pas faites
        </div>
        <div
          style={{
            display: "flex",
            color: "#C96B4A",
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          pour la paperasse.
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(250,248,245,0.6)",
            fontSize: 26,
            marginTop: 36,
          }}
        >
          Le compagnon des artisans du bâtiment — bêta privée
        </div>
      </div>
    ),
    { ...size }
  );
}
