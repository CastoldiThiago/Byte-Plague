import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

interface PlayerControllerOptions {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  scene: THREE.Scene;
  interactables: THREE.Object3D[];
}

interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export class PlayerController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: PointerLockControls;
  private readonly domElement: HTMLElement;
  private readonly raycaster: THREE.Raycaster;
  private readonly rayOrigin: THREE.Vector2;
  private readonly interactables: THREE.Object3D[];

  private readonly input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  private readonly moveSpeed = 6;
  private currentTarget: THREE.Object3D | null = null;

  public constructor(options: PlayerControllerOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.interactables = options.interactables;

    this.controls = new PointerLockControls(this.camera, this.domElement);
    options.scene.add(this.controls.object);

    this.raycaster = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector2(0, 0);

    this.domElement.addEventListener('click', this.onRequestLock);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public update(deltaTime: number): void {
    if (this.controls.isLocked) {
      const distance = this.moveSpeed * deltaTime;

      if (this.input.forward) {
        this.controls.moveForward(distance);
      }

      if (this.input.backward) {
        this.controls.moveForward(-distance);
      }

      if (this.input.left) {
        this.controls.moveRight(-distance);
      }

      if (this.input.right) {
        this.controls.moveRight(distance);
      }
    }

    this.updateRaycastTarget();
  }

  public dispose(): void {
    this.domElement.removeEventListener('click', this.onRequestLock);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.controls.disconnect();
  }

  private readonly onRequestLock = (): void => {
    this.controls.lock();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
        this.input.forward = true;
        break;
      case 'KeyS':
        this.input.backward = true;
        break;
      case 'KeyA':
        this.input.left = true;
        break;
      case 'KeyD':
        this.input.right = true;
        break;
      default:
        break;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
        this.input.forward = false;
        break;
      case 'KeyS':
        this.input.backward = false;
        break;
      case 'KeyA':
        this.input.left = false;
        break;
      case 'KeyD':
        this.input.right = false;
        break;
      default:
        break;
    }
  };

  private updateRaycastTarget(): void {
    this.raycaster.setFromCamera(this.rayOrigin, this.camera);

    const intersections = this.raycaster.intersectObjects(this.interactables, true);

    if (intersections.length === 0) {
      this.currentTarget = null;
      return;
    }

    const firstInteractiveObject = this.findInteractiveAncestor(intersections[0].object);

    if (firstInteractiveObject === null || firstInteractiveObject === this.currentTarget) {
      return;
    }

    this.currentTarget = firstInteractiveObject;

    const poiId = String(this.currentTarget.userData.poiId ?? this.currentTarget.name ?? 'unknown-poi');
    console.log(`[Raycaster] Apuntando a POI: ${poiId}`);
  }

  private findInteractiveAncestor(object: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = object;

    while (current !== null) {
      if (current.userData.interactive === true) {
        return current;
      }

      current = current.parent;
    }

    return null;
  }
}
