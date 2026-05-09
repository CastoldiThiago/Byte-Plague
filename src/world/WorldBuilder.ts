import * as THREE from 'three';
import droneUrl from '../assets/models/drone.glb?url';

export class WorldBuilder {
  private readonly scene: THREE.Scene;
  private readonly modelRoots: THREE.Group[] = [];
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
        loader.load('/scifi_scene/scene.gltf', resolve, undefined, reject);
      });

      const root = gltf.scene;
      root.name = 'level-scene';

      // El modelo viene con transforms anidados (Sketchfab_model × .fbx) que
      // resultan en escala efectiva ~0.023 — la escena entera mide ~6cm de alto.
      // Con scale=50 la altura de cada cuarto queda ~3 m, proporciones jugables.
      root.scale.setScalar(50);

      // Centrar el modelo en XZ con el piso en Y=0
      const rawBox = new THREE.Box3().setFromObject(root);
      const center = rawBox.getCenter(new THREE.Vector3());
      root.position.set(-center.x, -rawBox.min.y, -center.z);

      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          collidables.push(child);
        }
      });

      // Spawn en el centro de la escena a altura de ojos
      this.spawnPoint.set(0, 1.7, 0);

      window.dispatchEvent(
        new CustomEvent('levelSpawnReady', {
          detail: { x: this.spawnPoint.x, y: this.spawnPoint.y, z: this.spawnPoint.z },
        }),
      );

      this.scene.add(root);
      this.modelRoots.push(root);
    } catch (err) {
      console.warn('scifi_scene/scene.gltf no se pudo cargar:', err);
    }
  }

  private async loadDrone(): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(droneUrl, resolve, undefined, reject);
      });

      this.drone = gltf.scene;
      this.drone.position.set(3, 3.5, -5);
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
