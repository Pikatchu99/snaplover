import { ImageResponse } from "next/og";
import { fr } from "@/i18n/messages";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = fr.seo.defaultTitle;

// Image Open Graph/Twitter générée procéduralement depuis la marque
// SnapLover (mêmes géométrie/couleurs que icon.tsx/apple-icon.tsx : 3 barres
// coral/violet/coral2 dans une tuile blanche inclinée -6deg) — pas d'asset
// image statique.
export default function OpengraphImage() {
  const tagline = `${fr.landing.titlePrefix} ${fr.landing.titleHighlight}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "#161319",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "radial-gradient(circle at 50% 42%, rgba(251,90,70,0.35), transparent 60%)",
          }}
        />
        <div
          style={{
            display: "flex",
            width: 140,
            height: 140,
            background: "white",
            borderRadius: 28,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transform: "rotate(-6deg)",
          }}
        >
          <div style={{ display: "flex", width: 80, height: 22, borderRadius: 6, background: "#fb5a46" }} />
          <div style={{ display: "flex", width: 80, height: 22, borderRadius: 6, background: "#6a48f4" }} />
          <div style={{ display: "flex", width: 80, height: 22, borderRadius: 6, background: "#ff7d54" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "white", fontFamily: "sans-serif" }}>
            SnapLover
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#c9c2b8",
              fontFamily: "sans-serif",
              textAlign: "center",
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
