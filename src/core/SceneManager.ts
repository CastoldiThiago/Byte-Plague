import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';
import { InteractionManager } from './InteractionManager';
import { TerminalUI } from '../ui/TerminalUI';
import { GameStateManager } from './GameStateManager';
import { AntivirusAgent } from '../gameplay/AntivirusAgent';
import { AudioManager } from './AudioManager';

export class SceneManager {
  private readonly container: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly timer: THREE.Timer;
  private readonly playerController: PlayerController;
  private readonly interactionManager: InteractionManager;
  private readonly terminalUI: TerminalUI;
  private readonly antivirusAgent: AntivirusAgent;
  private readonly audioManager: AudioManager;
  private readonly interactables: THREE.Object3D[] = [];
  private readonly obstacles: THREE.Object3D[] = [];

  private animationFrameId: number | null = null;

  private readonly onGameOver = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  public constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1a2d);
    this.scene.fog = new THREE.Fog(0x0e1a2d, 8, 45);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 1.7, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    this.timer = new THREE.Timer();

    this.setupLights();
    this.setupWorld();

    this.playerController = new PlayerController({
      camera: this.camera,
      domElement: this.renderer.domElement,
      scene: this.scene,
      interactables: this.interactables,
    });

    this.interactionManager = new InteractionManager();
    this.terminalUI = new TerminalUI();
    this.audioManager = new AudioManager(this.camera);
    this.antivirusAgent = new AntivirusAgent(this.scene, this.camera, this.obstacles, this.audioManager.audioListener);

    GameStateManager.getInstance();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('gameOver', this.onGameOver);
  }

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animate();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('gameOver', this.onGameOver);
    this.antivirusAgent.dispose();
    this.audioManager.dispose();
    this.playerController.dispose();
    this.interactionManager.dispose();
    this.terminalUI.dispose();
    this.renderer.dispose();
  }

  private readonly animate = (): void => {
    this.timer.update();
    const deltaTime = this.timer.getDelta();

    this.playerController.update(deltaTime);
    this.antivirusAgent.update(deltaTime);
    this.audioManager.update();
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private readonly onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
  };

  private setupLights(): void {
    const hemisphere = new THREE.HemisphereLight(0x95b9ff, 0x1a2639, 0.6);
    this.scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff6d6, 1.1);
    keyLight.position.set(7, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;

    this.scene.add(keyLight);
  }

  private setupWorld(): void {
    const floorGeometry = new THREE.PlaneGeometry(80, 80);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x293241,
      roughness: 0.95,
      metalness: 0.05,
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.obstacles.push(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5a80,
      roughness: 0.8,
      metalness: 0.1,
    });

    for (let i = 0; i < 10; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), wallMaterial);
      block.position.set(-12 + i * 2.7, 1.5, -8);
      block.castShadow = true;
      block.receiveShadow = true;
      this.scene.add(block);
      this.obstacles.push(block);
    }

    const poiMaterial = new THREE.MeshStandardMaterial({
      color: 0x9bff4f,
      emissive: 0x112200,
      roughness: 0.3,
      metalness: 0.2,
    });

    const poi = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), poiMaterial);
    poi.position.set(2, 1, -4);
    poi.castShadow = true;
    poi.userData.interactive = true;
    poi.userData.poiId = 'lab-terminal-01';

    this.scene.add(poi);
    this.interactables.push(poi);

    // --- red interna: right-side network zone ---
    const networkBlockMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d1f3c,
      roughness: 0.7,
      metalness: 0.3,
    });

    for (const x of [16, 20, 24]) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), networkBlockMaterial);
      block.position.set(x, 1.5, -6);
      block.castShadow = true;
      block.receiveShadow = true;
      this.scene.add(block);
      this.obstacles.push(block);
    }

    const networkLight = new THREE.PointLight(0x0066ff, 2, 14);
    networkLight.position.set(20, 4, -3);
    this.scene.add(networkLight);

    const networkPoiMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x002244,
      roughness: 0.3,
      metalness: 0.4,
    });

    const networkPois = [
      { poiId: 'terminal-red-scan',    x: 16 },
      { poiId: 'terminal-ssh-connect', x: 24 },
    ];

    for (const def of networkPois) {
      const networkPoi = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), networkPoiMaterial);
      networkPoi.position.set(def.x, 1, -4);
      networkPoi.castShadow = true;
      networkPoi.userData.interactive = true;
      networkPoi.userData.poiId = def.poiId;
      this.scene.add(networkPoi);
      this.interactables.push(networkPoi);
    }
  }
}
