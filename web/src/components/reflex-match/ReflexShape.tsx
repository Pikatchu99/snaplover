import type { ReflexCell } from "@/types/reflex-match";

interface ReflexShapeProps {
  cell: ReflexCell;
  size?: number;
}

// Rendu SVG plutôt que canvas (contrairement à lib/frames/paint.ts) : ces
// formes doivent être cliquables individuellement et animées (Framer
// Motion) — un canvas demanderait un hit-testing manuel par forme, un SVG
// se comporte comme n'importe quel élément DOM.
export function ReflexShape({ cell, size = 48 }: ReflexShapeProps) {
  const color = `hsl(${cell.hue}, 70%, 60%)`;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `rotate(${cell.rotationDeg}deg)` }}>
      {cell.shape === "circle" && <circle cx="50" cy="50" r="40" fill={color} />}
      {cell.shape === "square" && <rect x="15" y="15" width="70" height="70" fill={color} />}
      {cell.shape === "triangle" && <polygon points="50,10 90,90 10,90" fill={color} />}
      {cell.shape === "diamond" && <polygon points="50,5 95,50 50,95 5,50" fill={color} />}
      {cell.shape === "star" && (
        <polygon points="50,5 61,38 97,38 68,59 79,92 50,71 21,92 32,59 3,38 39,38" fill={color} />
      )}
      {/* Encoche — une des trois façons possibles de rendre la case impaire
          différente (voir lib/reflex-match/generate-round.ts) : une petite
          bouchée découpée dans le bord, couleur du fond du plateau. */}
      {cell.notch && <circle cx="50" cy="12" r="14" fill="#0d0b0f" />}
    </svg>
  );
}
