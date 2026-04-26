import { CommandEngine } from '../gameplay/CommandEngine';
import { GameStateManager } from '../core/GameStateManager';

export class TerminalUI {
  private readonly overlay: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly bodyEl: HTMLElement;
  private readonly inputEl: HTMLInputElement;
  private readonly commandEngine = new CommandEngine();
  private isVisible = false;
  private currentPoiId = '';

  public constructor() {
    const { overlay, title, body, input } = this.createElement();
    this.overlay = overlay;
    this.titleEl = title;
    this.bodyEl = body;
    this.inputEl = input;

    document.getElementById('app')!.appendChild(this.overlay);

    window.addEventListener('poiInteract', this.onPoiInteract);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public dispose(): void {
    window.removeEventListener('poiInteract', this.onPoiInteract);
    window.removeEventListener('keydown', this.onKeyDown);
    this.overlay.remove();
  }

  private open(poiId: string): void {
    this.currentPoiId = poiId;
    this.titleEl.textContent = poiId;
    this.bodyEl.innerHTML = '';
    this.isVisible = true;
    this.overlay.classList.add('visible');
    document.exitPointerLock();
    this.inputEl.focus();
  }

  private close(): void {
    this.isVisible = false;
    this.overlay.classList.remove('visible');
    this.inputEl.value = '';
  }

  private createElement(): {
    overlay: HTMLElement;
    title: HTMLElement;
    body: HTMLElement;
    input: HTMLInputElement;
  } {
    const overlay = document.createElement('div');
    overlay.id = 'terminal-overlay';

    const panel = document.createElement('div');
    panel.id = 'terminal-panel';

    // Header
    const header = document.createElement('div');
    header.id = 'terminal-header';

    const title = document.createElement('span');
    title.className = 'terminal-title';

    const closeHint = document.createElement('span');
    closeHint.className = 'terminal-close-hint';
    closeHint.textContent = '[ESC] cerrar';

    header.appendChild(title);
    header.appendChild(closeHint);

    // Body
    const body = document.createElement('div');
    body.id = 'terminal-body';

    // Footer
    const footer = document.createElement('div');
    footer.id = 'terminal-footer';

    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '>';

    const input = document.createElement('input');
    input.id = 'terminal-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;

    input.addEventListener('keydown', this.onInputKeyDown);

    footer.appendChild(prompt);
    footer.appendChild(input);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    overlay.appendChild(panel);

    return { overlay, title, body, input };
  }

  private appendLine(text: string, type?: 'success' | 'error'): void {
    const line = document.createElement('div');
    line.className = type !== undefined ? `terminal-line--${type}` : '';
    line.textContent = text;
    this.bodyEl.appendChild(line);
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }

  private appendLines(text: string, type?: 'success' | 'error'): void {
    for (const line of text.split('\n')) {
      this.appendLine(line, type);
    }
  }

  private readonly onPoiInteract = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    this.open(poiId);
    this.appendLine(`Conectado a: ${poiId}`);
    this.appendLine('Escribí un comando...');
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && this.isVisible) {
      this.close();
    }
  };

  private readonly onInputKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Enter') return;

    const value = this.inputEl.value.trim();
    if (value === '') return;

    this.appendLine(`> ${value}`);
    this.inputEl.value = '';
    event.stopPropagation();

    const result = this.commandEngine.process(value, this.currentPoiId);
    this.appendLines(result.feedback, result.success ? 'success' : 'error');

    if (result.objectiveId !== undefined) {
      GameStateManager.getInstance().completeObjective(result.objectiveId);
      window.dispatchEvent(new CustomEvent('commandSuccess'));
    } else if (!result.success) {
      window.dispatchEvent(new CustomEvent('commandFail'));
    }
  };
}
