import * as THREE from 'three';

// ── MinimapUI ────────────────────────────────────────────────────────────────
// Radar superior derecho: posición del jugador (con orientación) y del antivirus.
// Las coordenadas del mapa cubren aproximadamente todo el recorrido jugable
// (ver waypoints en AntivirusAgent.ts).

const MAP_BOUNDS = { minX: -30, maxX: 30, minZ: -46, maxZ: 22 };
const CANVAS_SIZE = 160;

export class MinimapUI {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly forward = new THREE.Vector3();

  public constructor() {
    this.injectStyles();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap';
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.ctx = this.canvas.getContext('2d')!;

    document.getElementById('app')!.appendChild(this.canvas);
  }

  public dispose(): void {
    this.canvas.remove();
  }

  public update(camera: THREE.PerspectiveCamera, dronePosition: THREE.Vector3 | null): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Fondo + grilla
    ctx.fillStyle = 'rgba(4, 14, 8, 0.6)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(74, 246, 38, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const p = (CANVAS_SIZE / 4) * i;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, CANVAS_SIZE);
      ctx.moveTo(0, p);
      ctx.lineTo(CANVAS_SIZE, p);
      ctx.stroke();
    }

    // Drone del antivirus
    if (dronePosition !== null) {
      const d = this.worldToMap(dronePosition);
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
      ctx.fill();

      const pulse = 4 + 3 * (0.5 + 0.5 * Math.sin(Date.now() / 250));
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Jugador: triángulo orientado hacia donde mira la cámara
    const p = this.worldToMap(camera.position);
    camera.getWorldDirection(this.forward);
    const angle = Math.atan2(this.forward.x, -this.forward.z);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#4af626';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private worldToMap(pos: THREE.Vector3): { x: number; y: number } {
    const x = ((pos.x - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) * CANVAS_SIZE;
    const y = ((pos.z - MAP_BOUNDS.minZ) / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)) * CANVAS_SIZE;
    return { x, y };
  }

  private injectStyles(): void {
    if (document.getElementById('minimap-styles') !== null) return;
    const style = document.createElement('style');
    style.id = 'minimap-styles';
    style.textContent = `
      #minimap {
        position: fixed;
        top: 0.8rem;
        right: 0.8rem;
        width: 160px;
        height: 160px;
        border: 1px solid rgba(74, 246, 38, 0.35);
        border-radius: 6px;
        background: rgba(4, 14, 8, 0.6);
        box-shadow: 0 0 16px rgba(74, 246, 38, 0.08);
        z-index: 500;
      }
    `;
    document.head.appendChild(style);
  }
}
