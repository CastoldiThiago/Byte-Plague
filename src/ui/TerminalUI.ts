import { CommandEngine } from '../gameplay/CommandEngine';
import type { CommandResult } from '../gameplay/CommandEngine';
import { GameStateManager } from '../core/GameStateManager';

interface HistoryEntry {
  command: string;
  result: CommandResult;
}

const MAX_HISTORY = 5;

export class TerminalUI {
  private readonly panel: HTMLElement;
  private readonly panelTitle: HTMLElement;
  private readonly historyEl: HTMLElement;
  private readonly inputEl: HTMLInputElement;
  private readonly commandEngine = new CommandEngine();
  private readonly lockFn: () => void;
  private isOpen = false;
  private currentPoiId = '';
  private readonly history: HistoryEntry[] = [];

  public constructor(lockFn: () => void) {
    this.lockFn = lockFn;
    const built = this.buildPanel();
    this.panel = built.panel;
    this.panelTitle = built.title;
    this.historyEl = built.historyEl;
    this.inputEl = built.inputEl;

    this.inputEl.addEventListener('keydown', this.onInputKeyDown);
    window.addEventListener('poiInteract', this.onPoiInteract);

    document.getElementById('app')!.appendChild(this.panel);
  }

  public dispose(): void {
    window.removeEventListener('poiInteract', this.onPoiInteract);
    this.inputEl.removeEventListener('keydown', this.onInputKeyDown);
    this.panel.remove();
  }

  private buildPanel(): {
    panel: HTMLElement;
    title: HTMLElement;
    historyEl: HTMLElement;
    inputEl: HTMLInputElement;
  } {
    const panel = document.createElement('div');
    panel.id = 'terminal-panel';

    const header = document.createElement('div');
    header.id = 'terminal-header';

    const title = document.createElement('span');
    title.id = 'terminal-title';

    const escHint = document.createElement('span');
    escHint.id = 'terminal-esc-hint';
    escHint.textContent = '[ESC] cerrar';

    header.appendChild(title);
    header.appendChild(escHint);

    const historyEl = document.createElement('div');
    historyEl.id = 'terminal-history';

    const inputRow = document.createElement('div');
    inputRow.id = 'terminal-input-row';

    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '$';

    const inputEl = document.createElement('input');
    inputEl.id = 'terminal-input';
    inputEl.type = 'text';
    inputEl.autocomplete = 'off';
    inputEl.spellcheck = false;

    inputRow.appendChild(prompt);
    inputRow.appendChild(inputEl);

    panel.appendChild(header);
    panel.appendChild(historyEl);
    panel.appendChild(inputRow);

    return { panel, title, historyEl, inputEl };
  }

  private open(poiId: string): void {
    const scenario = this.commandEngine.getScenario(poiId);
    if (scenario === null) return;

    this.currentPoiId = poiId;
    this.panelTitle.textContent = scenario.label;
    this.inputEl.value = '';
    this.renderHistory();

    GameStateManager.getInstance().setTerminalOpen(true);
    document.exitPointerLock();

    this.isOpen = true;
    this.panel.classList.add('visible');
    requestAnimationFrame(() => this.inputEl.focus());
  }

  private close(): void {
    this.isOpen = false;
    this.panel.classList.remove('visible');
    this.currentPoiId = '';
    GameStateManager.getInstance().setTerminalOpen(false);
    this.lockFn();
  }

  private execute(): void {
    const raw = this.inputEl.value.trim();
    if (raw === '') return;

    this.inputEl.value = '';

    const result = this.commandEngine.process(
      raw,
      this.currentPoiId,
      GameStateManager.getInstance().objectivesCompleted,
    );

    if (this.history.length >= MAX_HISTORY) {
      this.history.shift();
    }
    this.history.push({ command: raw, result });
    this.renderHistory();

    if (result.objectiveId !== undefined) {
      GameStateManager.getInstance().completeObjective(result.objectiveId);
    }

    if (result.success) {
      window.dispatchEvent(new CustomEvent('doorUnlocked', { detail: { poiId: this.currentPoiId } }));
      window.dispatchEvent(new CustomEvent('commandSuccess'));
    } else {
      GameStateManager.getInstance().increaseAlert(10);
      window.dispatchEvent(new CustomEvent('commandFail'));
    }
  }

  private renderHistory(): void {
    this.historyEl.innerHTML = '';

    for (const entry of this.history) {
      const cmdLine = document.createElement('div');
      cmdLine.className = 'terminal-cmd';
      cmdLine.textContent = `> ${entry.command}`;
      this.historyEl.appendChild(cmdLine);

      const outputClass = entry.result.success ? 'terminal-output-ok' : 'terminal-output-err';
      for (const line of entry.result.feedback.split('\n')) {
        const el = document.createElement('div');
        el.className = `terminal-output ${outputClass}`;
        el.textContent = line;
        this.historyEl.appendChild(el);
      }

      if (entry.result.conclusion !== undefined) {
        const conc = document.createElement('div');
        conc.className = 'terminal-conclusion';
        conc.textContent = `// ${entry.result.conclusion}`;
        this.historyEl.appendChild(conc);
      }

      const spacer = document.createElement('div');
      spacer.className = 'terminal-spacer';
      this.historyEl.appendChild(spacer);
    }

    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  private readonly onPoiInteract = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    if (this.isOpen) {
      this.inputEl.focus();
      return;
    }
    this.open(poiId);
  };

  private readonly onInputKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.code === 'Enter') {
      event.stopPropagation();
      this.execute();
    }
  };
}
