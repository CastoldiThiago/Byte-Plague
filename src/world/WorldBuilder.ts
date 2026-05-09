import * as THREE from 'three';
import { Door } from './Door';
import type { DoorConfig } from './Door';
import { FilePOI } from './FilePOI';
import type { FilePOIConfig } from './FilePOI';
import { createLabelSprite, disposeLabelSprite } from './LabelSprite';
import droneUrl from '../assets/models/drone.glb?url';

// Layout: 4 rooms in sequence along -Z. Corridor x=-6..6 (width 12).
// ENTRADA z=0..12 | CLIENTES z=-10..0 | SOPORTE z=-20..-10 | RED INTERNA z=-30..-20
// Dividing walls at z=0, -10, -20 with a 2-unit gap at center (x=-1..1).

interface RoomConfig {
  label: string;
  lightColor: number;
  lightZ: number;
}

const ROOMS: readonly RoomConfig[] = [
  { label: 'ENTRADA',     lightColor: 0xffb56b, lightZ: 6   },
  { label: 'CLIENTES',    lightColor: 0x6bc8ff, lightZ: -5  },
  { label: 'SOPORTE IT',  lightColor: 0xffd580, lightZ: -15 },
  { label: 'RED INTERNA', lightColor: 0x98ff8a, lightZ: -25 },
];

const DOOR_CONFIGS: readonly DoorConfig[] = [
  { z: 0,   poiId: 'puerta-clientes',    label: 'Clientes',    openDirection: 1  },
  { z: -10, poiId: 'puerta-soporte',     label: 'Soporte IT',  openDirection: -1 },
  { z: -20, poiId: 'puerta-red-interna', label: 'Red Interna', openDirection: 1  },
];

const FILE_POI_CONFIGS: readonly FilePOIConfig[] = [
  { poiId: 'archivo-clientes', label: 'clientes.db',          x: -2.5, z: -5,  color: 0x9ad0ff, emissive: 0x0c1a30 },
  { poiId: 'archivo-soporte',  label: 'credenciales_vpn.txt', x: -2.5, z: -15, color: 0xffd39a, emissive: 0x2a1508 },
  { poiId: 'archivo-red',      label: 'network-map.json',     x: -2.5, z: -25, color: 0xb4ff9a, emissive: 0x12250a },
];

export class WorldBuilder {
  private readonly scene: THREE.Scene;
  private readonly roomLabels: THREE.Sprite[] = [];
  private readonly doors = new Map<string, Door>();
  private readonly filePOIs: FilePOI[] = [];
  private drone: THREE.Group | null = null;
  private droneTime = 0;

  public constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build(): { interactables: THREE.Object3D[]; collidables: THREE.Object3D[] } {
    const interactables: THREE.Object3D[] = [];
    const collidables: THREE.Object3D[] = [];

    this.buildFloor();
    this.buildWalls(collidables);
    this.buildRooms();

    for (const config of DOOR_CONFIGS) {
      this.doors.set(config.poiId, new Door(this.scene, config, interactables, collidables));
    }

    for (const config of FILE_POI_CONFIGS) {
      this.filePOIs.push(new FilePOI(this.scene, config, interactables));
    }

    void this.loadDrone();

    return { interactables, collidables };
  }

  public openDoor(poiId: string): void {
    this.doors.get(poiId)?.open();
  }

  public update(deltaTime: number): void {
    for (const door of this.doors.values()) {
      door.update(deltaTime);
    }

    if (this.drone !== null) {
      this.droneTime += deltaTime;
      this.drone.position.y = 1.8 + Math.sin(this.droneTime * 1.4) * 0.12;
      this.drone.rotation.y += deltaTime * 0.4;
    }
  }

  public dispose(): void {
    for (const sprite of this.roomLabels) disposeLabelSprite(sprite);
    for (const door of this.doors.values()) door.dispose();
    for (const poi of this.filePOIs) poi.dispose();

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

  private buildFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 44),
      new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.96, metalness: 0.04 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -9);
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private buildWalls(collidables: THREE.Object3D[]): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6c7a89, roughness: 0.82, metalness: 0.08 });

    const addWall = (x: number, z: number, w: number, h: number, d: number): void => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, h / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      collidables.push(wall);
    };

    // Perimeter
    addWall(0,   12, 12, 3,  1);  // north
    addWall(0,  -30, 12, 3,  1);  // south
    addWall(-6,  -9,  1, 3, 44);  // west
    addWall( 6,  -9,  1, 3, 44);  // east

    // Interior dividers at each room boundary, gap at x=-1..1
    for (const z of [0, -10, -20]) {
      addWall(-3.5, z, 5, 3, 1);
      addWall( 3.5, z, 5, 3, 1);
    }
  }

  private buildRooms(): void {
    for (const room of ROOMS) {
      const light = new THREE.PointLight(room.lightColor, 1.6, 16);
      light.position.set(0, 2.6, room.lightZ);
      this.scene.add(light);

      const label = createLabelSprite(room.label);
      label.position.set(0, 2.65, room.lightZ);
      label.scale.set(3.3, 0.82, 1);
      this.scene.add(label);
      this.roomLabels.push(label);
    }
  }
}
