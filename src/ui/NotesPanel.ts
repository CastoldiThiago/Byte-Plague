import { GameStateManager } from '../core/GameStateManager';

interface Objective {
  id: string;
  label: string;
  location?: string;
}

interface StageConfig {
  number: number;
  title: string;
  objectives: Objective[];
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    number: 1,
    title: 'ETAPA 1 — Infiltración',
    objectives: [
      { id: 'dato-clientes',      label: 'Mapear la red corporativa',       location: '→ PC del empleado (Documents)' },
      { id: 'dato-soporte',       label: 'Obtener credenciales de acceso',  location: '→ PC del empleado (Documents)' },
      { id: 'acceso-red-interna', label: 'Infiltrarse en la red interna',   location: '→ Barrera al fondo del túnel' },
    ],
  },
  {
    number: 2,
    title: 'ETAPA 2 — Escalada',
    objectives: [
      { id: 'network-map',         label: 'Reconocer la topología interna',     location: '→ Servidor compartido (izquierda)' },
      { id: 'admin-password',      label: 'Localizar credenciales de admin',    location: '→ Scripts en /IT_backups' },
      { id: 'cracked-password',    label: 'Comprometer cuenta de servicio',     location: '→ Terminal Kerberos (sala shares)' },
      { id: 'domain-admin-access', label: 'Escalar a administrador de dominio', location: '→ Sala hexagonal (norte)' },
    ],
  },
  {
    number: 3,
    title: 'ETAPA 3 — Cifrado',
    objectives: [
      { id: 'encryption-key', label: 'Generar clave RSA-2048', location: '→ Terminal en sala crítica (derecha)' },
    ],
  },
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
    window.addEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.addEventListener('levelComplete', this.onLevelComplete);
    document.getElementById('app')!.appendChild(this.panel);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.removeEventListener('levelComplete', this.onLevelComplete);
    this.panel.remove();
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
    const gsm = GameStateManager.getInstance();
    const completed = gsm.objectivesCompleted;
    const currentLevel = gsm.currentLevel;
    this.objectivesEl.innerHTML = '';

    for (const stage of STAGE_CONFIGS) {
      if (stage.number > currentLevel) break;

      const isActive = stage.number === currentLevel;
      const isDone   = stage.number < currentLevel;

      const stageEl = document.createElement('div');
      stageEl.className = 'notes-stage' + (isDone ? ' notes-stage--done' : ' notes-stage--active');

      const titleEl = document.createElement('div');
      titleEl.className = 'notes-stage-title';
      titleEl.textContent = (isDone ? '✓ ' : '') + stage.title;
      stageEl.appendChild(titleEl);

      if (isActive) {
        for (const obj of stage.objectives) {
          const done = completed.includes(obj.id);

          const item = document.createElement('div');
          item.className = done ? 'notes-obj notes-obj--done' : 'notes-obj';

          const mark = document.createElement('span');
          mark.className = 'notes-obj-mark';
          mark.textContent = done ? '✓' : '○';

          const content = document.createElement('div');
          content.className = 'notes-obj-content';

          const labelEl = document.createElement('span');
          labelEl.className = 'notes-obj-label';
          labelEl.textContent = obj.label;
          content.appendChild(labelEl);

          if (obj.location !== undefined && !done) {
            const locEl = document.createElement('span');
            locEl.className = 'notes-obj-location';
            locEl.textContent = obj.location;
            content.appendChild(locEl);
          }

          item.appendChild(mark);
          item.appendChild(content);
          stageEl.appendChild(item);
        }
      }

      this.objectivesEl.appendChild(stageEl);
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

  private readonly onObjectiveUnlocked = (): void => {
    this.renderObjectives();
  };

  private readonly onLevelComplete = (): void => {
    this.renderObjectives();
  };
}
