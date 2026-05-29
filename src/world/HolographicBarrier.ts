import * as THREE from 'three';

const BARRIER_HEIGHT = 3.5;

function buildGridTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Horizontal scan lines — más brillantes cada 8 líneas
  for (let y = 0; y < size; y += 5) {
    const bright = y % 40 < 5;
    ctx.strokeStyle = bright ? 'rgba(0, 220, 255, 0.75)' : 'rgba(0, 160, 255, 0.25)';
    ctx.lineWidth = bright ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Vertical grid (espaciado amplio)
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x < size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Borde brillante
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.95)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class HolographicBarrier {
  private readonly mesh: THREE.Mesh;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly interactables: THREE.Object3D[];
  private readonly collidables: THREE.Object3D[];
  private time = 0;
  private opened = false;

  public constructor(
    scene: THREE.Scene,
    center: THREE.Vector3,
    rotationY: number,
    width: number,
    poiId: string,
    interactables: THREE.Object3D[],
    collidables: THREE.Object3D[],
    label = 'Firewall activo [E] — bypass',
  ) {
    this.interactables = interactables;
    this.collidables = collidables;

    const geo = new THREE.PlaneGeometry(width, BARRIER_HEIGHT);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      map: buildGridTexture(),
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(center.x, BARRIER_HEIGHT / 2, center.z);
    this.mesh.rotation.y = rotationY;
    this.mesh.userData.interactive = true;
    this.mesh.userData.poiId = poiId;
    this.mesh.userData.poiLabel = label;

    scene.add(this.mesh);
    interactables.push(this.mesh);
    collidables.push(this.mesh);
  }

  public open(): void {
    if (this.opened) return;
    this.opened = true;
    this.mesh.visible = false;

    // Sacar el mesh de ambos arrays para deshabilitar interacción y colisión.
    // visible=false no deshabilita raycasting en Three.js r184.
    const iIdx = this.interactables.indexOf(this.mesh);
    if (iIdx !== -1) this.interactables.splice(iIdx, 1);

    const cIdx = this.collidables.indexOf(this.mesh);
    if (cIdx !== -1) this.collidables.splice(cIdx, 1);
  }

  public update(deltaTime: number): void {
    if (this.opened) return;
    this.time += deltaTime;
    this.mat.opacity = 0.35 + Math.sin(this.time * 2.8) * 0.13;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.map?.dispose();
    this.mat.dispose();
    this.mesh.removeFromParent();
  }
}
