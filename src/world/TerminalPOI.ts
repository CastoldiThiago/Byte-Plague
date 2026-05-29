import * as THREE from 'three';
import terminalUrl      from '../assets/models/scifi_terminal.glb?url';
import monitoringUrl    from '../assets/models/terminal.glb?url';
import { createDotSprite, createFocusedLabel, disposeSprite } from './LabelSprite';

const MODEL_URLS = {
  terminal:   terminalUrl,
  monitoring: monitoringUrl,
} as const;

export interface TerminalPOIConfig {
  poiId: string;
  label: string;
  x: number;
  z: number;
  /** Rotation around Y axis in radians. 0 = facing +Z, Math.PI = facing -Z. */
  rotY?: number;
  /** 3D model to use. Defaults to 'terminal' (scifi_terminal.glb). */
  model?: keyof typeof MODEL_URLS;
  /** Override the normalized max XZ size in world units. Defaults to TARGET_WIDTH (1.20). */
  targetWidth?: number;
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
    const { poiId, label, x, z, rotY = 0, model = 'terminal', targetWidth = TARGET_WIDTH } = config;
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

    void this.loadTerminal(x, z, rotY, MODEL_URLS[model], targetWidth);

    window.addEventListener('poiFocus', this.onFocus);
    window.addEventListener('poiBlur',  this.onBlur);
  }

  private async loadTerminal(worldX: number, worldZ: number, rotY: number, url: string, targetWidth: number): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });

      const root = gltf.scene;

      // Reset any built-in position offset from the GLB before computing bounds
      root.position.set(0, 0, 0);

      // Normalize so max(width, depth) == targetWidth
      const box0 = new THREE.Box3().setFromObject(root);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxXZ = Math.max(size0.x, size0.z);
      if (maxXZ > 0) root.scale.setScalar(targetWidth / maxXZ);

      // Compute bbox BEFORE rotation to get stable center and floor offset
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());

      // Wrap in a pivot group so rotation happens around the visual center,
      // not around the GLB's internal pivot (which is often off-center).
      const pivot = new THREE.Group();
      pivot.position.set(worldX, -box.min.y, worldZ);
      pivot.rotation.y = rotY;

      // Offset root inside pivot so its bbox center sits at pivot's origin
      root.position.set(-center.x, 0, -center.z);
      pivot.add(root);

      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow    = true;
        child.receiveShadow = true;
      });

      this.scene.add(pivot);
      this.terminalRoot = pivot;

      // Hitbox and sprites at the pivot's world position (stable regardless of rotY)
      const modelHeight = box.max.y - box.min.y;
      const worldTop    = -box.min.y + modelHeight;
      const spriteY     = Math.min(worldTop, 2.20);

      this.hitbox.position.set(worldX, worldTop / 2, worldZ);
      this.dotSprite.position.set(worldX,  spriteY + 0.20, worldZ);
      this.labelSprite.position.set(worldX, spriteY + 0.45, worldZ);

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
