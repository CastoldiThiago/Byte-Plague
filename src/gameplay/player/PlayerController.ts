import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

interface PlayerControllerOptions {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  scene: THREE.Scene;
  interactables: THREE.Object3D[];
  collidables: THREE.Object3D[];
}

interface FocusDetail {
  poiId: string;
  poiLabel?: string;
  distance: number;
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
  private readonly collidables: THREE.Object3D[];
  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly moveDirection = new THREE.Vector3();
  private readonly forwardDirection = new THREE.Vector3();
  private readonly rightDirection = new THREE.Vector3();
  private readonly colliderBox = new THREE.Box3();

  private readonly input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  private readonly moveSpeed = 6;
  private readonly playerRadius = 0.35;
  private currentTarget: THREE.Object3D | null = null;

  public constructor(options: PlayerControllerOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.interactables = options.interactables;
    this.collidables = options.collidables;

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
      this.computeMoveDirection(deltaTime);
      this.applyMovementWithCollision();
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
      if (this.currentTarget !== null) {
        this.currentTarget = null;
        window.dispatchEvent(new CustomEvent('poiBlur'));
      }
      return;
    }

    const firstInteractiveObject = this.findInteractiveAncestor(intersections[0].object);

    if (firstInteractiveObject === null) {
      if (this.currentTarget !== null) {
        this.currentTarget = null;
        window.dispatchEvent(new CustomEvent('poiBlur'));
      }
      return;
    }

    if (firstInteractiveObject === this.currentTarget) {
      return;
    }

    this.currentTarget = firstInteractiveObject;

    const poiId = String(this.currentTarget.userData.poiId ?? this.currentTarget.name ?? 'unknown-poi');
    const poiLabel = String(this.currentTarget.userData.poiLabel ?? poiId);
    const distance = this.camera.position.distanceTo(this.currentTarget.getWorldPosition(new THREE.Vector3()));
    window.dispatchEvent(new CustomEvent<FocusDetail>('poiFocus', { detail: { poiId, poiLabel, distance } }));
  }

  private computeMoveDirection(deltaTime: number): void {
    this.moveDirection.set(0, 0, 0);

    this.camera.getWorldDirection(this.forwardDirection);
    this.forwardDirection.y = 0;

    if (this.forwardDirection.lengthSq() < 1e-6) {
      return;
    }

    this.forwardDirection.normalize();
    this.rightDirection.crossVectors(this.forwardDirection, this.worldUp).normalize();

    if (this.input.forward) {
      this.moveDirection.add(this.forwardDirection);
    }

    if (this.input.backward) {
      this.moveDirection.sub(this.forwardDirection);
    }

    if (this.input.left) {
      this.moveDirection.sub(this.rightDirection);
    }

    if (this.input.right) {
      this.moveDirection.add(this.rightDirection);
    }

    if (this.moveDirection.lengthSq() === 0) {
      return;
    }

    this.moveDirection.normalize().multiplyScalar(this.moveSpeed * deltaTime);
  }

  private applyMovementWithCollision(): void {
    if (this.moveDirection.lengthSq() === 0) {
      return;
    }

    const playerPos = this.controls.object.position;
    const nextX = playerPos.x + this.moveDirection.x;

    if (!this.willCollide(nextX, playerPos.z)) {
      playerPos.x = nextX;
    }

    const nextZ = playerPos.z + this.moveDirection.z;

    if (!this.willCollide(playerPos.x, nextZ)) {
      playerPos.z = nextZ;
    }
  }

  private willCollide(x: number, z: number): boolean {
    for (const collider of this.collidables) {
      if (collider.userData.ignoreCollision === true) {
        continue;
      }

      this.colliderBox.setFromObject(collider);

      if (
        x > this.colliderBox.min.x - this.playerRadius
        && x < this.colliderBox.max.x + this.playerRadius
        && z > this.colliderBox.min.z - this.playerRadius
        && z < this.colliderBox.max.z + this.playerRadius
      ) {
        return true;
      }
    }

    return false;
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
