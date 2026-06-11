import * as THREE from 'three';
import { GameStateManager } from './GameStateManager';
import { GameConfig } from './GameConfig';

// Place audio files in public/audio/ — missing files are silently skipped.
interface SoundConfig {
  readonly name: string;
  readonly url: string;
  readonly loop: boolean;
  readonly volume: number;
  readonly category: 'music' | 'sfx';
}

const SOUND_CONFIGS: readonly SoundConfig[] = [
  { name: 'ambient',         url: '/audio/ambient.mp3',         loop: true,  volume: 0.3, category: 'music' },
  { name: 'alert',           url: '/audio/alert.wav',           loop: true,  volume: 0,   category: 'sfx'   },
  { name: 'command_success', url: '/audio/command_success.wav', loop: false, volume: 0.8, category: 'sfx'   },
  { name: 'command_fail',    url: '/audio/command_fail.mp3',    loop: false, volume: 0.8, category: 'sfx'   },
];

export class AudioManager {
  public readonly audioListener: THREE.AudioListener;
  private readonly sounds = new Map<string, THREE.Audio>();
  private readonly categories = new Map<string, 'music' | 'sfx'>();
  private readonly baseVolumes = new Map<string, number>();

  public constructor(camera: THREE.PerspectiveCamera) {
    this.audioListener = new THREE.AudioListener();
    camera.add(this.audioListener);

    const loader = new THREE.AudioLoader();

    for (const config of SOUND_CONFIGS) {
      const sound = new THREE.Audio(this.audioListener);
      sound.setLoop(config.loop);
      this.sounds.set(config.name, sound);
      this.categories.set(config.name, config.category);
      this.baseVolumes.set(config.name, config.volume);
      this.applyVolume(config.name);

      loader.load(
        config.url,
        (buffer) => {
          sound.setBuffer(buffer);
          if (config.loop) sound.play();
        },
        undefined,
        () => { /* audio file not found — game continues without this sound */ },
      );
    }

    window.addEventListener('commandSuccess', this.onCommandSuccess);
    window.addEventListener('commandFail', this.onCommandFail);
    window.addEventListener('gamePaused', this.onGamePaused);
    window.addEventListener('gameResumed', this.onGameResumed);
    window.addEventListener('volumeChange', this.onVolumeChange);

    // Browser blocks AudioContext until a user gesture — resume on first click.
    document.addEventListener('click', () => {
      void this.audioListener.context.resume();
    }, { once: true });
  }

  // Recomputes a sound's volume from its base volume × the configured master/category multiplier.
  private applyVolume(name: string): void {
    const sound = this.sounds.get(name);
    const base = this.baseVolumes.get(name) ?? 0;
    const multiplier = this.categories.get(name) === 'music'
      ? GameConfig.musicVolumeEffective
      : GameConfig.sfxVolumeEffective;
    sound?.setVolume(base * multiplier);
  }

  // Called each frame from SceneManager.animate() to scale alert volume with alertLevel.
  public update(): void {
    this.baseVolumes.set('alert', (GameStateManager.getInstance().alertLevel / 100) * 0.8);
    this.applyVolume('alert');
  }

  public play(name: string): void {
    const sound = this.sounds.get(name);
    if (sound === undefined || sound.buffer === null || sound.isPlaying) return;
    sound.play();
  }

  public stop(name: string): void {
    const sound = this.sounds.get(name);
    if (sound === undefined || !sound.isPlaying) return;
    sound.stop();
  }

  public setVolume(name: string, volume: number): void {
    this.baseVolumes.set(name, volume);
    this.applyVolume(name);
  }

  public dispose(): void {
    window.removeEventListener('commandSuccess', this.onCommandSuccess);
    window.removeEventListener('commandFail', this.onCommandFail);
    window.removeEventListener('gamePaused', this.onGamePaused);
    window.removeEventListener('gameResumed', this.onGameResumed);
    window.removeEventListener('volumeChange', this.onVolumeChange);
    for (const sound of this.sounds.values()) {
      if (sound.isPlaying) sound.stop();
    }
    this.sounds.clear();
    this.audioListener.removeFromParent();
  }

  private readonly onCommandSuccess = (): void => { this.play('command_success'); };
  private readonly onCommandFail    = (): void => { this.play('command_fail'); };
  private readonly onGamePaused     = (): void => { void this.audioListener.context.suspend(); };
  private readonly onGameResumed    = (): void => { void this.audioListener.context.resume(); };
  private readonly onVolumeChange   = (): void => {
    for (const name of this.sounds.keys()) this.applyVolume(name);
  };
}
