import * as THREE from 'three';
import droneUrl from '../assets/models/drone.glb?url';
import { HolographicBarrier } from './HolographicBarrier';
import { FilePOI } from './FilePOI';


export class WorldBuilder {
  private readonly scene: THREE.Scene;
  private readonly modelRoots: THREE.Group[] = [];
  private readonly barriers = new Map<string, HolographicBarrier>();
  private readonly filePOIs: FilePOI[] = [];
  private spawnPoint = new THREE.Vector3(0, 1.7, 6);
  private drone: THREE.Group | null = null;
  private droneTime = 0;
  private droneBaseY = 3.5;

  public constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build(): { interactables: THREE.Object3D[]; collidables: THREE.Object3D[] } {
    const interactables: THREE.Object3D[] = [];
    const collidables: THREE.Object3D[] = [];

    void this.loadLevelModel(interactables, collidables);
    void this.loadDrone();
    this.createFilePOIs(interactables);

    return { interactables, collidables };
  }

  public getSpawnPoint(): THREE.Vector3 {
    return this.spawnPoint.clone();
  }

  public openDoor(poiId: string): void {
    this.barriers.get(poiId)?.open();
  }

  public update(deltaTime: number): void {
    for (const barrier of this.barriers.values()) {
      barrier.update(deltaTime);
    }

    if (this.drone !== null) {
      this.droneTime += deltaTime;
      this.drone.position.y = this.droneBaseY + Math.sin(this.droneTime * 1.4) * 0.12;
      this.drone.rotation.y += deltaTime * 0.4;
    }
  }

  public dispose(): void {
    for (const barrier of this.barriers.values()) {
      barrier.dispose();
    }
    this.barriers.clear();

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

    for (const poi of this.filePOIs) poi.dispose();
    this.filePOIs.length = 0;
  }

  private createFilePOIs(interactables: THREE.Object3D[]): void {
    const defs = [
      // Pasillo de entrada: terminal comprometida
      { poiId: 'terminal-entrada',       label: 'terminal.exe',         x: -11.00, z: 18.50, color: 0x00cc77, emissive: 0x002211 },
      // PCs interactuables
      { poiId: 'pc-1',                   label: 'PC Corporativa',       x: -14.83, z: 10.77, color: 0xcc8800, emissive: 0x221400 },
      { poiId: 'pc-2',                   label: 'Terminal Monitoreo',   x:   8.81, z:-33.06, color: 0xcc8800, emissive: 0x221400 },
      { poiId: 'pc-3',                   label: 'Consola de Red',       x: -15.71, z:-25.85, color: 0xcc8800, emissive: 0x221400 },
      { poiId: 'pc-4',                   label: 'Estación Seguridad',   x:  13.43, z:-12.43, color: 0xcc8800, emissive: 0x221400 },
      // Sala clientes
      { poiId: 'archivo-clientes',       label: 'notas_reunion.txt',    x: -30.23, z: 13.20, color: 0x4a90d9, emissive: 0x0a1a33 },
      // Sala soporte-it: archivo clave
      { poiId: 'archivo-soporte',        label: 'credenciales_vpn.txt', x: -31.27, z:  5.59, color: 0xd94a4a, emissive: 0x330a0a },
      // Sala soporte-it: distractores
      { poiId: 'archivo-procedimientos', label: 'procedimientos.md',    x: -29.20, z:  6.80, color: 0x7a8a3a, emissive: 0x121508 },
      { poiId: 'archivo-inventario',     label: 'inventario_hosts.csv', x: -31.80, z:  4.10, color: 0x3a7a8a, emissive: 0x081315 },
    ];
    for (const cfg of defs) {
      this.filePOIs.push(new FilePOI(this.scene, cfg, interactables));
    }
  }

  private async loadLevelModel(
    interactables: THREE.Object3D[],
    collidables: THREE.Object3D[],
  ): Promise<void> {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load('/scifi_scene/scene.gltf', resolve, undefined, reject);
      });

      const root = gltf.scene;
      root.name = 'level-scene';

      // El modelo viene con transforms anidados (Sketchfab_model × .fbx) que
      // resultan en escala efectiva ~0.023. Con scale=50 los cuartos quedan ~3 m de alto.
      root.scale.setScalar(50);

      // Centrar en XZ con el piso en Y=0
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

      this.createBarriers(interactables, collidables);

      this.spawnPoint.set(-14.80, 1.7, 19.81);

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

  private createBarriers(
    interactables: THREE.Object3D[],
    collidables: THREE.Object3D[],
  ): void {
    const doors: Array<{ x: number; z: number; rotY: number; poiId: string; width: number }> = [
      { x: -14.78, z:  15.25, rotY: 0,            poiId: 'puerta-clientes',    width: 6 },
      { x: -23.57, z:  12.01, rotY: Math.PI / 2,  poiId: 'puerta-soporte',     width: 6 },
      { x:   0.97, z: -11.96, rotY: 0,             poiId: 'puerta-red-interna', width: 6 },
    ];

    for (const d of doors) {
      const barrier = new HolographicBarrier(
        this.scene,
        new THREE.Vector3(d.x, 0, d.z),
        d.rotY,
        d.width,
        d.poiId,
        interactables,
        collidables,
      );
      this.barriers.set(d.poiId, barrier);
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
      this.drone.position.set(0.97, this.droneBaseY, -25.49);
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
