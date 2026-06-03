import * as THREE from 'three';
import { GameStateManager } from './GameStateManager';

// Place audio files in public/audio/ — missing files are silently skipped.
interface SoundConfig {
  readonly name: string;
  readonly url: string;
  readonly loop: boolean;
  readonly volume: number;
}

const SOUND_CONFIGS: readonly SoundConfig[] = [
  { name: 'ambient',         url: '/audio/ambient.mp3',         loop: true,  volume: 0.3 },
  { name: 'alert',           url: '/audio/alert.wav',           loop: true,  volume: 0   },
  { name: 'command_success', url: '/audio/command_success.wav', loop: false, volume: 0.8 },
  { name: 'command_fail',    url: '/audio/command_fail.mp3',    loop: false, volume: 0.8 },
];

export class AudioManager {
  public readonly audioListener: THREE.AudioListener;
  private readonly sounds = new Map<string, THREE.Audio>();

  public constructor(camera: THREE.PerspectiveCamera) {
    this.audioListener = new THREE.AudioListener();
    camera.add(this.audioListener);

    const loader = new THREE.AudioLoader();

    for (const config of SOUND_CONFIGS) {
      const sound = new THREE.Audio(this.audioListener);
      sound.setLoop(config.loop);
      sound.setVolume(config.volume);
      this.sounds.set(config.name, sound);

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

    // Browser blocks AudioContext until a user gesture — resume on first click.
    document.addEventListener('click', () => {
      void this.audioListener.context.resume();
    }, { once: true });
  }

  // Called each frame from SceneManager.animate() to scale alert volume with alertLevel.
  public update(): void {
    this.sounds.get('alert')?.setVolume(
      (GameStateManager.getInstance().alertLevel / 100) * 0.8,
    );
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
    this.sounds.get(name)?.setVolume(volume);
  }

  public dispose(): void {
    window.removeEventListener('commandSuccess', this.onCommandSuccess);
    window.removeEventListener('commandFail', this.onCommandFail);
    window.removeEventListener('gamePaused', this.onGamePaused);
    window.removeEventListener('gameResumed', this.onGameResumed);
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
}
