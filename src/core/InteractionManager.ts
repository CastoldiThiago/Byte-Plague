export class InteractionManager {
  private readonly tooltip: HTMLElement;
  private activePoiId: string | null = null;

  public constructor() {
    this.tooltip = this.createTooltip();
    document.getElementById('app')!.appendChild(this.tooltip);

    window.addEventListener('poiFocus', this.onPoiFocus);
    window.addEventListener('poiBlur', this.onPoiBlur);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public dispose(): void {
    window.removeEventListener('poiFocus', this.onPoiFocus);
    window.removeEventListener('poiBlur', this.onPoiBlur);
    window.removeEventListener('keydown', this.onKeyDown);
    this.tooltip.remove();
  }

  private createTooltip(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'poi-tooltip';

    const name = document.createElement('p');
    name.className = 'poi-name';

    const hint = document.createElement('p');
    hint.className = 'poi-hint';
    hint.textContent = 'Presioná E para interactuar';

    el.appendChild(name);
    el.appendChild(hint);
    return el;
  }

  private readonly onPoiFocus = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    this.activePoiId = poiId;
    (this.tooltip.querySelector('.poi-name') as HTMLElement).textContent = poiId;
    this.tooltip.classList.add('visible');
  };

  private readonly onPoiBlur = (): void => {
    this.activePoiId = null;
    this.tooltip.classList.remove('visible');
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'KeyE') return;
    if (this.activePoiId === null) return;
    if (document.pointerLockElement === null) return;

    window.dispatchEvent(new CustomEvent('poiInteract', { detail: { poiId: this.activePoiId } }));
  };
}
