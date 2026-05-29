import * as THREE from 'three';
import terminalUrl from '../assets/models/scifi_terminal.glb?url';
import { createDotSprite, createFocusedLabel, disposeSprite } from './LabelSprite';

export interface TerminalPOIConfig {
  poiId: string;
  label: string;
  x: number;
  z: number;
  /** Rotation around Y axis in radians. 0 = facing +Z, Math.PI = facing -Z. */
  rotY?: number;
}

interface FocusDetail { poiId: string }

/** Desired max XZ extent of the terminal model (world units). */
const TARGET_WIDTH = 1.20;

export class TerminalPOI {
  private readonly poiId: string;
  private readonly scene: THREE.Scene;
  private readonly hitbox: THREE.Mesh;
  private readonly dotSprite: THREE.Sprite;
  private readonly labelSprite: THREE.Sprite;
  private terminalRoot: THREE.Group | null = null;
  private dotTime = 0;
  private focused = false;

  private readonly onFocus = (e: Event): void => {
    const id = (e as CustomEvent<FocusDetail>).detail?.poiId;
    this.setFocused(id === this.poiId);
  };

  private readonly onBlur = (): void => {
    this.setFocused(false);
  };

  public constructor(
    scene: THREE.Scene,
    config: TerminalPOIConfig,
    interactables: THREE.Object3D[],
  ) {
    const { poiId, label, x, z, rotY = 0 } = config;
    this.poiId = poiId;
    this.scene  = scene;

    // Invisible hitbox — visible=true keeps it raycastable, opacity=0 renders nothing
    this.hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.20, 1.80, 0.60),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.hitbox.position.set(x, 0.90, z);
    this.hitbox.rotation.y = rotY;
    this.hitbox.userData.interactive = true;
    this.hitbox.userData.poiId       = poiId;
    this.hitbox.userData.poiLabel    = label;
    scene.add(this.hitbox);
    interactables.push(this.hitbox);

    // Sprites — Y positions refined once model height is known
    this.dotSprite = createDotSprite();
    this.dotSprite.position.set(x, 2.10, z);
    scene.add(this.dotSprite);

    this.labelSprite = createFocusedLabel(label);
    this.labelSprite.position.set(x, 2.40, z);
    this.labelSprite.visible = false;
    scene.add(this.labelSprite);

    void this.loadTerminal(x, z, rotY);

    window.addEventListener('poiFocus', this.onFocus);
    window.addEventListener('poiBlur',  this.onBlur);
  }

  private async loadTerminal(worldX: number, worldZ: number, rotY: number): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(terminalUrl, resolve, undefined, reject);
      });

      const root = gltf.scene;

      // Normalize so max(width, depth) == TARGET_WIDTH
      const box0 = new THREE.Box3().setFromObject(root);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxXZ = Math.max(size0.x, size0.z);
      if (maxXZ > 0) root.scale.setScalar(TARGET_WIDTH / maxXZ);

      // Recompute bbox after scaling
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const modelHeight = box.max.y - box.min.y;

      // Center XZ, bottom flush with floor (y=0), apply rotation
      root.position.set(
        worldX - center.x,
        -box.min.y,
        worldZ - center.z,
      );
      root.rotation.y = rotY;

      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow    = true;
        child.receiveShadow = true;
      });

      this.scene.add(root);
      this.terminalRoot = root;

      // Move sprites above the actual model top
      const worldTop = modelHeight;
      this.dotSprite.position.y   = worldTop + 0.25;
      this.labelSprite.position.y = worldTop + 0.50;

    } catch (err) {
      console.warn('scifi_terminal.glb no se pudo cargar:', err);
    }
  }

  public update(deltaTime: number): void {
    if (this.focused) return;
    this.dotTime += deltaTime;
    (this.dotSprite.material as THREE.SpriteMaterial).opacity =
      0.60 + Math.sin(this.dotTime * 2.6) * 0.40;
  }

  private setFocused(value: boolean): void {
    if (this.focused === value) return;
    this.focused = value;
    this.dotSprite.visible   = !value;
    this.labelSprite.visible =  value;
  }

  public dispose(): void {
    window.removeEventListener('poiFocus', this.onFocus);
    window.removeEventListener('poiBlur',  this.onBlur);

    disposeSprite(this.dotSprite);
    disposeSprite(this.labelSprite);

    this.hitbox.geometry.dispose();
    (this.hitbox.material as THREE.Material).dispose();
    this.scene.remove(this.hitbox);

    if (this.terminalRoot !== null) {
      const seenMats = new Set<THREE.Material>();
      this.terminalRoot.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (!seenMats.has(m)) { seenMats.add(m); m.dispose(); }
        }
      });
      this.scene.remove(this.terminalRoot);
    }
  }
}
