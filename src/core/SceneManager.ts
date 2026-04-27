import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';
import { InteractionManager } from './InteractionManager';
import { TerminalUI } from '../ui/TerminalUI';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';
import { NarrativeScreen } from '../ui/NarrativeScreen';

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
  private readonly audioManager: AudioManager;
  private readonly interactables: THREE.Object3D[] = [];
  private readonly collidables: THREE.Object3D[] = [];
  private readonly doorMeshes = new Map<string, THREE.Mesh>();
  private readonly labelSprites: THREE.Sprite[] = [];
  private animationFrameId: number | null = null;

  private readonly onGameOver = (): void => {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  private readonly onDoorUnlocked = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    const door = this.doorMeshes.get(poiId);
    if (door === undefined) {
      return;
    }

    door.userData.openTarget = 1;
    door.userData.ignoreCollision = true;
  };

  public constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171718);
    this.scene.fog = new THREE.Fog(0x171718, 10, 55);

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
      collidables: this.collidables,
    });

    this.interactionManager = new InteractionManager();
    this.terminalUI = new TerminalUI();
    this.narrativeScreen = new NarrativeScreen();
    this.audioManager = new AudioManager(this.camera);

    GameStateManager.getInstance();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('gameOver', this.onGameOver);
    window.addEventListener('doorUnlocked', this.onDoorUnlocked);
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
    window.removeEventListener('doorUnlocked', this.onDoorUnlocked);
    this.audioManager.dispose();
    this.playerController.dispose();
    this.interactionManager.dispose();
    this.terminalUI.dispose();
    this.narrativeScreen.dispose();

    for (const sprite of this.labelSprites) {
      const material = sprite.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
      sprite.removeFromParent();
    }

    this.renderer.dispose();
  }

  private readonly animate = (): void => {
    this.timer.update();
    const deltaTime = this.timer.getDelta();

    this.playerController.update(deltaTime);
    this.updateDoors(deltaTime);
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
    const hemisphere = new THREE.HemisphereLight(0xf0f4ff, 0x221f1a, 0.5);
    this.scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff3d3, 1.1);
    keyLight.position.set(8, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 70;

    this.scene.add(keyLight);
  }

  private setupWorld(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: 0x2c2f36,
        roughness: 0.96,
        metalness: 0.04,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x6c7a89,
      roughness: 0.82,
      metalness: 0.08,
    });

    const makeWall = (x: number, z: number, w: number, h: number, d: number): void => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
      wall.position.set(x, h / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.collidables.push(wall);
    };

    const makeWallWithVerticalDoorGap = (
      x: number,
      zStart: number,
      zEnd: number,
      gapCenterZ: number,
      gapSize: number,
    ): void => {
      const gapStart = gapCenterZ - gapSize / 2;
      const gapEnd = gapCenterZ + gapSize / 2;

      const lowerLen = gapStart - zStart;
      if (lowerLen > 0.05) {
        makeWall(x, zStart + lowerLen / 2, 1, 3, lowerLen);
      }

      const upperLen = zEnd - gapEnd;
      if (upperLen > 0.05) {
        makeWall(x, gapEnd + upperLen / 2, 1, 3, upperLen);
      }
    };

    makeWall(0, -10, 20, 3, 1);
    makeWall(0, 10, 20, 3, 1);
    makeWall(-10, 0, 1, 3, 20);
    makeWallWithVerticalDoorGap(10, -10, 10, 4, 2.4);

    makeWallWithVerticalDoorGap(-3, -10, 10, 3.5, 2.4);
    makeWallWithVerticalDoorGap(4, -10, 6, -5.5, 2.4);

    const roomLightA = new THREE.PointLight(0xffb56b, 1.6, 14);
    roomLightA.position.set(-6, 2.6, 5);
    this.scene.add(roomLightA);

    const roomLightB = new THREE.PointLight(0x6bc8ff, 1.4, 14);
    roomLightB.position.set(0, 2.6, -5);
    this.scene.add(roomLightB);

    const roomLightC = new THREE.PointLight(0x98ff8a, 1.8, 14);
    roomLightC.position.set(7, 2.6, 4);
    this.scene.add(roomLightC);

    this.addRoomLabel('CLIENTES', -6.5, 6.3);
    this.addRoomLabel('SOPORTE IT', 1.2, -6.8);
    this.addRoomLabel('RED INTERNA', 7.8, 6.0);

    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.55,
      metalness: 0.12,
      emissive: 0x22190d,
    });

    const addDoorFrame = (x: number, z: number): void => {
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x4f5c6a,
        roughness: 0.72,
        metalness: 0.12,
      });

      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 1.6), frameMaterial);
      frameTop.position.set(x, 2.48, z);
      frameTop.castShadow = true;
      frameTop.receiveShadow = true;
      this.scene.add(frameTop);

      // Slight floor marker to make entrances readable in first-person.
      const threshold = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        new THREE.MeshBasicMaterial({ color: 0x203349, transparent: true, opacity: 0.55 }),
      );
      threshold.rotation.x = -Math.PI / 2;
      threshold.position.set(x, 0.02, z);
      this.scene.add(threshold);
    };

    const addDoor = (x: number, z: number, poiId: string, label: string, openDirection: 1 | -1): void => {
      // Doorways are on walls with constant X, so width must be on Z axis.
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.3, 1.4), doorMaterial.clone());
      door.position.set(x, 1.15, z);
      door.castShadow = true;
      door.receiveShadow = true;
      door.userData.interactive = true;
      door.userData.poiId = poiId;
      door.userData.poiLabel = label;
      door.userData.openDirection = openDirection;
      door.userData.openProgress = 0;
      door.userData.openTarget = 0;
      this.scene.add(door);
      this.interactables.push(door);
      this.collidables.push(door);
      this.doorMeshes.set(poiId, door);

      addDoorFrame(x, z);

      const labelSprite = this.createLabelSprite(label);
      labelSprite.position.set(x, 2.9, z - 0.95);
      this.scene.add(labelSprite);
      this.labelSprites.push(labelSprite);
    };

    addDoor(-3, 3.5, 'puerta-clientes', 'Clientes', -1);
    addDoor(4, -5.5, 'puerta-soporte', 'Soporte IT', 1);
    addDoor(9.9, 4, 'puerta-red-interna', 'Red Interna', -1);

    this.addRoomFiles();
  }

  private updateDoors(deltaTime: number): void {
    for (const door of this.doorMeshes.values()) {
      const target = Number(door.userData.openTarget ?? 0);
      const current = Number(door.userData.openProgress ?? 0);
      if (Math.abs(target - current) < 0.001) {
        continue;
      }

      const next = THREE.MathUtils.damp(current, target, 7, deltaTime);
      door.userData.openProgress = next;

      const direction = Number(door.userData.openDirection ?? 1);
      door.rotation.y = direction * next * (Math.PI / 2);
    }
  }

  private addRoomFiles(): void {
    const fileMaterialA = new THREE.MeshStandardMaterial({
      color: 0x9ad0ff,
      roughness: 0.65,
      metalness: 0.08,
      emissive: 0x0c1a30,
    });

    const fileMaterialB = new THREE.MeshStandardMaterial({
      color: 0xffd39a,
      roughness: 0.65,
      metalness: 0.08,
      emissive: 0x2a1508,
    });

    const fileMaterialC = new THREE.MeshStandardMaterial({
      color: 0xb4ff9a,
      roughness: 0.65,
      metalness: 0.08,
      emissive: 0x12250a,
    });

    const addFilePoi = (
      poiId: string,
      label: string,
      x: number,
      z: number,
      material: THREE.MeshStandardMaterial,
    ): void => {
      const file = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.55), material.clone());
      file.position.set(x, 0.9, z);
      file.castShadow = true;
      file.receiveShadow = true;
      file.userData.interactive = true;
      file.userData.poiId = poiId;
      file.userData.poiLabel = label;
      this.scene.add(file);
      this.interactables.push(file);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.35, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.88, metalness: 0.06 }),
      );
      base.position.set(x, 0.18, z);
      base.receiveShadow = true;
      this.scene.add(base);

      const labelSprite = this.createLabelSprite(label);
      labelSprite.position.set(x, 1.45, z);
      this.scene.add(labelSprite);
      this.labelSprites.push(labelSprite);
    };

    addFilePoi('archivo-clientes', 'clientes.db', -6.6, 4.9, fileMaterialA);
    addFilePoi('archivo-soporte', 'credenciales_vpn.txt', 1.3, -6.7, fileMaterialB);
    addFilePoi('archivo-red', 'network-map.json', 7.6, 5.4, fileMaterialC);
  }

  private addRoomLabel(text: string, x: number, z: number): void {
    const label = this.createLabelSprite(text);
    label.position.set(x, 2.65, z);
    label.scale.set(3.3, 0.82, 1);
    this.scene.add(label);
    this.labelSprites.push(label);
  }

  private createLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx !== null) {
      ctx.fillStyle = 'rgba(8, 14, 24, 0.72)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(155, 255, 79, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
      ctx.fillStyle = '#d9f7bf';
      ctx.font = '600 24px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 0.62, 1);
    return sprite;
  }
}
