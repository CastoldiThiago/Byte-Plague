import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';
import { InteractionManager } from './InteractionManager';
import { TerminalUI } from '../ui/TerminalUI';
import { ChoiceUI } from '../ui/ChoiceUI';
import { GameConfig } from './GameConfig';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';
import { NarrativeScreen } from '../ui/NarrativeScreen';
import { isDevMode } from './DevMode';
import { DevPanel } from '../ui/DevPanel';
import { WorldBuilder } from '../world/WorldBuilder';
import { AntivirusAgent } from '../gameplay/AntivirusAgent';
import { SaveManager } from './SaveManager';
import { EvasionItemManager } from '../gameplay/EvasionItemManager';

// ── Save-point configuration ────────────────────────────────────────────────
// Spawn positions for each stage (used when restoring from a checkpoint).
const STAGE_SPAWNS: Readonly<Record<number, THREE.Vector3>> = {
  1: new THREE.Vector3(-14.80, 1.7,  19.81), // spawn / túnel de entrada
  2: new THREE.Vector3(  0.97, 1.7, -14.00), // pasillo central, pasada puerta-red-interna
  3: new THREE.Vector3( 19.00, 1.7, -13.46), // sala crítica, pasada puerta-critica
};

// Barriers to pre-open when restoring to a given stage (all barriers from prior stages).
const STAGE_PREREQ_DOORS: Readonly<Record<number, readonly string[]>> = {
  2: ['puerta-clientes', 'puerta-soporte', 'puerta-red-interna'],
  3: ['puerta-clientes', 'puerta-soporte', 'puerta-red-interna', 'puerta-shares', 'puerta-dc', 'puerta-critica'],
};

export class SceneManager {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly timer: THREE.Timer;
  private readonly worldBuilder: WorldBuilder;
  private readonly playerController: PlayerController;
  private readonly interactionManager: InteractionManager;
  private readonly terminalUI: TerminalUI | ChoiceUI;
  private readonly narrativeScreen: NarrativeScreen | null;
  private readonly audioManager: AudioManager;
  private readonly antivirusAgent: AntivirusAgent;
  private animationFrameId: number | null = null;
  private isPaused = false;
  private devPanel: DevPanel | null = null;
  private readonly evasionItems: EvasionItemManager;

  private gameOverHandler = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private gameWonHandler = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private gamePausedHandler = (): void => {
    this.isPaused = true;
    GameStateManager.getInstance().setPaused(true);
  };

  private gameResumedHandler = (): void => {
    this.isPaused = false;
    GameStateManager.getInstance().setPaused(false);
  };

  private levelSpawnReadyHandler = (event: Event): void => {
    const save = SaveManager.load();
    if (save !== null && save.stage > 1) {
      // Restore from checkpoint: pre-open prior-stage barriers, teleport, activate antivirus
      for (const doorId of STAGE_PREREQ_DOORS[save.stage] ?? []) {
        this.worldBuilder.openDoor(doorId);
      }
      this.playerController.teleportTo(STAGE_SPAWNS[save.stage] ?? this.worldBuilder.getSpawnPoint());
      if (save.stage >= 2) this.antivirusAgent.activateStage2();
      if (save.stage >= 3) this.antivirusAgent.activateStage3();
    } else {
      const { x, y, z } = (event as CustomEvent<{ x: number; y: number; z: number }>).detail;
      this.playerController.teleportTo(new THREE.Vector3(x, y, z));
    }
  };

  private readonly levelCompleteHandler = (event: Event): void => {
    const { level } = (event as CustomEvent<{ level: number }>).detail;
    if (level < 3) {
      SaveManager.save(level + 1, GameStateManager.getInstance().objectivesCompleted);
    }
    // Level 3 complete = encryption-key unlocked → AntivirusAgent handles chase via onLevelComplete
  };

  private gameCapturedHandler = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private allFilesEncryptedHandler = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private doorUnlockedHandler = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    this.worldBuilder.openDoor(poiId);
  };

  private resizeHandler = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171718);
    this.scene.fog = new THREE.Fog(0x171718, 12, 38);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 9);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.timer = new THREE.Timer();
    this.setupLights();

    this.worldBuilder = new WorldBuilder(this.scene);
    const { interactables, collidables } = this.worldBuilder.build();

    this.playerController = new PlayerController({
      camera: this.camera,
      domElement: this.renderer.domElement,
      scene: this.scene,
      interactables,
      collidables,
    });

    this.terminalUI = GameConfig.isVeryEasy
      ? new ChoiceUI(() => this.requestPointerLock())
      : new TerminalUI(() => this.requestPointerLock());
    this.interactionManager = new InteractionManager();
    this.narrativeScreen = isDevMode() ? null as any : new NarrativeScreen();
    this.audioManager = new AudioManager(this.camera);
    this.antivirusAgent = new AntivirusAgent(this.scene, this.camera, this.audioManager.audioListener);

    this.evasionItems = new EvasionItemManager(this.antivirusAgent);
    GameStateManager.getInstance();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('gameOver', this.gameOverHandler);
    window.addEventListener('gameWon', this.gameWonHandler);
    window.addEventListener('gameCaptured', this.gameCapturedHandler);
    window.addEventListener('allFilesEncrypted', this.allFilesEncryptedHandler);
    window.addEventListener('doorUnlocked', this.doorUnlockedHandler);
    window.addEventListener('gamePaused', this.gamePausedHandler);
    window.addEventListener('gameResumed', this.gameResumedHandler);
    window.addEventListener('levelSpawnReady', this.levelSpawnReadyHandler);
    window.addEventListener('levelComplete', this.levelCompleteHandler);

    this.playerController.teleportTo(this.worldBuilder.getSpawnPoint());

    if (isDevMode()) {
      GameStateManager.getInstance().setPaused(false);
      this.playerController.setFlyMode(true);
      this.playerController.setNoClip(true);
      setTimeout(() => this.requestPointerLock(), 250);
      this.devPanel = new DevPanel({
        teleport: (x, y, z) => {
          this.playerController.teleportTo(new THREE.Vector3(x, y, z));
        },
        toggleColliders: (ignore) => {
          this.playerController.setNoClip(ignore);
        },
        skipStage: () => {
          // Abre todas las puertas de etapa 1
          for (const doorId of STAGE_PREREQ_DOORS[2] ?? []) {
            this.worldBuilder.openDoor(doorId);
          }
          // Completa los objetivos de etapa 1; acceso-red-interna dispara levelComplete
          const gsm = GameStateManager.getInstance();
          gsm.completeObjective('dato-clientes');
          gsm.completeObjective('dato-soporte');
          gsm.completeObjective('acceso-red-interna');
          this.playerController.teleportTo(STAGE_SPAWNS[2] ?? this.worldBuilder.getSpawnPoint());
        },
        skipStage2: () => {
          for (const doorId of STAGE_PREREQ_DOORS[3] ?? []) {
            this.worldBuilder.openDoor(doorId);
          }
          const gsm = GameStateManager.getInstance();
          gsm.completeObjective('dato-clientes');
          gsm.completeObjective('dato-soporte');
          gsm.completeObjective('acceso-red-interna');
          gsm.completeObjective('network-map');
          gsm.completeObjective('admin-password');
          gsm.completeObjective('kerberos-ticket');
          gsm.completeObjective('cracked-password');
          gsm.completeObjective('acceso-dc');
          gsm.completeObjective('domain-admin-access');
          this.playerController.teleportTo(STAGE_SPAWNS[3] ?? this.worldBuilder.getSpawnPoint());
        },
      });
    }
  }

  public start(): void {
    if (this.animationFrameId !== null) return;
    this.animate();
  }

  public requestPointerLock(): void {
    this.playerController.requestLock();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('gameOver', this.gameOverHandler);
    window.removeEventListener('gameWon', this.gameWonHandler);
    window.removeEventListener('gameCaptured', this.gameCapturedHandler);
    window.removeEventListener('allFilesEncrypted', this.allFilesEncryptedHandler);
    window.removeEventListener('doorUnlocked', this.doorUnlockedHandler);
    window.removeEventListener('gamePaused', this.gamePausedHandler);
    window.removeEventListener('gameResumed', this.gameResumedHandler);
    window.removeEventListener('levelSpawnReady', this.levelSpawnReadyHandler);
    window.removeEventListener('levelComplete', this.levelCompleteHandler);
    if (this.devPanel) this.devPanel.dispose();
    this.evasionItems.dispose();
    this.antivirusAgent.dispose();
    this.audioManager.dispose();
    this.playerController.dispose();
    this.interactionManager.dispose();
    this.terminalUI.dispose();
    if (this.narrativeScreen) this.narrativeScreen.dispose();
    this.worldBuilder.dispose();
    GameStateManager.getInstance().dispose();
    this.renderer.dispose();
  }

  private animate = (): void => {
    this.timer.update();

    if (!this.isPaused) {
      const deltaTime = this.timer.getDelta();
      this.playerController.update(deltaTime);
      this.worldBuilder.update(deltaTime);
      this.antivirusAgent.update(deltaTime);
      this.audioManager.update();
    }

    if (this.devPanel !== null) {
      const p = this.camera.position;
      this.devPanel.setPosition(p.x, p.y, p.z);
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };



  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x221f1a, 0.5));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const keyLight = new THREE.DirectionalLight(0xfff3d3, 1.1);
    keyLight.position.set(4, 16, -8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -44;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 100;
    this.scene.add(keyLight);
  }
}
