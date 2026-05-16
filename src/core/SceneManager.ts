import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';
import { InteractionManager } from './InteractionManager';
import { TerminalUI } from '../ui/TerminalUI';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';
import { NarrativeScreen } from '../ui/NarrativeScreen';
import { isDevMode } from './DevMode';
import { DevPanel } from '../ui/DevPanel';
import { WorldBuilder } from '../world/WorldBuilder';

export class SceneManager {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly timer: THREE.Timer;
  private readonly worldBuilder: WorldBuilder;
  private readonly playerController: PlayerController;
  private readonly interactionManager: InteractionManager;
  private readonly terminalUI: TerminalUI;
  private readonly narrativeScreen: NarrativeScreen | null;
  private readonly audioManager: AudioManager;
  private animationFrameId: number | null = null;
  private isPaused = false;
  private devPanel: DevPanel | null = null;

  private gameOverHandler = (): void => {
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
    const { x, y, z } = (event as CustomEvent<{ x: number; y: number; z: number }>).detail;
    this.playerController.teleportTo(new THREE.Vector3(x, y, z));
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

    // TerminalUI debe registrar su keydown ANTES que InteractionManager
    // para que stopImmediatePropagation() funcione al cerrar con E
    this.terminalUI = new TerminalUI();
    this.interactionManager = new InteractionManager();
    this.narrativeScreen = isDevMode() ? null as any : new NarrativeScreen();
    this.audioManager = new AudioManager(this.camera);

    GameStateManager.getInstance();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('gameOver', this.gameOverHandler);
    window.addEventListener('doorUnlocked', this.doorUnlockedHandler);
    window.addEventListener('gamePaused', this.gamePausedHandler);
    window.addEventListener('gameResumed', this.gameResumedHandler);
    window.addEventListener('levelSpawnReady', this.levelSpawnReadyHandler);

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
    window.removeEventListener('doorUnlocked', this.doorUnlockedHandler);
    window.removeEventListener('gamePaused', this.gamePausedHandler);
    window.removeEventListener('gameResumed', this.gameResumedHandler);
    window.removeEventListener('levelSpawnReady', this.levelSpawnReadyHandler);
    if (this.devPanel) this.devPanel.dispose();
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
