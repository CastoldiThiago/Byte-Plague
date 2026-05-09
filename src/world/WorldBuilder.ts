import * as THREE from 'three';
import droneUrl from '../assets/models/drone.glb?url';
import sceneUrl from '../assets/models/Scene.glb?url';

// El nivel ahora se define por `Scene.glb`.

export class WorldBuilder {
  private readonly scene: THREE.Scene;
  private readonly modelRoots: THREE.Group[] = [];
  private readonly colliderHelpers: THREE.Mesh[] = [];
  private readonly collidableProxies: THREE.Mesh[] = [];
  private spawnPoint = new THREE.Vector3(0, 1.7, 6);
  private drone: THREE.Group | null = null;
  private droneTime = 0;

  public constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build(): { interactables: THREE.Object3D[]; collidables: THREE.Object3D[] } {
    const interactables: THREE.Object3D[] = [];
    const collidables: THREE.Object3D[] = [];

    void this.loadLevelModel(collidables);

    void this.loadDrone();

    return { interactables, collidables };
  }

  public getSpawnPoint(): THREE.Vector3 {
    return this.spawnPoint.clone();
  }

  public openDoor(poiId: string): void {
    void poiId;
  }

  public update(deltaTime: number): void {
    if (this.drone !== null) {
      this.droneTime += deltaTime;
      this.drone.position.y = 1.8 + Math.sin(this.droneTime * 1.4) * 0.12;
      this.drone.rotation.y += deltaTime * 0.4;
    }
  }

  public dispose(): void {
    for (const root of this.modelRoots) {
      this.scene.remove(root);
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) m.dispose();
        }
      });
    }
    this.modelRoots.length = 0;

    for (const h of this.colliderHelpers) {
      if (h.parent) h.parent.remove(h);
      h.geometry.dispose();
      const mats = Array.isArray(h.material) ? h.material : [h.material];
      for (const m of mats) m.dispose();
    }
    this.colliderHelpers.length = 0;

    for (const p of this.collidableProxies) {
      if (p.parent) p.parent.remove(p);
      p.geometry.dispose();
      const mats = Array.isArray(p.material) ? p.material : [p.material];
      for (const m of mats) m.dispose();
    }
    this.collidableProxies.length = 0;

    if (this.drone !== null) {
      this.scene.remove(this.drone);
      this.drone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) m.dispose();
        }
      });
      this.drone = null;
    }
  }

  private async loadLevelModel(collidables: THREE.Object3D[]): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(sceneUrl, resolve, undefined, reject);
      });

      const root = gltf.scene;
      root.name = 'level-scene';
      root.position.set(0, 0, 0);
      root.scale.setScalar(1);

      const tempBox = new THREE.Box3();
      const tempSize = new THREE.Vector3();

      // Prefer explicit collider nodes named with COL_ prefix.
      const colNodes: THREE.Mesh[] = [];
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (typeof child.name === 'string' && child.name.startsWith('COL_')) {
            colNodes.push(child);
          }
        }
      });

      if (colNodes.length > 0) {
        for (const mesh of colNodes) {
          mesh.userData.isCollider = true;
          collidables.push(mesh);

          const box = new THREE.Box3().setFromObject(mesh);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const helperGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
          const helperMat = new THREE.MeshBasicMaterial({ color: 0xff0044, wireframe: true });
          const helper = new THREE.Mesh(helperGeo, helperMat);
          helper.position.copy(center);
          helper.visible = false;
          this.scene.add(helper);
          this.colliderHelpers.push(helper);
        }
      } else {
        // Fallback: proxy boxes for large meshes
        root.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            tempBox.setFromObject(child);
            tempBox.getSize(tempSize);
            if (tempSize.y > 0.6) {
              const center = new THREE.Vector3();
              tempBox.getCenter(center);

              const geo = new THREE.BoxGeometry(tempSize.x + 0.2, tempSize.y + 0.2, tempSize.z + 0.2);
              const mat = new THREE.MeshBasicMaterial({ visible: false });
              const proxy = new THREE.Mesh(geo, mat);
              proxy.position.copy(center);
              proxy.userData.isProxy = true;
              this.scene.add(proxy);
              collidables.push(proxy);
              this.collidableProxies.push(proxy);

              const helperGeo = new THREE.BoxGeometry(tempSize.x + 0.2, tempSize.y + 0.2, tempSize.z + 0.2);
              const helperMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });
              const helper = new THREE.Mesh(helperGeo, helperMat);
              helper.position.copy(center);
              helper.visible = false;
              this.scene.add(helper);
              this.colliderHelpers.push(helper);
            }
          }
        });
      }

      const levelBounds = new THREE.Box3().setFromObject(root);
      const spawnX = levelBounds.min.x + Math.min(2.5, Math.max(1.5, levelBounds.getSize(new THREE.Vector3()).x * 0.15));
      const spawnZ = levelBounds.min.z + Math.min(2.5, Math.max(1.5, levelBounds.getSize(new THREE.Vector3()).z * 0.15));
      this.spawnPoint.set(spawnX, 1.7, spawnZ);

      window.dispatchEvent(
        new CustomEvent('levelSpawnReady', {
          detail: { x: this.spawnPoint.x, y: this.spawnPoint.y, z: this.spawnPoint.z },
        }),
      );

      this.scene.add(root);
      this.modelRoots.push(root);
    } catch (err) {
      console.warn('Scene.glb no se pudo cargar:', err);
    }
  }

  public setShowColliderHelpers(show: boolean): void {
    for (const h of this.colliderHelpers) h.visible = show;
    for (const p of this.collidableProxies) p.visible = show;
  }

  private async loadDrone(): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(droneUrl, resolve, undefined, reject);
      });

      this.drone = gltf.scene;
      this.drone.position.set(0, 1.8, 5);
      this.drone.scale.setScalar(0.008);
      this.drone.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });
      this.scene.add(this.drone);
    } catch (err) {
      console.warn('drone.glb no se pudo cargar:', err);
    }
  }

}
