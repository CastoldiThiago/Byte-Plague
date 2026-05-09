export class InteractionManager {
  private readonly tooltip: HTMLElement;
  private activePoiId: string | null = null;
  private activePoiDistance = Number.POSITIVE_INFINITY;
  private readonly interactionRange = 2.4;

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
    hint.textContent = 'Acercate para interactuar';

    el.appendChild(name);
    el.appendChild(hint);
    return el;
  }

  private readonly onPoiFocus = (event: Event): void => {
    const { poiId, poiLabel, distance } = (event as CustomEvent<{ poiId: string; poiLabel?: string; distance: number }>).detail;
    this.activePoiId = poiId;
    this.activePoiDistance = distance;
    const nameElement = this.tooltip.querySelector('.poi-name') as HTMLElement | null;
    if (nameElement !== null) {
      nameElement.textContent = poiLabel ?? poiId;
    }
    this.refreshHint();
    this.tooltip.classList.add('visible');
  };

  private readonly onPoiBlur = (): void => {
    this.activePoiId = null;
    this.activePoiDistance = Number.POSITIVE_INFINITY;
    this.refreshHint();
    this.tooltip.classList.remove('visible');
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'KeyE') return;
    if (this.activePoiId === null) return;
    if (document.pointerLockElement === null) return;
    if (this.activePoiDistance > this.interactionRange) return;

    window.dispatchEvent(new CustomEvent('poiInteract', { detail: { poiId: this.activePoiId } }));
  };

  private refreshHint(): void {
    const hint = this.tooltip.querySelector('.poi-hint') as HTMLElement;
    hint.textContent = this.activePoiDistance <= this.interactionRange
      ? 'Presiona E para interactuar'
      : 'Acercate para interactuar';
  }
}
