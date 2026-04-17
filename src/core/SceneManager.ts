import * as THREE from 'three';
import { PlayerController } from '../gameplay/player/PlayerController';

export class SceneManager {
  private readonly container: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock: THREE.Clock;
  private readonly playerController: PlayerController;
  private readonly interactables: THREE.Object3D[] = [];

  private animationFrameId: number | null = null;

  public constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e1a2d);
    this.scene.fog = new THREE.Fog(0x0e1a2d, 8, 45);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 1.7, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupWorld();

    this.playerController = new PlayerController({
      camera: this.camera,
      domElement: this.renderer.domElement,
      scene: this.scene,
      interactables: this.interactables,
    });

    window.addEventListener('resize', this.onResize);
  }

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.clock.start();
    this.animate();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.onResize);
    this.playerController.dispose();
    this.renderer.dispose();
  }

  private readonly animate = (): void => {
    const deltaTime = this.clock.getDelta();

    this.playerController.update(deltaTime);
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private readonly onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
  };

  private setupLights(): void {
    const hemisphere = new THREE.HemisphereLight(0x95b9ff, 0x1a2639, 0.6);
    this.scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff6d6, 1.1);
    keyLight.position.set(7, 12, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -18;
    keyLight.shadow.camera.right = 18;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;

    this.scene.add(keyLight);
  }

  private setupWorld(): void {
    const floorGeometry = new THREE.PlaneGeometry(80, 80);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x293241,
      roughness: 0.95,
      metalness: 0.05,
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5a80,
      roughness: 0.8,
      metalness: 0.1,
    });

    for (let i = 0; i < 10; i += 1) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), wallMaterial);
      block.position.set(-12 + i * 2.7, 1.5, -8);
      block.castShadow = true;
      block.receiveShadow = true;
      this.scene.add(block);
    }

    const poiMaterial = new THREE.MeshStandardMaterial({
      color: 0x9bff4f,
      emissive: 0x112200,
      roughness: 0.3,
      metalness: 0.2,
    });

    const poi = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), poiMaterial);
    poi.position.set(2, 1, -4);
    poi.castShadow = true;
    poi.userData.interactive = true;
    poi.userData.poiId = 'lab-terminal-01';

    this.scene.add(poi);
    this.interactables.push(poi);
  }
}
