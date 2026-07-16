import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon généré depuis la marque SnapLover (mini bande photo, 3 barres) —
// voir components/landing/Logo.tsx et docs/design/snaproom-hifi.dc.html.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "white",
          borderRadius: 7,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          transform: "rotate(-6deg)",
        }}
      >
        <div style={{ width: 16, height: 5, borderRadius: 1.5, background: "#fb5a46" }} />
        <div style={{ width: 16, height: 5, borderRadius: 1.5, background: "#6a48f4" }} />
        <div style={{ width: 16, height: 5, borderRadius: 1.5, background: "#ff7d54" }} />
      </div>
    ),
    { ...size },
  );
}
