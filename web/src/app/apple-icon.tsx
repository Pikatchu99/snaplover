import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Icône iOS (ajout à l'écran d'accueil) — même marque que icon.tsx, plus grande.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fbf7f1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          transform: "rotate(-6deg)",
        }}
      >
        <div style={{ width: 90, height: 26, borderRadius: 8, background: "#fb5a46" }} />
        <div style={{ width: 90, height: 26, borderRadius: 8, background: "#6a48f4" }} />
        <div style={{ width: 90, height: 26, borderRadius: 8, background: "#ff7d54" }} />
      </div>
    ),
    { ...size },
  );
}
