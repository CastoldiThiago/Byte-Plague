import * as THREE from 'three';
import droneUrl from '../assets/models/drone.glb?url';
import { GameStateManager } from '../core/GameStateManager';

// ── Drone parameters ───────────────────────────────────────────────────────

const DRONE_BASE_Y    = 2.2;   // flight height — debajo del techo (~3 m) (world units)
const DRONE_SCALE     = 0.005; // GLB model scale
const MOVE_SPEED      = 3.0;   // units / second
const REACH_DIST      = 0.40;  // switch to next waypoint at this XZ distance

const CONE_RANGE       = 8;    // detection radius (units)
const CONE_ANGLE_START = 60;   // initial full cone angle (degrees)
const CONE_ANGLE_MAX   = 110;  // maximum full cone angle (degrees)
const CONE_ANGLE_STEP  = 15;   // degrees added every CONE_STEP_SECS seconds
const CONE_STEP_SECS   = 60;   // seconds per angle step

const ALERT_RATE  = 15;        // alert points per second while player is in cone

const DWELL_MIN = 2;           // minimum dwell at each waypoint (seconds)
const DWELL_MAX = 4;           // maximum dwell at each waypoint (seconds)

const SPOOF_DURATION   = 20;   // seconds traffic_spoof sends drone away
const STEALTH_DURATION = 10;   // seconds stealth_mode disables detection

// ── Patrol waypoints ─────────────────────────────────────────────────────
// TODO: Replace placeholders with exact coordinates from the DevPanel.

// Etapa 2 — pasillo central + sala /shares
const WP_STAGE_2: readonly THREE.Vector3[] = [
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -12.00), // pasillo central — norte
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -25.49), // pasillo central — centro
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -38.00), // pasillo central — sur
  new THREE.Vector3(-22.00, DRONE_BASE_Y,  -20.00), // sala /shares
];

// Etapa 3 — todo el mapa (incluye DC y sala crítica)
const WP_STAGE_3: readonly THREE.Vector3[] = [
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -12.00), // pasillo central — norte
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -25.49), // pasillo central — centro
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -38.00), // pasillo central — sur
  new THREE.Vector3(-22.00, DRONE_BASE_Y,  -20.00), // sala /shares
  new THREE.Vector3(  7.66, DRONE_BASE_Y,  -48.00), // sala controlador de dominio
  new THREE.Vector3( 22.00, DRONE_BASE_Y,  -15.00), // sala crítica (/critical)
];

// Waypoints de distracción para trafficSpoof — zona Etapa 1 (la más lejana)
const WP_DISTRACTION: readonly THREE.Vector3[] = [
  new THREE.Vector3(-14.80, DRONE_BASE_Y,  19.81), // entrada / spawn
  new THREE.Vector3(-30.00, DRONE_BASE_Y,  12.00), // interior oficina jperez
];

// ── AntivirusAgent ─────────────────────────────────────────────────────────

export class AntivirusAgent {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly audioListener: THREE.AudioListener;

  // Drone 3D model
  private droneGroup: THREE.Group | null = null;
  private droneTime = 0;
  private disposed = false;

  // Vision cone — flat sector mesh projected on the floor
  private readonly coneMesh: THREE.Mesh;
  private readonly coneMaterial: THREE.MeshBasicMaterial;
  private currentConeAngle = CONE_ANGLE_START;

  // Facing direction in XZ plane (normalized), used to orient the cone
  private readonly facingDir = new THREE.Vector3(0, 0, -1);

  // Active stage (1 = inactive / invisible, 2 = stage 2 patrol, 3 = full map)
  private stage = 1;

  // Normal patrol state
  private waypointIndex = 0;
  private isDwelling = false;
  private dwellElapsed = 0;
  private dwellDuration = 0;
  private activeTime = 0; // seconds since stage 2 activated (drives cone escalation)

  // Detection
  private playerInCone = false;

  // trafficSpoof state
  private isSpoofed = false;
  private spoofElapsed = 0;
  private spoofWpIndex = 0;
  private spoofDwelling = false;
  private spoofDwellElapsed = 0;

  // stealthMode state
  private stealthActive = false;
  private stealthElapsed = 0;

  // Audio
  private humAudio: THREE.PositionalAudio | null = null;
  private alertAudio: THREE.Audio | null = null;
  private humReady = false;

  // ── Constructor ────────────────────────────────────────────────────────

  public constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    audioListener: THREE.AudioListener,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.audioListener = audioListener;

    // Vision cone — flat sector on the XZ plane (y = 0.04 avoids z-fighting with floor)
    this.coneMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.coneMesh = new THREE.Mesh(
      this.buildConeGeometry(CONE_ANGLE_START, CONE_RANGE),
      this.coneMaterial,
    );
    this.coneMesh.position.y = 0.04;
    this.coneMesh.visible = false; // shown when stage 2 activates
    scene.add(this.coneMesh);

    this.initAudio();
    void this.loadDrone();

    window.addEventListener('levelComplete', this.onLevelComplete);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Sends the drone to the Stage-1 distraction waypoints for SPOOF_DURATION seconds,
   * clearing the patrol zone around the player.
   */
  public trafficSpoof(): void {
    if (this.stage < 2) return;
    this.isSpoofed = true;
    this.spoofElapsed = 0;
    this.spoofWpIndex = 0;
    this.spoofDwelling = false;
  }

  /**
   * Disables cone detection for STEALTH_DURATION seconds.
   * The cone colour changes to blue while the effect is active.
   */
  public stealthMode(): void {
    if (this.stage < 2) return;
    this.stealthActive = true;
    this.stealthElapsed = 0;
    this.coneMaterial.color.set(0x2266ff);
  }

  public update(deltaTime: number): void {
    if (this.stage < 2 || this.droneGroup === null) return;

    // ── Cone angle escalation ──────────────────────────────────────────
    this.activeTime += deltaTime;
    const targetAngle = Math.min(
      CONE_ANGLE_START + Math.floor(this.activeTime / CONE_STEP_SECS) * CONE_ANGLE_STEP,
      CONE_ANGLE_MAX,
    );
    if (targetAngle !== this.currentConeAngle) {
      this.currentConeAngle = targetAngle;
      this.coneMesh.geometry.dispose();
      this.coneMesh.geometry = this.buildConeGeometry(this.currentConeAngle, CONE_RANGE);
    }

    // ── Stealth timer ──────────────────────────────────────────────────
    if (this.stealthActive) {
      this.stealthElapsed += deltaTime;
      if (this.stealthElapsed >= STEALTH_DURATION) {
        this.stealthActive = false;
        this.coneMaterial.color.set(0xff2222);
      }
    }

    // ── Movement ───────────────────────────────────────────────────────
    if (this.isSpoofed) {
      this.updateSpoof(deltaTime);
    } else {
      this.updatePatrol(deltaTime);
    }

    // ── Drone visual ───────────────────────────────────────────────────
    this.droneTime += deltaTime;
    this.droneGroup.position.y = DRONE_BASE_Y + Math.sin(this.droneTime * 1.4) * 0.10;

    // Orientar el modelo hacia donde se mueve. El modelo mira -Z por defecto;
    // atan2(-x, -z) mapea facingDir a esa convención.
    this.droneGroup.rotation.y = Math.atan2(this.facingDir.x, this.facingDir.z);

    // ── Cone transform ─────────────────────────────────────────────────
    // The sector geometry points in +Z by default; rotation.y aligns it with facingDir.
    // Formula: R_y(atan2(fx, fz)) * (0,0,1) = (fx, 0, fz) ✓
    this.coneMesh.position.x = this.droneGroup.position.x;
    this.coneMesh.position.z = this.droneGroup.position.z;
    this.coneMesh.rotation.y = Math.atan2(this.facingDir.x, this.facingDir.z);

    // ── Detection ──────────────────────────────────────────────────────
    this.checkConeDetection(deltaTime);
  }

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener('levelComplete', this.onLevelComplete);

    this.coneMesh.geometry.dispose();
    this.coneMaterial.dispose();
    this.scene.remove(this.coneMesh);

    if (this.humAudio !== null) {
      if (this.humAudio.isPlaying) this.humAudio.stop();
      this.humAudio.disconnect();
    }
    if (this.alertAudio !== null) {
      if (this.alertAudio.isPlaying) this.alertAudio.stop();
      this.alertAudio.disconnect();
    }

    if (this.droneGroup !== null) {
      this.scene.remove(this.droneGroup);
      this.droneGroup.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) m.dispose();
      });
    }
  }

  // ── Stage transitions ──────────────────────────────────────────────────

  private readonly onLevelComplete = (e: Event): void => {
    const { level } = (e as CustomEvent<{ level: number }>).detail;
    if (level === 1) this.activateStage2();
    else if (level === 2) this.activateStage3();
  };

  public activateStage2(): void {
    this.stage = 2;
    this.waypointIndex = this.randomWaypoint(-1, WP_STAGE_2);
    this.isDwelling = false;

    if (this.droneGroup !== null) {
      this.droneGroup.visible = true;
      this.coneMesh.visible = true;
    }
    if (this.humAudio !== null && this.humReady && !this.humAudio.isPlaying) {
      this.humAudio.play();
    }
  }

  public activateStage3(): void {
    this.stage = 3;
    // Continue current patrol; getActiveWaypoints() now returns WP_STAGE_3
  }

  // ── Patrol helpers ─────────────────────────────────────────────────────

  private getActiveWaypoints(): readonly THREE.Vector3[] {
    return this.stage >= 3 ? WP_STAGE_3 : WP_STAGE_2;
  }

  private randomWaypoint(exclude: number, waypoints: readonly THREE.Vector3[]): number {
    if (waypoints.length <= 1) return 0;
    let idx = 0;
    for (let i = 0; i < 10; i++) {
      idx = Math.floor(Math.random() * waypoints.length);
      if (idx !== exclude) break;
    }
    return idx;
  }

  private updatePatrol(deltaTime: number): void {
    if (this.droneGroup === null) return;
    const waypoints = this.getActiveWaypoints();

    if (this.isDwelling) {
      this.dwellElapsed += deltaTime;
      if (this.dwellElapsed >= this.dwellDuration) {
        this.isDwelling = false;
        this.waypointIndex = this.randomWaypoint(this.waypointIndex, waypoints);
      }
      return;
    }

    const target = waypoints[this.waypointIndex];
    if (target === undefined) return;

    const dp = this.droneGroup.position;
    const dx = target.x - dp.x;
    const dz = target.z - dp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < REACH_DIST) {
      this.isDwelling = true;
      this.dwellElapsed = 0;
      this.dwellDuration = DWELL_MIN + Math.random() * (DWELL_MAX - DWELL_MIN);
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    dp.x += (dx / dist) * step;
    dp.z += (dz / dist) * step;
    this.facingDir.set(dx / dist, 0, dz / dist);
  }

  private updateSpoof(deltaTime: number): void {
    this.spoofElapsed += deltaTime;
    if (this.spoofElapsed >= SPOOF_DURATION) {
      this.isSpoofed = false;
      return;
    }

    if (this.droneGroup === null) return;

    if (this.spoofDwelling) {
      this.spoofDwellElapsed += deltaTime;
      if (this.spoofDwellElapsed >= 2.0) {
        this.spoofDwelling = false;
        this.spoofWpIndex = (this.spoofWpIndex + 1) % WP_DISTRACTION.length;
      }
      return;
    }

    const target = WP_DISTRACTION[this.spoofWpIndex];
    if (target === undefined) return;

    const dp = this.droneGroup.position;
    const dx = target.x - dp.x;
    const dz = target.z - dp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < REACH_DIST) {
      this.spoofDwelling = true;
      this.spoofDwellElapsed = 0;
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    dp.x += (dx / dist) * step;
    dp.z += (dz / dist) * step;
    this.facingDir.set(dx / dist, 0, dz / dist);
  }

  // ── Detection ──────────────────────────────────────────────────────────

  private checkConeDetection(deltaTime: number): void {
    if (this.stealthActive || this.droneGroup === null) {
      this.playerInCone = false;
      return;
    }

    const dp = this.droneGroup.position;
    const cp = this.camera.position;
    const dx = cp.x - dp.x;
    const dz = cp.z - dp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > CONE_RANGE) {
      this.playerInCone = false;
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    const dot = this.facingDir.x * nx + this.facingDir.z * nz;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const halfConeRad = (this.currentConeAngle * Math.PI) / 360;

    if (angle <= halfConeRad) {
      GameStateManager.getInstance().increaseAlert(ALERT_RATE * deltaTime);
      if (!this.playerInCone) {
        this.playerInCone = true;
        if (this.alertAudio !== null && this.alertAudio.buffer !== null && !this.alertAudio.isPlaying) {
          this.alertAudio.play();
        }
      }
    } else {
      this.playerInCone = false;
    }
  }

  // ── Geometry ───────────────────────────────────────────────────────────

  /** Flat triangle-fan sector on the XZ plane. Default forward direction is +Z. */
  private buildConeGeometry(angleDeg: number, range: number, segments = 20): THREE.BufferGeometry {
    const halfRad = (angleDeg * Math.PI) / 360; // half the full angle in radians
    const positions: number[] = [0, 0, 0];       // apex / center vertex
    for (let i = 0; i <= segments; i++) {
      const a = -halfRad + (i / segments) * 2 * halfRad;
      positions.push(Math.sin(a) * range, 0, Math.cos(a) * range);
    }
    const indices: number[] = [];
    for (let i = 0; i < segments; i++) indices.push(0, i + 1, i + 2);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    return geo;
  }

  // ── Asset loading ──────────────────────────────────────────────────────

  private initAudio(): void {
    const loader = new THREE.AudioLoader();

    // Positional hum — volume fades linearly: max at 5 units, silent at 20 units
    this.humAudio = new THREE.PositionalAudio(this.audioListener);
    this.humAudio.setDistanceModel('linear');
    this.humAudio.setRefDistance(5);
    this.humAudio.setMaxDistance(20);
    this.humAudio.setRolloffFactor(1);
    this.humAudio.setLoop(true);
    this.humAudio.setVolume(1);

    loader.load(
      '/sounds/drone-hum.mp3',
      (buffer) => {
        if (this.disposed) return;
        this.humAudio!.setBuffer(buffer);
        this.humReady = true;
        if (this.stage >= 2 && !this.humAudio!.isPlaying) this.humAudio!.play();
      },
      undefined,
      () => { /* file absent — silent patrol */ },
    );

    // One-shot alert — non-positional so it always reaches the player as a UI cue
    this.alertAudio = new THREE.Audio(this.audioListener);
    this.alertAudio.setLoop(false);
    this.alertAudio.setVolume(0.9);

    loader.load(
      '/sounds/drone-alert.mp3',
      (buffer) => {
        if (this.disposed) return;
        this.alertAudio!.setBuffer(buffer);
      },
      undefined,
      () => { /* file absent */ },
    );
  }

  private async loadDrone(): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        new GLTFLoader().load(droneUrl, resolve, undefined, reject);
      });

      if (this.disposed) return;

      this.droneGroup = gltf.scene;
      this.droneGroup.scale.setScalar(DRONE_SCALE);
      this.droneGroup.position.set(0.97, DRONE_BASE_Y, -25.49);
      this.droneGroup.visible = this.stage >= 2;

      this.droneGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });

      // Attach positional hum so it follows the drone automatically
      if (this.humAudio !== null) this.droneGroup.add(this.humAudio);

      this.scene.add(this.droneGroup);

      if (this.stage >= 2) {
        this.coneMesh.visible = true;
        if (this.humAudio !== null && this.humReady && !this.humAudio.isPlaying) {
          this.humAudio.play();
        }
      }
    } catch {
      // drone.glb missing — agent functions without a visible model
    }
  }
}
