export class PauseMenu {
  private readonly overlay: HTMLElement;
  private readonly lockFn: () => void;
  private shownAt = 0;

  public constructor(lockFn: () => void) {
    this.lockFn = lockFn;
    this.overlay = this.buildOverlay();
    document.getElementById('app')!.appendChild(this.overlay);

    window.addEventListener('gamePaused', this.onGamePaused);
    window.addEventListener('gameResumed', this.onGameResumed);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public dispose(): void {
    window.removeEventListener('gamePaused', this.onGamePaused);
    window.removeEventListener('gameResumed', this.onGameResumed);
    window.removeEventListener('keydown', this.onKeyDown);
    this.overlay.remove();
  }

  private buildOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'pause-menu';

    const box = document.createElement('div');
    box.id = 'pause-menu-box';

    const title = document.createElement('h2');
    title.id = 'pause-menu-title';
    title.textContent = 'PAUSADO';

    const btn = document.createElement('button');
    btn.id = 'pause-menu-resume';
    btn.textContent = 'REANUDAR';
    // El click es un gesto nativo — requestPointerLock lo acepta directamente
    btn.addEventListener('click', () => this.lockFn());

    box.appendChild(title);
    box.appendChild(btn);
    overlay.appendChild(box);
    return overlay;
  }

  private readonly onGamePaused = (): void => {
    this.shownAt = performance.now();
    this.overlay.classList.add('visible');
  };

  private readonly onGameResumed = (): void => {
    this.overlay.classList.remove('visible');
  };

  // ESC mientras el menú está visible también reanuda (keydown = gesto nativo válido)
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape') return;
    if (!this.overlay.classList.contains('visible')) return;
    // Guard: ignora el ESC que causó la pausa si llega antes que pointerlockchange
    if (performance.now() - this.shownAt < 250) return;
    this.lockFn();
  };
}
