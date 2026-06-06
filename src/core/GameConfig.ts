export type Difficulty = 'very-easy' | 'easy' | 'normal' | 'hard';

export interface GameConfigData {
  virusName: string;
  targetCompany: string;
  difficulty: Difficulty;
}

const AUTOSTART_KEY = 'byteplague_autostart';

let _config: GameConfigData = {
  virusName: 'BYTE-PLAGUE',
  targetCompany: 'corp.internal',
  difficulty: 'normal',
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
