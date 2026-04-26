export class GameStateManager {
  private static instance: GameStateManager | null = null;

  private _alertLevel = 0;
  private _currentLevel = 1;
  private _objectivesCompleted: string[] = [];

  // Objectives that must be completed to finish each level.
  private static readonly LEVEL_OBJECTIVES: Readonly<Record<number, readonly string[]>> = {
    1: ['lab-terminal-01'],
    2: ['server-room-01', 'server-room-02'],
    3: ['mainframe-01', 'mainframe-02', 'mainframe-03'],
    4: ['boss-terminal-01', 'boss-terminal-02'],
  };

  private constructor() {}

  public static getInstance(): GameStateManager {
    GameStateManager.instance ??= new GameStateManager();
    return GameStateManager.instance;
  }

  public get alertLevel(): number { return this._alertLevel; }
  public get currentLevel(): number { return this._currentLevel; }
  public get objectivesCompleted(): readonly string[] { return this._objectivesCompleted; }

  public increaseAlert(amount: number): void {
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
  }
}
