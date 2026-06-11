import * as THREE from 'three';
import droneUrl from '../assets/models/drone.glb?url';
import { GameStateManager } from '../core/GameStateManager';
import { GameConfig } from '../core/GameConfig';

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
const DWELL_MAX = 5;           // maximum dwell at each waypoint (seconds)
const LOOK_ANGULAR_SPEED = Math.PI * 0.75; // rad/s — ~1 vuelta completa en 2.7 s durante dwell

const SPOOF_DURATION    = 20;   // seconds traffic_spoof sends drone away
const STEALTH_DURATION  = 10;   // seconds stealth_mode disables detection
const FIREWALL_DURATION = 15;   // seconds firewall_rule freezes drone movement

const HUM_VOLUME   = 1;    // base volume for the drone's positional hum
const ALERT_VOLUME = 0.9;  // base volume for the one-shot alert cue

// ── Patrol waypoints ─────────────────────────────────────────────────────
// Recorrido secuencial en loop. Coordenadas registradas con DevPanel (y≈2.18).
// El drone gira su cono en cada punto durante el dwell antes de continuar.

// Etapa 2 — pasillo central + sala /shares + túnel + sala Documents
const WP_STAGE_2: readonly THREE.Vector3[] = [
  new THREE.Vector3(  0.80, DRONE_BASE_Y,  -39.84), // [0]  sala central sur (entrada hexagonal)
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // [1]  sala central centro
  new THREE.Vector3(-22.58, DRONE_BASE_Y,  -26.97), // [2]  interior shares
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // [3]  sala central centro (vuelta shares)
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // [4]  sala central mid
  new THREE.Vector3(  1.09, DRONE_BASE_Y,  -15.45), // [5]  entrada túnel
  new THREE.Vector3(  1.04, DRONE_BASE_Y,    4.05), // [6]  túnel curvo 1
  new THREE.Vector3( -7.28, DRONE_BASE_Y,   12.19), // [7]  túnel curvo 2
  new THREE.Vector3(-25.64, DRONE_BASE_Y,   12.12), // [8]  sala Documents (jperez)
  new THREE.Vector3( -7.28, DRONE_BASE_Y,   12.19), // [9]  túnel curvo 2 (vuelta)
  new THREE.Vector3(  1.04, DRONE_BASE_Y,    4.05), // [10] túnel curvo 1 (vuelta)
  new THREE.Vector3(  1.09, DRONE_BASE_Y,  -15.45), // [11] entrada túnel (vuelta)
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // [12] sala central mid (vuelta)
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // [13] sala central centro → sur (cierra loop)
];

// Etapa 3 — añade sala crítica entre [4] y [5] del recorrido de stage 2
const WP_STAGE_3: readonly THREE.Vector3[] = [
  new THREE.Vector3(  0.80, DRONE_BASE_Y,  -39.84), // [0]  sala central sur
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // [1]  sala central centro
  new THREE.Vector3(-22.58, DRONE_BASE_Y,  -26.97), // [2]  interior shares
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // [3]  sala central centro (vuelta shares)
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // [4]  sala central mid → sala crítica
  new THREE.Vector3( 13.89, DRONE_BASE_Y,  -21.15), // [5]  pasillo sala crítica
  new THREE.Vector3( 13.89, DRONE_BASE_Y,  -13.66), // [6]  pasillo doblar
  new THREE.Vector3( 26.84, DRONE_BASE_Y,  -13.19), // [7]  interior sala crítica 1
  new THREE.Vector3( 26.73, DRONE_BASE_Y,  -43.33), // [8]  interior sala crítica 2
  new THREE.Vector3( 26.84, DRONE_BASE_Y,  -13.19), // [9]  interior sala crítica 1 (vuelta)
  new THREE.Vector3( 13.89, DRONE_BASE_Y,  -13.66), // [10] pasillo doblar (vuelta)
  new THREE.Vector3( 13.89, DRONE_BASE_Y,  -21.15), // [11] pasillo sala crítica (vuelta)
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // [12] sala central mid (vuelta crítica)
  new THREE.Vector3(  1.09, DRONE_BASE_Y,  -15.45), // [13] entrada túnel
  new THREE.Vector3(  1.04, DRONE_BASE_Y,    4.05), // [14] túnel curvo 1
  new THREE.Vector3( -7.28, DRONE_BASE_Y,   12.19), // [15] túnel curvo 2
  new THREE.Vector3(-25.64, DRONE_BASE_Y,   12.12), // [16] sala Documents
  new THREE.Vector3( -7.28, DRONE_BASE_Y,   12.19), // [17] túnel curvo 2 (vuelta)
  new THREE.Vector3(  1.04, DRONE_BASE_Y,    4.05), // [18] túnel curvo 1 (vuelta)
  new THREE.Vector3(  1.09, DRONE_BASE_Y,  -15.45), // [19] entrada túnel (vuelta)
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // [20] sala central mid (vuelta)
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // [21] sala central centro → sur (cierra loop)
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -42.00), // [12] puerta DC
  new THREE.Vector3(  7.66, DRONE_BASE_Y,  -47.00), // [13] sala DC (terminal)
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -42.00), // [14] salida DC → pasillo
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -27.00), // [15] bifurcación → sala crítica
  new THREE.Vector3( 10.00, DRONE_BASE_Y,  -14.00), // [16] corredor a sala crítica
  new THREE.Vector3( 22.00, DRONE_BASE_Y,  -14.00), // [17] entrada sala crítica
  new THREE.Vector3( 30.00, DRONE_BASE_Y,  -14.00), // [18] interior sala crítica
  new THREE.Vector3( 22.00, DRONE_BASE_Y,  -14.00), // [19] vuelta sala crítica
  new THREE.Vector3( 10.00, DRONE_BASE_Y,  -14.00), // [20] corredor de salida
  new THREE.Vector3(  0.97, DRONE_BASE_Y,  -14.00), // [21] pasillo norte (cierra loop)
];

// Waypoints de rush al cuarto crítico — para la secuencia de escape de Etapa 3
const WP_RUSH_CRITICAL: readonly THREE.Vector3[] = [
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // sala central mid
  new THREE.Vector3( 13.89, DRONE_BASE_Y,  -21.15), // pasillo entrada crítica
  new THREE.Vector3( 13.89, DRONE_BASE_Y,  -13.66), // pasillo doblar
  new THREE.Vector3( 26.84, DRONE_BASE_Y,  -13.19), // interior sala crítica 1
  new THREE.Vector3( 26.73, DRONE_BASE_Y,  -43.33), // interior sala crítica 2
];

// Waypoints de distracción para trafficSpoof — sigue los pasillos reales hasta Etapa 1
const WP_DISTRACTION: readonly THREE.Vector3[] = [
  new THREE.Vector3(  0.72, DRONE_BASE_Y,  -27.30), // sala central centro
  new THREE.Vector3(  1.11, DRONE_BASE_Y,  -21.40), // sala central mid
  new THREE.Vector3(  1.09, DRONE_BASE_Y,  -15.45), // entrada túnel
  new THREE.Vector3(  1.04, DRONE_BASE_Y,    4.05), // túnel curvo 1
  new THREE.Vector3( -7.28, DRONE_BASE_Y,   12.19), // túnel curvo 2
  new THREE.Vector3(-25.64, DRONE_BASE_Y,   12.12), // sala Documents (jperez)
  new THREE.Vector3(-14.80, DRONE_BASE_Y,   19.81), // spawn — zona más lejana
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

  // Facing direction en XZ — se deriva de facingAngle (ángulo desde +Z en radianes)
  private readonly facingDir = new THREE.Vector3(0, 0, -1);
  private facingAngle = Math.PI; // empieza mirando -Z (hacia el norte del mapa)

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

  // rush + chase state (Etapa 3)
  private chaseModeActive = false; // true once enterChaseMode() is called — never resets
  private isRushing = false;
  private rushWpIndex = 0;
  private isChasing = false;
  private waitingForRush = false;
  private hasCaught = false;

  // stealthMode state
  private stealthActive = false;
  private stealthElapsed = 0;

  // firewallRule state
  private firewallActive = false;
  private firewallElapsed = 0;

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
    this.coneMesh.position.y = 0.5;  // por encima del piso del mapa
    this.coneMesh.renderOrder = 1;
    this.coneMesh.visible = false; // shown when stage 2 activates
    scene.add(this.coneMesh);

    this.initAudio();
    void this.loadDrone();

    window.addEventListener('levelComplete', this.onLevelComplete);
    window.addEventListener('chaseRushStart', this.onChaseRushStart);
    window.addEventListener('volumeChange', this.onVolumeChange);
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Sends the drone to the Stage-1 distraction waypoints for SPOOF_DURATION seconds,
   * clearing the patrol zone around the player.
   */
  public trafficSpoof(): void {
    if (this.stage < 2 || this.isChasing) return;
    this.isSpoofed = true;
    this.spoofElapsed = 0;
    this.spoofWpIndex = this.findNearestDistractionWp();
  }

  private findNearestDistractionWp(): number {
    if (this.droneGroup === null) return 0;
    const dp = this.droneGroup.position;
    let best = 0;
    let bestSq = Infinity;
    for (let i = 0; i < WP_DISTRACTION.length; i++) {
      const wp = WP_DISTRACTION[i]!;
      const dx = wp.x - dp.x;
      const dz = wp.z - dp.z;
      const sq = dx * dx + dz * dz;
      if (sq < bestSq) { bestSq = sq; best = i; }
    }
    return best;
  }

  /**
   * Freezes drone movement for FIREWALL_DURATION seconds.
   * The cone colour changes to green while the effect is active.
   */
  public firewallRule(): void {
    if (this.stage < 2 || this.isChasing) return;
    this.firewallActive = true;
    this.firewallElapsed = 0;
    this.coneMaterial.color.set(0x00ff88);
  }

  /**
   * Disables cone detection for STEALTH_DURATION seconds.
   * The cone colour changes to blue while the effect is active.
   */
  public stealthMode(): void {
    if (this.stage < 2 || this.isChasing) return;
    this.stealthActive = true;
    this.stealthElapsed = 0;
    this.coneMaterial.color.set(0x2266ff);
  }

  public update(deltaTime: number): void {
    if (this.stage < 2 || this.droneGroup === null) return;
    if (GameStateManager.getInstance().isPaused) return;

    // ── Cone angle escalation (solo fuera de chase) ────────────────────
    if (!this.chaseModeActive) {
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
    }

    // ── Firewall timer ─────────────────────────────────────────────────
    if (this.firewallActive) {
      this.firewallElapsed += deltaTime;
      if (this.firewallElapsed >= FIREWALL_DURATION) {
        this.firewallActive = false;
        if (!this.stealthActive) this.coneMaterial.color.set(0xff2222);
      }
    }

    // ── Stealth timer ──────────────────────────────────────────────────
    if (this.stealthActive) {
      this.stealthElapsed += deltaTime;
      if (this.stealthElapsed >= STEALTH_DURATION) {
        this.stealthActive = false;
        this.coneMaterial.color.set(this.firewallActive ? 0x00ff88 : 0xff2222);
      }
    }

    // ── Movement ───────────────────────────────────────────────────────
    if (this.chaseModeActive) {
      // Chase mode: only rush → chase, never fall back to patrol
      if (this.hasCaught) {
        // Do nothing — game should be stopping
      } else if (this.waitingForRush) {
        // Frozen at sala central, waiting for narrative
      } else if (this.isRushing) {
        this.updateRush(deltaTime);
      } else {
        this.updateChase(deltaTime);
      }
    } else if (this.isSpoofed) {
      this.updateSpoof(deltaTime);
    } else if (!this.firewallActive) {
      this.updatePatrol(deltaTime);
    }

    // ── Drone visual ───────────────────────────────────────────────────
    this.droneTime += deltaTime;
    this.droneGroup.position.y = DRONE_BASE_Y + Math.sin(this.droneTime * 1.4) * 0.10;

    this.droneGroup.rotation.y = Math.atan2(this.facingDir.x, this.facingDir.z);

    // ── Cone transform ─────────────────────────────────────────────────
    this.coneMesh.position.x = this.droneGroup.position.x;
    this.coneMesh.position.z = this.droneGroup.position.z;
    this.coneMesh.rotation.y = Math.atan2(this.facingDir.x, this.facingDir.z);

    // ── Detection (solo fuera de chase) ────────────────────────────────
    if (!this.chaseModeActive) this.checkConeDetection(deltaTime);
  }

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener('levelComplete', this.onLevelComplete);
    window.removeEventListener('chaseRushStart', this.onChaseRushStart);
    window.removeEventListener('volumeChange', this.onVolumeChange);

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
    else if (level === 3) this.enterChaseMode();
  };

  public activateStage2(): void {
    this.stage = 2;
    this.waypointIndex = 0;
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

  /** Etapa 3 complete: snap drone to sala central and wait for narrative to end before rushing. */
  public enterChaseMode(): void {
    if (this.stage < 2) return;
    GameStateManager.getInstance().startChase();
    this.chaseModeActive = true;
    this.hasCaught = false;

    // Snap drone to sala central — player won't see the jump (it's behind them / narrative overlay)
    if (this.droneGroup !== null) {
      this.droneGroup.position.set(1.11, DRONE_BASE_Y, -21.40);
    }

    this.isDwelling = false;
    this.isSpoofed = false;
    this.firewallActive = false;
    this.stealthActive = false;
    this.waitingForRush = true; // hold until narrative fires chaseRushStart
    this.rushWpIndex = 0;

    // 360° detection cone
    this.currentConeAngle = 360;
    this.coneMesh.geometry.dispose();
    this.coneMesh.geometry = this.buildConeGeometry(360, CONE_RANGE * 1.5);
    this.coneMaterial.color.set(0xff0000);
    this.coneMaterial.opacity = 0.40;

    // Fallback for devMode (no narrative screen): start rush after delay.
    // 6s to avoid racing with any in-progress UI transitions.
    window.setTimeout(() => {
      if (this.waitingForRush) {
        this.waitingForRush = false;
        this.isRushing = true;
      }
    }, 6000);
  }

  private readonly onChaseRushStart = (): void => {
    if (!this.waitingForRush) return;
    this.waitingForRush = false;
    this.isRushing = true;
  };

  private readonly onVolumeChange = (): void => {
    const mult = GameConfig.sfxVolumeEffective;
    this.humAudio?.setVolume(HUM_VOLUME * mult);
    this.alertAudio?.setVolume(ALERT_VOLUME * mult);
  };

  // ── Patrol helpers ─────────────────────────────────────────────────────

  private getActiveWaypoints(): readonly THREE.Vector3[] {
    return this.stage >= 3 ? WP_STAGE_3 : WP_STAGE_2;
  }

  private updatePatrol(deltaTime: number): void {
    if (this.droneGroup === null) return;
    const waypoints = this.getActiveWaypoints();

    if (this.isDwelling) {
      this.dwellElapsed += deltaTime;
      // Gira el cono mientras vigila el punto
      this.facingAngle += LOOK_ANGULAR_SPEED * deltaTime;
      this.facingDir.set(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
      if (this.dwellElapsed >= this.dwellDuration) {
        this.isDwelling = false;
        this.waypointIndex = (this.waypointIndex + 1) % waypoints.length;
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
      // Congela el ángulo de llegada como punto de partida de la rotación
      this.facingAngle = Math.atan2(this.facingDir.x, this.facingDir.z);
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    dp.x += (dx / dist) * step;
    dp.z += (dz / dist) * step;
    this.facingDir.set(dx / dist, 0, dz / dist);
    this.facingAngle = Math.atan2(dx / dist, dz / dist);
  }

  // Index of the first waypoint INSIDE the critical room
  private static readonly RUSH_CHASE_TRIGGER = 3; // WP_RUSH_CRITICAL[3] = interior sala crítica 1

  private updateRush(deltaTime: number): void {
    if (this.droneGroup === null) return;
    if (this.rushWpIndex >= AntivirusAgent.RUSH_CHASE_TRIGGER) {
      // Drone entered the room — start chasing player directly
      this.isRushing = false;
      this.isChasing = true;
      return;
    }

    const target = WP_RUSH_CRITICAL[this.rushWpIndex];
    if (target === undefined) return;

    const dp = this.droneGroup.position;
    const dx = target.x - dp.x;
    const dz = target.z - dp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < REACH_DIST) {
      this.rushWpIndex++;
      return;
    }

    const step = Math.min(MOVE_SPEED * 1.35 * GameConfig.antivirusSpeedMultiplier * deltaTime, dist);
    dp.x += (dx / dist) * step;
    dp.z += (dz / dist) * step;
    this.facingDir.set(dx / dist, 0, dz / dist);
    this.facingAngle = Math.atan2(dx / dist, dz / dist);
  }

  private readonly CATCH_DISTANCE = 2.2;

  private updateChase(deltaTime: number): void {
    if (this.droneGroup === null) return;

    const dp = this.droneGroup.position;
    const cp = this.camera.position;
    const dx = cp.x - dp.x;
    const dz = cp.z - dp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < this.CATCH_DISTANCE) {
      if (!this.hasCaught) {
        this.hasCaught = true;
        window.dispatchEvent(new CustomEvent('playerCaught'));
      }
      return;
    }

    const step = Math.min(MOVE_SPEED * 1.65 * GameConfig.antivirusSpeedMultiplier * deltaTime, dist);
    dp.x += (dx / dist) * step;
    dp.z += (dz / dist) * step;
    this.facingDir.set(dx / dist, 0, dz / dist);
    this.facingAngle = Math.atan2(dx / dist, dz / dist);
  }

  private updateSpoof(deltaTime: number): void {
    this.spoofElapsed += deltaTime;
    if (this.spoofElapsed >= SPOOF_DURATION) {
      this.isSpoofed = false;
      return;
    }

    if (this.droneGroup === null) return;

    // Se queda en el último punto una vez llegado — no cicla de vuelta
    if (this.spoofWpIndex >= WP_DISTRACTION.length) return;

    const target = WP_DISTRACTION[this.spoofWpIndex];
    if (target === undefined) return;

    const dp = this.droneGroup.position;
    const dx = target.x - dp.x;
    const dz = target.z - dp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < REACH_DIST) {
      // Avanza al siguiente waypoint sin dwell — sigue el pasillo a máxima velocidad
      this.spoofWpIndex = Math.min(this.spoofWpIndex + 1, WP_DISTRACTION.length);
      return;
    }

    const step = Math.min(MOVE_SPEED * deltaTime, dist);
    dp.x += (dx / dist) * step;
    dp.z += (dz / dist) * step;
    this.facingDir.set(dx / dist, 0, dz / dist);
    this.facingAngle = Math.atan2(dx / dist, dz / dist);
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
    this.humAudio.setVolume(HUM_VOLUME * GameConfig.sfxVolumeEffective);

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
    this.alertAudio.setVolume(ALERT_VOLUME * GameConfig.sfxVolumeEffective);

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
