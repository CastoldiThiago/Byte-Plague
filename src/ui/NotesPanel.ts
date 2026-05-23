import { GameStateManager } from '../core/GameStateManager';

interface Objective {
  id: string;
  label: string;
}

// Objetivos vagos: orientan sin decir exactamente qué hacer ni dónde
const LEVEL1_OBJECTIVES: Objective[] = [
  { id: 'dato-clientes',      label: 'Mapear la red corporativa' },
  { id: 'dato-soporte',       label: 'Obtener credenciales de acceso' },
  { id: 'acceso-red-interna', label: 'Infiltrarse en la red interna' },
];

export class NotesPanel {
  private readonly panel: HTMLElement;
  private readonly objectivesEl: HTMLElement;
  private visible = true;

  public constructor() {
    const built = this.buildPanel();
    this.panel = built.panel;
    this.objectivesEl = built.objectivesEl;

    this.renderObjectives();
    this.panel.classList.add('visible');

    window.addEventListener('keydown', this.onKeyDown);
    document.getElementById('app')!.appendChild(this.panel);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.panel.remove();
  }

  public refreshObjectives(): void {
    this.renderObjectives();
  }

  private show(): void {
    this.visible = true;
    this.panel.classList.add('visible');
  }

  private hide(): void {
    this.visible = false;
    this.panel.classList.remove('visible');
  }

  private toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  private renderObjectives(): void {
    const completed = GameStateManager.getInstance().objectivesCompleted;
    this.objectivesEl.innerHTML = '';

    for (const obj of LEVEL1_OBJECTIVES) {
      const done = completed.includes(obj.id);

      const item = document.createElement('div');
      item.className = done ? 'notes-obj notes-obj--done' : 'notes-obj';

      const mark = document.createElement('span');
      mark.className = 'notes-obj-mark';
      mark.textContent = done ? '✓' : '○';

      const lbl = document.createElement('span');
      lbl.textContent = obj.label;

      item.appendChild(mark);
      item.appendChild(lbl);
      this.objectivesEl.appendChild(item);
    }
  }

  private buildPanel(): { panel: HTMLElement; objectivesEl: HTMLElement } {
    const panel = document.createElement('div');
    panel.id = 'notes-panel';

    const header = document.createElement('div');
    header.id = 'notes-header';

    const title = document.createElement('span');
    title.textContent = '> OBJETIVOS';

    const hint = document.createElement('span');
    hint.id = 'notes-header-hint';
    hint.textContent = '[N]';

    header.appendChild(title);
    header.appendChild(hint);

    const objectivesEl = document.createElement('div');
    objectivesEl.id = 'notes-objectives';

    panel.appendChild(header);
    panel.appendChild(objectivesEl);

    return { panel, objectivesEl };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (GameStateManager.getInstance().terminalOpen) return;
    if (event.code === 'KeyN') this.toggle();
  };
}
