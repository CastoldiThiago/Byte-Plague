import * as THREE from 'three';

export function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx !== null) {
    ctx.fillStyle = 'rgba(8, 14, 24, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(155, 255, 79, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.fillStyle = '#d9f7bf';
    ctx.font = '600 24px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 0.62, 1);
  return sprite;
}

export function disposeLabelSprite(sprite: THREE.Sprite): void {
  const material = sprite.material as THREE.SpriteMaterial;
  const canvas = (material.map?.source.data as HTMLCanvasElement | undefined);
  material.map?.dispose();
  material.dispose();
  sprite.removeFromParent();
  if (canvas instanceof HTMLCanvasElement) {
    canvas.remove();
  }
}
