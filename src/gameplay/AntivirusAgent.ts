import * as THREE from 'three';
import { GameStateManager } from '../core/GameStateManager';

const WAYPOINTS: readonly THREE.Vector3[] = [
  new THREE.Vector3(-8, 0.5,  6),
  new THREE.Vector3( 8, 0.5,  6),
  new THREE.Vector3( 8, 0.5, -5),
  new THREE.Vector3(-8, 0.5, -5),
];

const BASE_SPEED = 2;           // units / second
const REACH_THRESHOLD = 0.25;  // units — snap to next waypoint

const LINE_OF_SIGHT_DIST = 10; // active detection range (units)
const SIGHT_ALERT_RATE = 25;   // alert / second when player is visible

const PASSIVE_DETECT_DIST = 5;      // passive detection range when LoS is blocked
const PASSIVE_ALERT_AMOUNT = 15;    // alert added per passive interval
const PASSIVE_CHECK_INTERVAL = 2;   // seconds between passive checks

export class AntivirusAgent {
  public readonly mesh: THREE.Mesh;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly obstacles: THREE.Object3D[];
  private readonly raycaster = new THREE.Raycaster();
  private readonly dir = new THREE.Vector3();      // patrol direction, reused each frame
  private readonly toPlayer = new THREE.Vector3(); // LoS vector, reused each frame
  private readonly hum: THREE.PositionalAudio;

  private waypointIndex = 0;
  private passiveCheckTimer = 0;
  private started = false;
  private audioReady = false;

  public constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    obstacles: THREE.Object3D[],
    audioListener: THREE.AudioListener,
  ) {
    this.camera = camera;
    this.obstacles = obstacles;
    this.raycaster.near = 0.6; // skip past the agent's own sphere (r = 0.5)

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xff2222,
        emissive: 0x550000,
        roughness: 0.4,
        metalness: 0.3,
      }),
    );
    this.mesh.castShadow = true;
    this.mesh.position.copy(WAYPOINTS[0]);
    scene.add(this.mesh);

    this.hum = new THREE.PositionalAudio(audioListener);
    this.hum.setRefDistance(3);
    this.hum.setMaxDistance(15);
    this.hum.setLoop(true);
    this.hum.setVolume(1);
    this.mesh.add(this.hum); // follows mesh position automatically

    new THREE.AudioLoader().load(
      '/audio/antivirus_hum.mp3',
      (buffer) => {
        this.hum.setBuffer(buffer);
        this.audioReady = true;
        if (this.started) this.hum.play();
      },
      undefined,
      () => { /* missing file — agent runs silently */ },
    );
  }

  public update(deltaTime: number): void {
    if (!this.started) {
      this.started = true;
      if (this.audioReady && this.hum.buffer !== null) this.hum.play();
    }

    const gs = GameStateManager.getInstance();
    const speed = gs.alertLevel > 60 ? BASE_SPEED * 2 : BASE_SPEED;

    // --- patrol movement ---
    const target = WAYPOINTS[this.waypointIndex];
    this.dir.subVectors(target, this.mesh.position);
    const distToWaypoint = this.dir.length();

    if (distToWaypoint < REACH_THRESHOLD) {
      this.waypointIndex = (this.waypointIndex + 1) % WAYPOINTS.length;
    } else {
      this.mesh.position.addScaledVector(
        this.dir.normalize(),
        Math.min(speed * deltaTime, distToWaypoint),
      );
    }

    // --- detection ---
    this.toPlayer.subVectors(this.camera.position, this.mesh.position);
    const distToPlayer = this.toPlayer.length();

    // active: clear line of sight within LINE_OF_SIGHT_DIST
    if (distToPlayer < LINE_OF_SIGHT_DIST) {
      this.raycaster.set(this.mesh.position, this.toPlayer.normalize());
      this.raycaster.far = distToPlayer; // only detect obstacles before the player

      const blocked = this.raycaster.intersectObjects(this.obstacles, false).length > 0;

      if (!blocked) {
        gs.increaseAlert(SIGHT_ALERT_RATE * deltaTime);
        return; // passive check skipped while actively tracking player
      }
    }

    // passive: proximity-only when LoS is blocked or player is out of active range
    this.passiveCheckTimer += deltaTime;
    if (this.passiveCheckTimer >= PASSIVE_CHECK_INTERVAL) {
      this.passiveCheckTimer -= PASSIVE_CHECK_INTERVAL;
      if (distToPlayer < PASSIVE_DETECT_DIST) {
        gs.increaseAlert(PASSIVE_ALERT_AMOUNT);
      }
    }
  }

  public dispose(): void {
    if (this.hum.isPlaying) this.hum.stop();
    this.hum.disconnect();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
