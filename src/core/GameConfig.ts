export type Difficulty = 'easy' | 'normal' | 'hard';

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

  /** Multiplier applied to all stage timers. */
  get timerMultiplier(): number {
    return _config.difficulty === 'easy' ? 1.5 : _config.difficulty === 'hard' ? 0.65 : 1.0;
  },

  /** Multiplier applied to antivirus rush/chase speed. */
  get antivirusSpeedMultiplier(): number {
    return _config.difficulty === 'easy' ? 0.65 : _config.difficulty === 'hard' ? 1.35 : 1.0;
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
