import * as THREE from 'three';

// ── MinimapUI ────────────────────────────────────────────────────────────────
// Radar superior derecho: posición del jugador (con orientación) y del antivirus.
// Las coordenadas del mapa cubren aproximadamente todo el recorrido jugable
// (ver waypoints en AntivirusAgent.ts).

const MAP_BOUNDS = { minX: -36, maxX: 37, minZ: -55, maxZ: 22 };
const CANVAS_SIZE = 160;

// Polígonos de cada sala/pasillo (coordenadas mundo XZ), relevados manualmente
// en mapa_coordenadas.txt. Usados solo para dibujar la silueta del mapa en el radar.
interface MapPoint { x: number; z: number }
type MapRoom = readonly MapPoint[];

const MAP_ROOMS: readonly MapRoom[] = [
  // Pasillo inicial (spawn) + pasillo hacia Documents + pasillo hacia sala central: un único corredor en T
  [
    { x: -16.69, z: 20.15 }, { x: -12.79, z: 20.16 }, { x: -12.72, z: 14.17 },
    { x: 2.94, z: 5.40 }, { x: 2.87, z: -11.65 }, { x: -1.16, z: -11.69 }, { x: -1.18, z: 2.51 }, { x: -14.95, z: 10.09 },
    { x: -16.67, z: 10.09 }, { x: -23.83, z: 10.09 }, { x: -23.60, z: 13.93 }, { x: -16.67, z: 14.51 },
  ],
  // Sala Documents (jperez)
  [{ x: -24.81, z: 19.96 }, { x: -34.03, z: 19.68 }, { x: -34.21, z: 5.60 }, { x: -24.31, z: 3.58 }],
  // Sala central
  [{ x: 9.43, z: -12.79 }, { x: 9.33, z: -37.64 }, { x: -5.38, z: -39.41 }, { x: -7.14, z: -13.56 }],
  // Pasillo hacia sala shared
  [{ x: -7.83, z: -25.44 }, { x: -19.46, z: -24.83 }, { x: -19.50, z: -28.79 }, { x: -7.89, z: -29.10 }],
  // Sala shared (servidor compartido)
  [{ x: -20.99, z: -35.34 }, { x: -28.61, z: -34.83 }, { x: -30.42, z: -13.84 }, { x: -20.62, z: -12.90 }],
  // Sala DC (controlador de dominio)
  [{ x: -6.49, z: -39.49 }, { x: -5.44, z: -48.55 }, { x: 7.41, z: -48.06 }, { x: 9.13, z: -41.01 }],
  // Pasillo en L hacia sala crítica
  [{ x: 9.94, z: -19.36 }, { x: 11.88, z: -19.25 }, { x: 11.87, z: -11.60 }, { x: 17.88, z: -11.48 }, { x: 18.02, z: -15.34 }, { x: 16.20, z: -15.69 }, { x: 15.96, z: -23.19 }, { x: 10.06, z: -23.00 }],
  // Sala de archivos críticos
  [{ x: 18.92, z: -5.28 }, { x: 35.34, z: -5.13 }, { x: 34.47, z: -48.73 }, { x: 18.52, z: -50.07 }],
];

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

    // Silueta del mapa (salas y pasillos)
    ctx.fillStyle = 'rgba(74, 246, 38, 0.05)';
    ctx.strokeStyle = 'rgba(74, 246, 38, 0.3)';
    ctx.lineWidth = 1;
    for (const room of MAP_ROOMS) {
      ctx.beginPath();
      room.forEach((point, i) => {
        const p = this.worldToMap(point);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
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

  private worldToMap(pos: { x: number; z: number }): { x: number; y: number } {
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
