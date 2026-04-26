export class GameStateManager {
  private static instance: GameStateManager | null = null;

  private _alertLevel = 0;
  private _currentLevel = 1;
  private _objectivesCompleted: string[] = [];
  private _timerSeconds = 120;
  private _timerIntervalId: number | null = null;
  private _isPaused = false;

  private static readonly LEVEL_OBJECTIVES: Readonly<Record<number, readonly string[]>> = {
    1: ['lab-terminal-01'],
    2: ['server-room-01', 'server-room-02'],
    3: ['mainframe-01', 'mainframe-02', 'mainframe-03'],
    4: ['boss-terminal-01', 'boss-terminal-02'],
  };

  private constructor() {
    this._timerIntervalId = window.setInterval(this.tickTimer, 1000);
    window.addEventListener('gameOver', this.stopTimer);
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

  public setPaused(paused: boolean): void { this._isPaused = paused; }

  private readonly tickTimer = (): void => {
    if (this._isPaused) return;
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
    if (this._isPaused) return;
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

    if (id.startsWith('cifrado-')) {
      window.dispatchEvent(new CustomEvent('archivoCifrado', { detail: { objectiveId: id } }));
    }

    const levelObjectives = GameStateManager.LEVEL_OBJECTIVES[this._currentLevel] ?? [];
    const allDone =
      levelObjectives.length > 0 &&
      levelObjectives.every(obj => this._objectivesCompleted.includes(obj));

    if (allDone) {
      window.dispatchEvent(
        new CustomEvent('levelComplete', { detail: { level: this._currentLevel } }),
      );
    }
  }

  public resetState(): void {
    this._alertLevel = 0;
    this._currentLevel = 1;
    this._objectivesCompleted = [];
    this._timerSeconds = 120;
    this._isPaused = false;
    this.stopTimer();
    this._timerIntervalId = window.setInterval(this.tickTimer, 1000);
  }
}
