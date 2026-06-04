import type * as THREE from 'three';
import type { FilePOI } from '../world/FilePOI';
import { GlitchMaterial } from '../shaders/GlitchMaterial';

export const CRITICAL_FILE_IDS = [
  'archivo-critico-1',
  'archivo-critico-2',
  'archivo-critico-3',
  'archivo-critico-4',
  'archivo-critico-5',
  'archivo-critico-6',
  'archivo-critico-7',
  'archivo-critico-8',
] as const;

export const TOTAL_CRITICAL_FILES = CRITICAL_FILE_IDS.length;

interface CriticalFile {
  poi: FilePOI;
  encrypted: boolean;
  glitchMat: GlitchMaterial;
}

export class CriticalFileManager {
  private readonly files = new Map<string, CriticalFile>();
  private readonly interactables: THREE.Object3D[];
  private encryptionEnabled = false;
  private encryptedCount = 0;
  private glitchElapsed = 0;

  public constructor(interactables: THREE.Object3D[]) {
    this.interactables = interactables;
    window.addEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.addEventListener('poiInteract', this.onPoiInteract);
    window.addEventListener('playerCaught', this.onPlayerCaught);
  }

  public registerFile(poiId: string, poi: FilePOI): void {
    this.files.set(poiId, { poi, encrypted: false, glitchMat: new GlitchMaterial() });
  }

  public get count(): number { return this.encryptedCount; }
  public get total(): number { return TOTAL_CRITICAL_FILES; }

  public update(deltaTime: number): void {
    if (this.encryptedCount === 0) return;
    this.glitchElapsed += deltaTime;
    for (const f of this.files.values()) {
      if (f.encrypted) f.glitchMat.update(this.glitchElapsed);
    }
  }

  public dispose(): void {
    window.removeEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.removeEventListener('poiInteract', this.onPoiInteract);
    window.removeEventListener('playerCaught', this.onPlayerCaught);
    for (const f of this.files.values()) f.glitchMat.dispose();
    this.files.clear();
  }

  private readonly onObjectiveUnlocked = (e: Event): void => {
    const { id } = (e as CustomEvent<{ id: string }>).detail;
    if (id !== 'encryption-key') return;
    this.encryptionEnabled = true;
    window.dispatchEvent(new CustomEvent('encryptionEnabled'));
  };

  private readonly onPoiInteract = (e: Event): void => {
    if (!this.encryptionEnabled) return;
    const { poiId } = (e as CustomEvent<{ poiId: string }>).detail;
    const file = this.files.get(poiId);
    if (file === undefined || file.encrypted) return;

    file.encrypted = true;
    file.poi.encrypt(file.glitchMat);
    this.encryptedCount++;

    const hitbox = file.poi.hitboxMesh;
    const idx = this.interactables.indexOf(hitbox);
    if (idx !== -1) this.interactables.splice(idx, 1);

    window.dispatchEvent(new CustomEvent('fileEncrypted', {
      detail: { count: this.encryptedCount, total: TOTAL_CRITICAL_FILES },
    }));

    if (this.encryptedCount >= TOTAL_CRITICAL_FILES) {
      window.dispatchEvent(new CustomEvent('allFilesEncrypted', {
        detail: { count: this.encryptedCount, total: TOTAL_CRITICAL_FILES },
      }));
    }
  };

  private readonly onPlayerCaught = (): void => {
    window.dispatchEvent(new CustomEvent('gameCaptured', {
      detail: { count: this.encryptedCount, total: TOTAL_CRITICAL_FILES },
    }));
  };
}
