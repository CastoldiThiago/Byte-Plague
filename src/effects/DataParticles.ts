import * as THREE from 'three';
import { GameStateManager } from '../core/GameStateManager';

const PARTICLE_COUNT = 500;

// Volume the particles occupy in world space
const X_HALF  = 30;   // x: -30 to +30
const Z_MIN   = -25;  // z: -25 to +10
const Z_RANGE = 35;
const Y_MAX   = 8;    // particles loop from 0 to Y_MAX

const SPEED_BASE  = 0.3;  // units / second (minimum)
const SPEED_RANGE = 0.5;  // randomised on top of base: 0.3 – 0.8 u/s
const ALERT_SPEED_MULT  = 3.0;
const ALERT_THRESHOLD   = 60;

export class DataParticles {
  private readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;

  public constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.speeds    = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.randomiseXZ(i);
      this.positions[i * 3 + 1] = Math.random() * Y_MAX; // spread y at start
      this.speeds[i] = SPEED_BASE + Math.random() * SPEED_RANGE;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3),
    );

    const material = new THREE.PointsMaterial({
      color: 0x4af626,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false, // prevents z-fighting with transparent overlaps
    });

    this.points = new THREE.Points(this.geometry, material);
    scene.add(this.points);
  }

  public update(deltaTime: number): void {
    const speedMult = GameStateManager.getInstance().alertLevel > ALERT_THRESHOLD
      ? ALERT_SPEED_MULT
      : 1.0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.positions[i * 3 + 1] += this.speeds[i] * speedMult * deltaTime;

      if (this.positions[i * 3 + 1] > Y_MAX) {
        this.randomiseXZ(i);
        this.positions[i * 3 + 1] = 0;
        this.speeds[i] = SPEED_BASE + Math.random() * SPEED_RANGE;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.points.removeFromParent();
  }

  private randomiseXZ(i: number): void {
    this.positions[i * 3]     = (Math.random() - 0.5) * X_HALF * 2;
    this.positions[i * 3 + 2] = Z_MIN + Math.random() * Z_RANGE;
  }
}
