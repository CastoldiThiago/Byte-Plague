import * as THREE from 'three';
import { createFocusedLabel as createLabelSprite, disposeSprite as disposeLabelSprite } from './LabelSprite';

export interface DoorConfig {
  z: number;
  poiId: string;
  label: string;
  openDirection: 1 | -1;
}

export class Door {
  public readonly mesh: THREE.Mesh;
  private readonly labelSprite: THREE.Sprite;
  private readonly openDirection: 1 | -1;
  private openProgress = 0;
  private openTarget = 0;

  public constructor(
    scene: THREE.Scene,
    config: DoorConfig,
    interactables: THREE.Object3D[],
    collidables: THREE.Object3D[],
  ) {
    const { z, poiId, label, openDirection } = config;
    this.openDirection = openDirection;

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, roughness: 0.55, metalness: 0.12, emissive: 0x22190d,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4f5c6a, roughness: 0.72, metalness: 0.12 });

    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.25), doorMat);
    this.mesh.position.set(0, 1.15, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.interactive = true;
    this.mesh.userData.poiId = poiId;
    this.mesh.userData.poiLabel = label;
    scene.add(this.mesh);
    interactables.push(this.mesh);
    collidables.push(this.mesh);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.28), frameMat);
    frameTop.position.set(0, 2.48, z);
    frameTop.castShadow = true;
    scene.add(frameTop);

    const threshold = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x203349, transparent: true, opacity: 0.55 }),
    );
    threshold.rotation.x = -Math.PI / 2;
    threshold.position.set(0, 0.02, z);
    scene.add(threshold);

    this.labelSprite = createLabelSprite(label);
    this.labelSprite.position.set(0, 2.9, z + 1.1);
    scene.add(this.labelSprite);
  }

  public open(): void {
    this.openTarget = 1;
    this.mesh.userData.ignoreCollision = true;
  }

  public update(deltaTime: number): void {
    if (Math.abs(this.openTarget - this.openProgress) < 0.001) return;
    this.openProgress = THREE.MathUtils.damp(this.openProgress, this.openTarget, 7, deltaTime);
    this.mesh.rotation.y = this.openDirection * this.openProgress * (Math.PI / 2);
  }

  public dispose(): void {
    disposeLabelSprite(this.labelSprite);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
