import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';
import { InteractionManager } from './InteractionManager';
import { TerminalUI } from '../ui/TerminalUI';
import { GameStateManager } from './GameStateManager';
import { AntivirusAgent } from '../gameplay/AntivirusAgent';
import { AudioManager } from './AudioManager';
import { NarrativeScreen } from '../ui/NarrativeScreen';
import { GlitchMaterial } from '../shaders/GlitchMaterial';
import { DataParticles } from '../effects/DataParticles';

export class SceneManager {
  private readonly container: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly timer: THREE.Timer;
  private readonly playerController: PlayerController;
  private readonly interactionManager: InteractionManager;
  private readonly terminalUI: TerminalUI;
  private readonly narrativeScreen: NarrativeScreen;
  private readonly antivirusAgent: AntivirusAgent;
  private readonly audioManager: AudioManager;
  private readonly interactables: THREE.Object3D[] = [];
  private readonly obstacles: THREE.Object3D[] = [];

  private readonly archivoMeshes = new Map<string, THREE.Mesh>();
  private readonly glitchMaterials: GlitchMaterial[] = [];
  private readonly dataParticles: DataParticles;
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
    this.dataParticles = new DataParticles(this.scene);

    this.playerController = new PlayerController({
      camera: this.camera,
      domElement: this.renderer.domElement,
      scene: this.scene,
      interactables: this.interactables,
    });

    this.interactionManager = new InteractionManager();
    this.terminalUI = new TerminalUI();
    this.narrativeScreen = new NarrativeScreen();
    this.audioManager = new AudioManager(this.camera);
    this.antivirusAgent = new AntivirusAgent(this.scene, this.camera, this.obstacles, this.audioManager.audioListener);

    GameStateManager.getInstance();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('gameOver', this.onGameOver);
    window.addEventListener('archivoCifrado', this.onArchivoCifrado);
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
    window.removeEventListener('archivoCifrado', this.onArchivoCifrado);
    this.antivirusAgent.dispose();
    this.audioManager.dispose();
    this.playerController.dispose();
    this.interactionManager.dispose();
    this.terminalUI.dispose();
    this.narrativeScreen.dispose();
    this.dataParticles.dispose();
    for (const mat of this.glitchMaterials) mat.dispose();
    this.renderer.dispose();
  }

  private readonly animate = (): void => {
    this.timer.update();
    const deltaTime = this.timer.getDelta();
    const elapsed   = this.timer.getElapsed();

    this.playerController.update(deltaTime);
    this.antivirusAgent.update(deltaTime);
    this.audioManager.update();
    this.dataParticles.update(deltaTime);

    for (const mat of this.glitchMaterials) {
      mat.update(elapsed);
    }

    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private readonly onArchivoCifrado = (event: Event): void => {
    const { objectiveId } = (event as CustomEvent<{ objectiveId: string }>).detail;
    const poiId = objectiveId.replace('cifrado-', 'archivo-');
    const mesh = this.archivoMeshes.get(poiId);
    if (mesh === undefined) return;
    (mesh.material as THREE.Material).dispose();
    const glitchMat = new GlitchMaterial();
    mesh.material = glitchMat;
    this.glitchMaterials.push(glitchMat);
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

    // --- sala de archivos ---
    const archivoLight = new THREE.PointLight(0x00ff88, 2, 16);
    archivoLight.position.set(0, 4, -22);
    this.scene.add(archivoLight);

    const archivoXPositions = [-8, -4, 0, 4, 8];
    for (let i = 0; i < 5; i += 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x003322,
        roughness: 0.3,
        metalness: 0.2,
      });
      const poiId = `archivo-${i + 1}`;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      mesh.position.set(archivoXPositions[i]!, 0.5, -22);
      mesh.castShadow = true;
      mesh.userData.interactive = true;
      mesh.userData.poiId = poiId;
      this.scene.add(mesh);
      this.interactables.push(mesh);
      this.archivoMeshes.set(poiId, mesh);
    }
  }
}
