export type Difficulty = 'very-easy' | 'easy' | 'normal' | 'hard';
export type VolumeChannel = 'master' | 'music' | 'sfx';

export interface GameConfigData {
  virusName: string;
  targetCompany: string;
  difficulty: Difficulty;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

const AUTOSTART_KEY = 'byteplague_autostart';
const VOLUME_KEY = 'byteplague_volume';

function loadVolume(): Pick<GameConfigData, 'masterVolume' | 'musicVolume' | 'sfxVolume'> {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return { masterVolume: 1, musicVolume: 1, sfxVolume: 1 };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      masterVolume: typeof parsed.master === 'number' ? parsed.master : 1,
      musicVolume:  typeof parsed.music  === 'number' ? parsed.music  : 1,
      sfxVolume:    typeof parsed.sfx    === 'number' ? parsed.sfx    : 1,
    };
  } catch {
    return { masterVolume: 1, musicVolume: 1, sfxVolume: 1 };
  }
}

let _config: GameConfigData = {
  virusName: 'BYTE-PLAGUE',
  targetCompany: 'corp.internal',
  difficulty: 'normal',
  ...loadVolume(),
};

export const GameConfig = {
  get virusName():      string     { return _config.virusName; },
  get targetCompany():  string     { return _config.targetCompany; },
  get difficulty():     Difficulty { return _config.difficulty; },

  set(data: Partial<GameConfigData>): void {
    _config = { ..._config, ...data };
  },

  get isVeryEasy(): boolean { return _config.difficulty === 'very-easy'; },

  /** Multiplier applied to all stage timers. */
  get timerMultiplier(): number {
    if (_config.difficulty === 'very-easy') return 2.0;
    if (_config.difficulty === 'easy')      return 1.5;
    if (_config.difficulty === 'hard')      return 0.65;
    return 1.0;
  },

  /** Multiplier applied to antivirus rush/chase speed. */
  get antivirusSpeedMultiplier(): number {
    if (_config.difficulty === 'very-easy') return 0.45;
    if (_config.difficulty === 'easy')      return 0.65;
    if (_config.difficulty === 'hard')      return 1.35;
    return 1.0;
  },

  get masterVolume(): number { return _config.masterVolume; },
  get musicVolume():  number { return _config.musicVolume; },
  get sfxVolume():    number { return _config.sfxVolume; },

  /** Volumen efectivo de música = general × música. */
  get musicVolumeEffective(): number { return _config.masterVolume * _config.musicVolume; },

  /** Volumen efectivo de efectos = general × efectos. */
  get sfxVolumeEffective(): number { return _config.masterVolume * _config.sfxVolume; },

  /** Actualiza un canal de volumen (0-1) y lo persiste en localStorage. */
  setVolume(channel: VolumeChannel, value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    if (channel === 'master') _config.masterVolume = clamped;
    if (channel === 'music')  _config.musicVolume = clamped;
    if (channel === 'sfx')    _config.sfxVolume = clamped;
    localStorage.setItem(VOLUME_KEY, JSON.stringify({
      master: _config.masterVolume,
      music: _config.musicVolume,
      sfx: _config.sfxVolume,
    }));
  },

  /** Mark next page load to skip the start screen (used by Reintentar). */
  flagAutostart(): void {
    sessionStorage.setItem(AUTOSTART_KEY, '1');
  },

  /** Returns true if this load should skip the start screen, then clears the flag. */
  consumeAutostart(): boolean {
    if (sessionStorage.getItem(AUTOSTART_KEY) !== '1') return false;
    sessionStorage.removeItem(AUTOSTART_KEY);
    return true;
  },
};
