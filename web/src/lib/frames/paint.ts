// Fonctions de peinture des cadres — chacune dessine le fond + décor complet
// sur le canvas de la bande, avant les cases. Motifs "CSS-able" (gingham,
// checkers, denim) générés en procédural, pas d'assets image nécessaires.
// Voir SNAPROOM-SPEC.md §13.

export function solid(color: string) {
  return (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  };
}

export function kraft(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#e3d2b4";
  ctx.fillRect(0, 0, width, height);
  // légères taches pour suggérer la texture papier kraft
  ctx.fillStyle = "rgba(120,95,60,0.08)";
  for (let i = 0; i < 90; i++) {
    const x = (i * 197) % width;
    const y = (i * 331 + 53) % height;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function vintage(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#efe1c7";
  ctx.fillRect(0, 0, width, height);
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height / 3,
    width / 2,
    height / 2,
    height * 0.75,
  );
  vignette.addColorStop(0, "rgba(92,64,38,0)");
  vignette.addColorStop(1, "rgba(74,50,28,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  // grain léger
  ctx.fillStyle = "rgba(74,50,28,0.05)";
  for (let i = 0; i < 260; i++) {
    const x = (i * 71) % width;
    const y = (i * 149 + 23) % height;
    ctx.fillRect(x, y, 1, 1);
  }
}

export function gingham(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, width, height);
  const cell = 20;
  ctx.fillStyle = "rgba(107,142,94,0.32)";
  for (let x = 0; x < width; x += cell * 2) ctx.fillRect(x, 0, cell, height);
  for (let y = 0; y < height; y += cell * 2) ctx.fillRect(0, y, width, cell);
}

export function checkers(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cell = 18;
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const even = (Math.round(x / cell) + Math.round(y / cell)) % 2 === 0;
      ctx.fillStyle = even ? "#ffffff" : "#c7d2fe";
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

export function denim(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#33456e";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2;
  for (let x = -height; x < width; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }
}

export function pop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#fbf7f1";
  ctx.fillRect(0, 0, width, height);
  const colors = ["#fb5a46", "#6a48f4", "#ffb787", "#34d399", "#ffd166"];
  for (let i = 0; i < 22; i++) {
    const x = (i * 53 + 17) % width;
    const y = 8 + ((i * 37) % (height - 16));
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const top = size * 0.3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + top);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + top);
  ctx.bezierCurveTo(x - size / 2, y + (size + top) / 2, x, y + (size + top) / 2, x, y + size);
  ctx.bezierCurveTo(x, y + (size + top) / 2, x + size / 2, y + (size + top) / 2, x + size / 2, y + top);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + top);
  ctx.closePath();
  ctx.fill();
}

export function valentine(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#ffe4e9";
  ctx.fillRect(0, 0, width, height);
  const colors = ["#fb5a46", "#ff8fa3", "#e63950"];
  for (let i = 0; i < 26; i++) {
    const x = (i * 61 + 23) % width;
    const y = 10 + ((i * 43) % (height - 20));
    const size = 10 + (i % 3) * 3;
    heart(ctx, x, y, size, colors[i % colors.length]);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Film : fond très sombre + perforations façon pellicule 35mm sur les
// bords, le vrai motif demandé plutôt qu'un simple aplat.
export function film(ctx: CanvasRenderingContext2D, width: number, height: number, margin: number) {
  ctx.fillStyle = "#161319";
  ctx.fillRect(0, 0, width, height);

  const holeWidth = Math.max(6, margin * 0.3);
  const holeHeight = holeWidth * 1.4;
  const gap = holeHeight * 0.8;
  const centerX = margin / 2;

  ctx.fillStyle = "#3a3640";
  for (let y = margin / 2; y < height - margin / 2; y += holeHeight + gap) {
    roundRect(ctx, centerX - holeWidth / 2, y, holeWidth, holeHeight, 2);
    ctx.fill();
    roundRect(ctx, width - centerX - holeWidth / 2, y, holeWidth, holeHeight, 2);
    ctx.fill();
  }
}
