import { GameStateManager } from '../core/GameStateManager';

export class HUDManager {
  private readonly alertFill: HTMLElement;
  private readonly alertStatus: HTMLElement;
  private readonly timerDisplay: HTMLElement;
  private readonly intervalId: number;

  public constructor(alertFill: HTMLElement, alertStatus: HTMLElement, timerDisplay: HTMLElement) {
    this.alertFill = alertFill;
    this.alertStatus = alertStatus;
    this.timerDisplay = timerDisplay;
    this.intervalId = window.setInterval(this.tick, 500);
  }

  public dispose(): void {
    clearInterval(this.intervalId);
  }

  private readonly tick = (): void => {
    const state = GameStateManager.getInstance();
    this.updateAlert(state.alertLevel);
    this.updateTimer(state.timerSeconds);
  };

  private updateAlert(level: number): void {
    const hue = Math.round(120 - (level / 100) * 120);
    this.alertFill.style.width = `${level}%`;
    this.alertFill.style.backgroundColor = `hsl(${hue}, 85%, 45%)`;

    if (level <= 30) {
      this.alertStatus.textContent = 'Presencia encubierta';
      this.alertStatus.style.color = '#9bff4f';
    } else if (level <= 70) {
      this.alertStatus.textContent = 'Actividad sospechosa';
      this.alertStatus.style.color = '#ffd166';
    } else {
      this.alertStatus.textContent = 'Antivirus en persecucion';
      this.alertStatus.style.color = '#ff6b6b';
    }
  }

  private updateTimer(secs: number): void {
    const min = Math.floor(secs / 60).toString().padStart(2, '0');
    const sec = (secs % 60).toString().padStart(2, '0');
    this.timerDisplay.textContent = `TIEMPO: ${min}:${sec}`;
    this.timerDisplay.style.color = secs <= 30 ? '#ff6b6b' : '#9bff4f';
  }
}
