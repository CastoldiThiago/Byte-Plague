import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';
import { InteractionManager } from './InteractionManager';
import { TerminalUI } from '../ui/TerminalUI';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';
import { NarrativeScreen } from '../ui/NarrativeScreen';
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
  private readonly narrativeScreen: NarrativeScreen;
  private readonly audioManager: AudioManager;
  private animationFrameId: number | null = null;
  private isPaused = false;

  private readonly onGameOver = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private readonly onGamePaused = (): void => {
    this.isPaused = true;
    GameStateManager.getInstance().setPaused(true);
  };

  private readonly onGameResumed = (): void => {
    this.isPaused = false;
    GameStateManager.getInstance().setPaused(false);
  };

  private readonly onDoorUnlocked = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    this.worldBuilder.openDoor(poiId);
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
    this.narrativeScreen = new NarrativeScreen();
    this.audioManager = new AudioManager(this.camera);

    GameStateManager.getInstance();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('gameOver', this.onGameOver);
    window.addEventListener('doorUnlocked', this.onDoorUnlocked);
    window.addEventListener('gamePaused', this.onGamePaused);
    window.addEventListener('gameResumed', this.onGameResumed);
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
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('gameOver', this.onGameOver);
    window.removeEventListener('doorUnlocked', this.onDoorUnlocked);
    window.removeEventListener('gamePaused', this.onGamePaused);
    window.removeEventListener('gameResumed', this.onGameResumed);
    this.audioManager.dispose();
    this.playerController.dispose();
    this.interactionManager.dispose();
    this.terminalUI.dispose();
    this.narrativeScreen.dispose();
    this.worldBuilder.dispose();
    this.renderer.dispose();
  }

  private readonly animate = (): void => {
    this.timer.update();

    if (!this.isPaused) {
      const deltaTime = this.timer.getDelta();
      this.playerController.update(deltaTime);
      this.worldBuilder.update(deltaTime);
      this.audioManager.update();
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private readonly onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x221f1a, 0.5));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const keyLight = new THREE.DirectionalLight(0xfff3d3, 1.1);
    keyLight.position.set(4, 16, -8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -44;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 100;
    this.scene.add(keyLight);
  }
}
