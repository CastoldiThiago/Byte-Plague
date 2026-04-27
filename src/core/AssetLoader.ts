import * as THREE from 'three';

export interface AssetManifest {
  textures?: Record<string, string>;
  models?: Record<string, string>;
  audio?: Record<string, string>;
}

export interface LoadedAssets {
  textures: Map<string, THREE.Texture>;
  models: Map<string, THREE.Group>;
  audio: Map<string, AudioBuffer>;
}

type ProgressCallback = (loaded: number, total: number) => void;

// Centralizes loading of textures (AmbientCG), GLTF models (Sketchfab), and audio.
// Missing files are silently skipped so the game continues without the asset.
export class AssetLoader {
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly audioLoader = new THREE.AudioLoader();

  public async load(manifest: AssetManifest, onProgress?: ProgressCallback): Promise<LoadedAssets> {
    const textures = new Map<string, THREE.Texture>();
    const models = new Map<string, THREE.Group>();
    const audio = new Map<string, AudioBuffer>();

    type Entry =
      | { type: 'texture'; name: string; url: string }
      | { type: 'model';   name: string; url: string }
      | { type: 'audio';   name: string; url: string };

    const entries: Entry[] = [
      ...Object.entries(manifest.textures ?? {}).map(([name, url]) => ({ type: 'texture' as const, name, url })),
      ...Object.entries(manifest.models ?? {}).map(([name, url]) => ({ type: 'model' as const, name, url })),
      ...Object.entries(manifest.audio ?? {}).map(([name, url]) => ({ type: 'audio' as const, name, url })),
    ];

    let loaded = 0;
    const total = entries.length;

    await Promise.all(
      entries.map(async (entry) => {
        try {
          if (entry.type === 'texture') {
            textures.set(entry.name, await this.loadTexture(entry.url));
          } else if (entry.type === 'model') {
            models.set(entry.name, await this.loadGLTF(entry.url));
          } else {
            audio.set(entry.name, await this.loadAudio(entry.url));
          }
        } catch {
          // asset not found — game continues without it
        } finally {
          onProgress?.(++loaded, total);
        }
      }),
    );

    return { textures, models, audio };
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
  }

  private loadAudio(url: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(url, resolve, undefined, reject);
    });
  }

  private async loadGLTF(url: string): Promise<THREE.Group> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
}
