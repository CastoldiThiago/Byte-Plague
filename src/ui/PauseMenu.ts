import { GameConfig, type VolumeChannel } from '../core/GameConfig';

const VOLUME_SLIDERS: ReadonlyArray<{ channel: VolumeChannel; label: string }> = [
  { channel: 'master', label: 'VOLUMEN GENERAL' },
  { channel: 'music',  label: 'MÚSICA' },
  { channel: 'sfx',    label: 'EFECTOS' },
];

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

    const volumeBox = this.buildVolumeControls();

    const btn = document.createElement('button');
    btn.id = 'pause-menu-resume';
    btn.textContent = 'REANUDAR';
    // El click es un gesto nativo — requestPointerLock lo acepta directamente
    btn.addEventListener('click', () => this.lockFn());

    const homeBtn = document.createElement('button');
    homeBtn.id = 'pause-menu-home';
    homeBtn.textContent = 'VOLVER AL INICIO';
    homeBtn.addEventListener('click', () => {
      if (!window.confirm('¿Volver a la pantalla de inicio? Se perderá el progreso no guardado.')) return;
      window.location.reload();
    });

    box.appendChild(title);
    box.appendChild(volumeBox);
    box.appendChild(btn);
    box.appendChild(homeBtn);
    overlay.appendChild(box);
    return overlay;
  }

  private buildVolumeControls(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'pause-menu-volumes';

    for (const { channel, label } of VOLUME_SLIDERS) {
      const row = document.createElement('div');
      row.className = 'pause-menu-volume-row';

      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.htmlFor = `pause-volume-${channel}`;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = `pause-volume-${channel}`;
      slider.min = '0';
      slider.max = '100';
      slider.value = String(Math.round(GameConfig[`${channel}Volume`] * 100));

      slider.addEventListener('input', () => {
        const value = Number(slider.value) / 100;
        GameConfig.setVolume(channel, value);
        window.dispatchEvent(new CustomEvent('volumeChange', { detail: { channel, value } }));
      });

      row.appendChild(labelEl);
      row.appendChild(slider);
      container.appendChild(row);
    }

    return container;
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
