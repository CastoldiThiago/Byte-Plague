import * as THREE from 'three';

const SCALE = 2.5 / 256; // world units per canvas pixel (matches original proportions)

export function createDotSprite(): THREE.Sprite {
  const SIZE = 64;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const cx = SIZE / 2, cy = SIZE / 2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE / 2);
  glow.addColorStop(0,    'rgba(100, 255, 160, 1.0)');
  glow.addColorStop(0.28, 'rgba(60,  210, 110, 0.85)');
  glow.addColorStop(0.55, 'rgba(20,  130,  60, 0.35)');
  glow.addColorStop(1,    'rgba(0,    50,  15, 0.0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.24, 0.24, 1);
  return sprite;
}

export function createFocusedLabel(text: string): THREE.Sprite {
  const FONT_MAIN = "500 15px 'Courier New'";
  const PAD_X     = 16;
  const PAD_TOP   = 10;
  const PAD_BOT   = 10;
  const MAIN_H    = 18;

  // Measure text on a temp canvas to compute required width
  const tmp = document.createElement('canvas');
  const mCtx = tmp.getContext('2d')!;
  mCtx.font = FONT_MAIN;
  const mainW = mCtx.measureText(text).width;

  const canvasW = Math.ceil(mainW + PAD_X * 2);
  const canvasH = PAD_TOP + MAIN_H + PAD_BOT;

  const canvas = document.createElement('canvas');
  canvas.width  = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = 'rgba(6, 12, 20, 0.84)';
  roundRect(ctx, 0, 0, canvasW, canvasH, 5);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(100, 255, 150, 0.22)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, canvasW - 1, canvasH - 1, 5);
  ctx.stroke();

  // Filename
  ctx.font = FONT_MAIN;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#d4f5c0';
  ctx.fillText(text, canvasW / 2, PAD_TOP);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvasW * SCALE, canvasH * SCALE, 1);
  return sprite;
}

export function disposeSprite(sprite: THREE.Sprite): void {
  const mat = sprite.material as THREE.SpriteMaterial;
  const canvas = mat.map?.source.data as HTMLCanvasElement | undefined;
  mat.map?.dispose();
  mat.dispose();
  sprite.removeFromParent();
  canvas?.remove();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}
