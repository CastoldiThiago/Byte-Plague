import * as THREE from 'three';
import folderUrl from '../assets/models/document_folder.glb?url';
import { createDotSprite, createFocusedLabel, disposeSprite } from './LabelSprite';

export interface FilePOIConfig {
  poiId: string;
  label: string;
  x: number;
  z: number;
  color: number;
  emissive: number;
}

interface FocusDetail { poiId: string }

const TARGET_WIDTH  = 0.70;
const FOLDER_BASE_Y = 0.36;

export class FilePOI {
  private readonly poiId: string;
  private readonly scene: THREE.Scene;
  private readonly hitbox: THREE.Mesh;
  private readonly pedestal: THREE.Mesh;
  private readonly dotSprite: THREE.Sprite;
  private readonly labelSprite: THREE.Sprite;
  private folderRoot: THREE.Group | null = null;
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
    config: FilePOIConfig,
    interactables: THREE.Object3D[],
  ) {
    const { poiId, label, x, z } = config;
    this.poiId = poiId;
    this.scene  = scene;

    // Invisible hitbox — visible=true so raycasting works, opacity=0 so nothing renders
    this.hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.65, 0.65),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    this.hitbox.position.set(x, FOLDER_BASE_Y + 0.32, z);
    this.hitbox.userData.interactive = true;
    this.hitbox.userData.poiId       = poiId;
    this.hitbox.userData.poiLabel    = label;
    scene.add(this.hitbox);
    interactables.push(this.hitbox);

    // Dark pedestal platform
    this.pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.88, metalness: 0.06 }),
    );
    this.pedestal.position.set(x, 0.18, z);
    this.pedestal.receiveShadow = true;
    scene.add(this.pedestal);

    // Sprites — Y refined once model height is known
    this.dotSprite = createDotSprite();
    this.dotSprite.position.set(x, 1.10, z);
    scene.add(this.dotSprite);

    this.labelSprite = createFocusedLabel(label);
    this.labelSprite.position.set(x, 1.36, z);
    this.labelSprite.visible = false;
    scene.add(this.labelSprite);

    void this.loadFolder(x, z);

    window.addEventListener('poiFocus', this.onFocus);
    window.addEventListener('poiBlur',  this.onBlur);
  }

  private async loadFolder(worldX: number, worldZ: number): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(folderUrl, resolve, undefined, reject);
      });

      const root = gltf.scene;

      // Reset any built-in position offset from the GLB before computing bounds
      root.position.set(0, 0, 0);

      // Normalize so max(width, depth) == TARGET_WIDTH
      const box0 = new THREE.Box3().setFromObject(root);
      const size0 = box0.getSize(new THREE.Vector3());
      const maxXZ = Math.max(size0.x, size0.z);
      if (maxXZ > 0) root.scale.setScalar(TARGET_WIDTH / maxXZ);

      // Recompute bbox after scaling
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const modelHeight = box.max.y - box.min.y;

      // Center XZ over pedestal, bottom at FOLDER_BASE_Y
      root.position.set(
        worldX - center.x,
        FOLDER_BASE_Y - box.min.y,
        worldZ - center.z,
      );

      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow   = true;
        child.receiveShadow = true;
      });

      this.scene.add(root);
      this.folderRoot = root;

      // Move sprites above the actual model top
      const worldTop = FOLDER_BASE_Y + modelHeight;
      this.dotSprite.position.y   = worldTop + 0.22;
      this.labelSprite.position.y = worldTop + 0.46;

    } catch (err) {
      console.warn('document_folder.glb no se pudo cargar:', err);
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

    this.pedestal.geometry.dispose();
    (this.pedestal.material as THREE.Material).dispose();
    this.scene.remove(this.pedestal);

    if (this.folderRoot !== null) {
      const seenMats = new Set<THREE.Material>();
      this.folderRoot.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (!seenMats.has(m)) { seenMats.add(m); m.dispose(); }
        }
      });
      this.scene.remove(this.folderRoot);
    }
  }
}
