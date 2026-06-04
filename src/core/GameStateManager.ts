import { isDevMode } from './DevMode';
import { SaveManager } from './SaveManager';
import { GameConfig } from './GameConfig';

export class GameStateManager {
  private static instance: GameStateManager | null = null;

  private _alertLevel = 0;
  private _currentLevel = 1;
  private _objectivesCompleted: string[] = [];
  private _timerSeconds = 180;
  private _timerIntervalId: number | null = null;
  private _isPaused = false;
  private _terminalOpen = false;
  private _isChasing = false;

  // Seconds allotted per stage. Adjust here to tune difficulty.
  public static readonly STAGE_TIMERS: Readonly<Record<number, number>> = {
    1: 180, // 3 min — encontrar credenciales y acceder a la red interna
    2: 300, // 5 min — escalar privilegios
    3: 240, // 4 min — cifrar archivos críticos
  };

  private static readonly LEVEL_OBJECTIVES: Readonly<Record<number, readonly string[]>> = {
    1: ['acceso-red-interna'],
    2: ['domain-admin-access'],
    3: ['encryption-key'],
  };

  private constructor() {
    const mult = GameConfig.timerMultiplier;
    const save = SaveManager.load();
    if (save !== null) {
      this._currentLevel = save.stage;
      this._objectivesCompleted = [...save.objectives];
      this._timerSeconds = Math.round((GameStateManager.STAGE_TIMERS[save.stage] ?? 180) * mult);
    } else {
      this._timerSeconds = Math.round((GameStateManager.STAGE_TIMERS[this._currentLevel] ?? 180) * mult);
    }

    if (!isDevMode()) {
      this._timerIntervalId = window.setInterval(this.tickTimer, 1000);
    }
    window.addEventListener('gameOver', this.stopTimer);
  }

  public dispose(): void {
    this.stopTimer();
    window.removeEventListener('gameOver', this.stopTimer);
    GameStateManager.instance = null;
  }

  public static getInstance(): GameStateManager {
    GameStateManager.instance ??= new GameStateManager();
    return GameStateManager.instance;
  }

  public get alertLevel(): number { return this._alertLevel; }
  public get currentLevel(): number { return this._currentLevel; }
  public get objectivesCompleted(): readonly string[] { return this._objectivesCompleted; }
  public get timerSeconds(): number { return this._timerSeconds; }
  public get isPaused(): boolean { return this._isPaused; }
  public get terminalOpen(): boolean { return this._terminalOpen; }
  public get isChasing(): boolean { return this._isChasing; }
  public setTerminalOpen(value: boolean): void { this._terminalOpen = value; }

  /** Enters Stage 3 chase mode: suppresses alert/timer game-over; only playerCaught ends the game. */
  public startChase(): void {
    this._isChasing = true;
  }

  public setPaused(paused: boolean): void { this._isPaused = paused; }

  private readonly tickTimer = (): void => {
    if (this._isPaused || this._isChasing) return;
    this._timerSeconds -= 1;
    if (this._timerSeconds <= 0) {
      this._timerSeconds = 0;
      this.stopTimer();
      window.dispatchEvent(new CustomEvent('gameOver'));
    }
  };

  private readonly stopTimer = (): void => {
    if (this._timerIntervalId !== null) {
      clearInterval(this._timerIntervalId);
      this._timerIntervalId = null;
    }
  };

  public increaseAlert(amount: number): void {
    if (this._isPaused || this._isChasing) return;
    this._alertLevel = Math.min(100, this._alertLevel + amount);
    if (this._alertLevel >= 100) {
      window.dispatchEvent(new CustomEvent('gameOver'));
    }
  }

  public decreaseAlert(amount: number): void {
    this._alertLevel = Math.max(0, this._alertLevel - amount);
  }

  public completeObjective(id: string): void {
    if (this._objectivesCompleted.includes(id)) return;
    this._objectivesCompleted.push(id);
    window.dispatchEvent(new CustomEvent('objectiveUnlocked', { detail: { id } }));

    const levelObjectives = GameStateManager.LEVEL_OBJECTIVES[this._currentLevel] ?? [];
    const allDone =
      levelObjectives.length > 0 &&
      levelObjectives.every(obj => this._objectivesCompleted.includes(obj));

    if (allDone) {
      window.dispatchEvent(
        new CustomEvent('levelComplete', { detail: { level: this._currentLevel } }),
      );
      this._currentLevel++;
      // Etapa 3 completed → chase mode starts; timer is frozen via tickTimer guard
      if (this._currentLevel <= 3) {
        const mult = GameConfig.timerMultiplier;
        this._timerSeconds = Math.round((GameStateManager.STAGE_TIMERS[this._currentLevel] ?? 180) * mult);
      }
    }
  }

  public resetState(): void {
    this._alertLevel = 0;
    this._currentLevel = 1;
    this._objectivesCompleted = [];
    this._timerSeconds = GameStateManager.STAGE_TIMERS[1] ?? 180;
    this._isPaused = false;
    this.stopTimer();
    if (!isDevMode()) {
      this._timerIntervalId = window.setInterval(this.tickTimer, 1000);
    }
  }
}
