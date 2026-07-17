import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SnapLover";

// 3 paires de photos de démo (mêmes assets que la landing, voir
// app/[locale]/page.tsx STRIP_A_IMAGES) — encodées en data URI : satori (le
// moteur derrière ImageResponse) ne peut pas résoudre un chemin /public
// relatif, et une URL absolue dépendrait de SITE_URL (pas garanti configuré,
// notamment en dev).
function loadPhotoDataUri(filename: string): string {
  const buffer = readFileSync(join(process.cwd(), "public", "preview", filename));
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

const STRIP_PAIRS = [
  [loadPhotoDataUri("photo-01.jpeg"), loadPhotoDataUri("photo-02.jpeg")],
  [loadPhotoDataUri("photo-03.jpeg"), loadPhotoDataUri("photo-04.jpeg")],
  [loadPhotoDataUri("photo-05.jpeg"), loadPhotoDataUri("photo-06.jpeg")],
] as const;

interface OpengraphImageProps {
  params: Promise<{ locale: string }>;
}

// Image Open Graph/Twitter : la marque SnapLover (logo procédural, mêmes
// géométrie/couleurs que icon.tsx/apple-icon.tsx) à côté d'un aperçu de la
// vraie bande photo — texte seul ne donnait pas une idée immédiate du
// produit au partage du lien, un aperçu visuel du photobooth si.
export default async function OpengraphImage({ params }: OpengraphImageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  const tOg = await getTranslations({ locale, namespace: "ogImage" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          background: "#161319",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "radial-gradient(circle at 30% 45%, rgba(251,90,70,0.3), transparent 60%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 28 }}>
          <div
            style={{
              display: "flex",
              width: 100,
              height: 100,
              background: "white",
              borderRadius: 22,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transform: "rotate(-6deg)",
            }}
          >
            <div style={{ display: "flex", width: 58, height: 16, borderRadius: 5, background: "#fb5a46" }} />
            <div style={{ display: "flex", width: 58, height: 16, borderRadius: 5, background: "#6a48f4" }} />
            <div style={{ display: "flex", width: 58, height: 16, borderRadius: 5, background: "#ff7d54" }} />
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: "white", fontFamily: "sans-serif" }}>
            SnapLover
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#c9c2b8",
              fontFamily: "sans-serif",
              maxWidth: 480,
            }}
          >
            {t("titlePrefix")} {t("titleHighlight")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 260,
            padding: 14,
            gap: 10,
            background: "white",
            borderRadius: 20,
            transform: "rotate(4deg)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          }}
        >
          {STRIP_PAIRS.map(([left, right], index) => (
            <div key={index} style={{ display: "flex", height: 118, gap: 6, borderRadius: 10, overflow: "hidden" }}>
              <img src={left} alt="" width={116} height={118} style={{ objectFit: "cover" }} />
              <img src={right} alt="" width={116} height={118} style={{ objectFit: "cover" }} />
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 13,
              letterSpacing: 3,
              color: "#8c8378",
              fontFamily: "sans-serif",
              marginTop: 4,
            }}
          >
            {tOg("caption")}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
