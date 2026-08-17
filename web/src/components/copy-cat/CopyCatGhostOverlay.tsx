import { config } from "@/lib/config";

interface CopyCatGhostOverlayProps {
  referenceUrl: string;
}

// Calque fantôme — la référence est stockée en vraie orientation (voir
// hooks/use-copy-cat-session.ts, `mirrored: true` des DEUX côtés), mais
// l'aperçu vidéo en direct du·de la mimic reste CSS-miroité comme partout
// ailleurs dans l'app (convention selfie, voir components/room/CameraTile.tsx
// `-scale-x-100`). Sans ce même miroir appliqué ICI, à l'affichage
// uniquement (jamais sur la donnée réellement stockée pour la notation/le
// récap/l'export), la main droite de la référence tomberait du côté
// opposé à la main droite du·de la mimic dans son propre miroir — la
// consigne "copie cette pose" deviendrait spatialement inversée et
// déroutante (piège explicitement identifié dans la spec du jeu).
export function CopyCatGhostOverlay({ referenceUrl }: CopyCatGhostOverlayProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client, jamais une URL distante
    <img
      src={referenceUrl}
      alt=""
      className="pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover"
      style={{ opacity: config.copyCat.ghostOpacity }}
    />
  );
}
