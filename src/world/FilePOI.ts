import * as THREE from 'three';
import { createLabelSprite, disposeLabelSprite } from './LabelSprite';

export interface FilePOIConfig {
  poiId: string;
  label: string;
  x: number;
  z: number;
  color: number;
  emissive: number;
}

export class FilePOI {
  private readonly labelSprite: THREE.Sprite;

  public constructor(
    scene: THREE.Scene,
    config: FilePOIConfig,
    interactables: THREE.Object3D[],
  ) {
    const { poiId, label, x, z, color, emissive } = config;

    const file = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.16, 0.55),
      new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.08, emissive }),
    );
    file.position.set(x, 0.9, z);
    file.castShadow = true;
    file.receiveShadow = true;
    file.userData.interactive = true;
    file.userData.poiId = poiId;
    file.userData.poiLabel = label;
    scene.add(file);
    interactables.push(file);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.88, metalness: 0.06 }),
    );
    base.position.set(x, 0.18, z);
    base.receiveShadow = true;
    scene.add(base);

    this.labelSprite = createLabelSprite(label);
    this.labelSprite.position.set(x, 1.45, z);
    scene.add(this.labelSprite);
  }

  public dispose(): void {
    disposeLabelSprite(this.labelSprite);
  }
}
