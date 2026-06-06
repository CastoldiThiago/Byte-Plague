import { CommandEngine } from '../gameplay/CommandEngine';
import type { CommandResult } from '../gameplay/CommandEngine';
import { GameStateManager } from '../core/GameStateManager';
import { VirtualFS } from '../core/VirtualFS';
import { NotesPanel } from './NotesPanel';
import type { Scenario } from '../types/game';

interface HistoryEntry {
  command: string;
  result: CommandResult;
  kind?: 'help';
}

const MAX_VISIBLE = 60;

export class TerminalUI {
  private readonly panel: HTMLElement;
  private readonly panelTitle: HTMLElement;
  private readonly historyEl: HTMLElement;
  private readonly inputEl: HTMLInputElement;
  private readonly promptEl: HTMLElement;
  private readonly commandEngine = new CommandEngine();
  private readonly vfs = VirtualFS.getInstance();
  private readonly notesPanel: NotesPanel;
  private readonly lockFn: () => void;

  private isOpen = false;
  private currentPoiId = '';
  private currentScenario: Scenario | null = null;

  /** Visible output entries */
  private readonly entries: HistoryEntry[] = [];

  /** Session command history for ↑↓ navigation */
  private readonly cmdHistory: string[] = [];
  private historyIdx = -1;
  private draftInput = '';

  /** Tab completion state */
  private tabCompletions: string[] = [];
  private tabIdx = 0;
  private lastTabInput = '';

  public constructor(lockFn: () => void) {
    this.lockFn = lockFn;
    const built = this.buildPanel();
    this.panel = built.panel;
    this.panelTitle = built.title;
    this.historyEl = built.historyEl;
    this.inputEl = built.inputEl;
    this.promptEl = built.promptEl;
    this.notesPanel = new NotesPanel();

    window.addEventListener('keydown', this.onGlobalKeyDown, { capture: true });
    window.addEventListener('mousedown', this.onGlobalMouseDown, { capture: true });
    this.inputEl.addEventListener('keydown', this.onInputKeyDown);
    window.addEventListener('poiInteract', this.onPoiInteract);

    document.getElementById('app')!.appendChild(this.panel);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onGlobalKeyDown, { capture: true });
    window.removeEventListener('mousedown', this.onGlobalMouseDown, { capture: true });
    this.inputEl.removeEventListener('keydown', this.onInputKeyDown);
    window.removeEventListener('poiInteract', this.onPoiInteract);
    this.notesPanel.dispose();
    this.panel.remove();
  }

  // ── Panel construction ───────────────────────────────────────────────

  private buildPanel(): {
    panel: HTMLElement;
    title: HTMLElement;
    historyEl: HTMLElement;
    inputEl: HTMLInputElement;
    promptEl: HTMLElement;
  } {
    const panel = document.createElement('div');
    panel.id = 'terminal-panel';

    const header = document.createElement('div');
    header.id = 'terminal-header';

    const title = document.createElement('span');
    title.id = 'terminal-title';

    const closeHint = document.createElement('span');
    closeHint.id = 'terminal-esc-hint';
    closeHint.textContent = '[°] cerrar';

    header.appendChild(title);
    header.appendChild(closeHint);

    const helpHint = document.createElement('div');
    helpHint.id = 'terminal-help-hint';
    helpHint.textContent = 'escribí /help para una pista';

    const historyEl = document.createElement('div');
    historyEl.id = 'terminal-history';

    const inputRow = document.createElement('div');
    inputRow.id = 'terminal-input-row';

    const promptEl = document.createElement('span');
    promptEl.className = 'terminal-prompt';
    promptEl.textContent = '$';

    const inputEl = document.createElement('input');
    inputEl.id = 'terminal-input';
    inputEl.type = 'text';
    inputEl.autocomplete = 'off';
    inputEl.spellcheck = false;

    inputRow.appendChild(promptEl);
    inputRow.appendChild(inputEl);

    panel.appendChild(header);
    panel.appendChild(helpHint);
    panel.appendChild(historyEl);
    panel.appendChild(inputRow);

    return { panel, title, historyEl, inputEl, promptEl };
  }

  // ── Open / close ─────────────────────────────────────────────────────

  private open(poiId: string): void {
    const scenario = this.commandEngine.getScenario(poiId);
    if (scenario === null) return;

    if (poiId !== this.currentPoiId) {
      this.currentPoiId = poiId;
      this.currentScenario = scenario;
    }

    // Sync VFS context: set cwd to this room's directory, cd permissions, and file restriction
    const restrictedFile = scenario.correctCommand.startsWith('cat ')
      ? scenario.correctCommand.slice(4).trim()
      : undefined;
    this.vfs.setContext(scenario.basePath, scenario.allowCd ?? false, restrictedFile);

    this.panelTitle.textContent = scenario.label;
    this.inputEl.value = '';
    this.updatePrompt();
    this.renderEntries();

    GameStateManager.getInstance().setTerminalOpen(true);
    document.exitPointerLock();

    this.isOpen = true;
    this.panel.classList.add('visible');
    requestAnimationFrame(() => this.inputEl.focus());
  }

  private close(): void {
    this.isOpen = false;
    this.panel.classList.remove('visible');
    GameStateManager.getInstance().setTerminalOpen(false);
    this.lockFn();
  }

  private updatePrompt(): void {
    this.promptEl.textContent = this.vfs.getPromptLabel() + '$';
  }

  // ── Command execution ────────────────────────────────────────────────

  private execute(): void {
    const raw = this.inputEl.value.trim();
    if (raw === '') return;

    this.inputEl.value = '';
    this.resetTab();

    // Push to session history (deduplicate consecutive identical)
    if (this.cmdHistory[0] !== raw) this.cmdHistory.unshift(raw);
    this.historyIdx = -1;
    this.draftInput = '';

    this.updatePrompt();

    // /help special case
    if (raw === '/help') {
      const lines: string[] = [];
      if (this.currentScenario?.hint !== undefined) {
        lines.push(`// ${this.currentScenario.hint}`);
        lines.push('');
      }
      lines.push(this.currentScenario?.helpText ?? 'Sin ayuda disponible.');
      this.pushEntry({ command: raw, result: { success: false, feedback: lines.join('\n') }, kind: 'help' });
      return;
    }

    const result = this.commandEngine.process(
      raw,
      this.currentPoiId,
      GameStateManager.getInstance().objectivesCompleted,
    );

    if (result.clear === true) {
      this.entries.length = 0;
      this.renderEntries();
      return;
    }

    this.pushEntry({ command: raw, result });

    if (result.success) {
      if (result.objectiveId !== undefined) {
        GameStateManager.getInstance().completeObjective(result.objectiveId);
        this.notesPanel.refreshObjectives();
      }
      if (SCENARIOS_HAS(this.currentPoiId, raw)) {
        // Advance VFS cwd to the room unlocked by this door
        const targetPath = this.currentScenario?.targetPath;
        if (targetPath !== undefined) this.vfs.setCwd(targetPath);
        window.dispatchEvent(new CustomEvent('doorUnlocked', { detail: { poiId: this.currentPoiId } }));
        window.dispatchEvent(new CustomEvent('commandSuccess'));
      } else if (SCENARIOS_HAS_SECOND(this.currentPoiId, raw)) {
        // Second command of a multi-step terminal
        if (result.unlocksDoor !== undefined) {
          window.dispatchEvent(new CustomEvent('doorUnlocked', { detail: { poiId: result.unlocksDoor } }));
        }
        window.dispatchEvent(new CustomEvent('commandSuccess'));
      }
    } else {
      // Raise alert only on narrative failure (wrong command at the POI's terminal)
      if (result.feedback.startsWith('[ERROR]')) {
        GameStateManager.getInstance().increaseAlert(10);
        window.dispatchEvent(new CustomEvent('commandFail'));
      }
      // VFS errors (permission denied, no such file, command not found) → no alert
    }

    this.updatePrompt();
  }

  // ── Rendering ────────────────────────────────────────────────────────

  private pushEntry(entry: HistoryEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_VISIBLE) this.entries.shift();
    this.renderEntries();
  }

  private renderEntries(): void {
    this.historyEl.innerHTML = '';

    for (const entry of this.entries) {
      const cmdLine = document.createElement('div');
      cmdLine.className = 'terminal-cmd';
      cmdLine.textContent = `${this.vfs.getPromptLabel()}$ ${entry.command}`;
      this.historyEl.appendChild(cmdLine);

      if (entry.kind === 'help') {
        for (const line of entry.result.feedback.split('\n')) {
          const el = document.createElement('div');
          el.className = line.startsWith('//') ? 'terminal-hint' : 'terminal-output terminal-output-info';
          el.textContent = line;
          this.historyEl.appendChild(el);
        }
      } else {
        if (entry.result.feedback !== '') {
          const outputClass = entry.result.success ? 'terminal-output-ok' : 'terminal-output-err';
          for (const line of entry.result.feedback.split('\n')) {
            const el = document.createElement('div');
            el.className = `terminal-output ${outputClass}`;
            el.textContent = line;
            this.historyEl.appendChild(el);
          }
        }

        if (entry.result.conclusion !== undefined) {
          const conc = document.createElement('div');
          conc.className = 'terminal-conclusion';
          conc.textContent = `// ${entry.result.conclusion}`;
          this.historyEl.appendChild(conc);
        }
      }

      const spacer = document.createElement('div');
      spacer.className = 'terminal-spacer';
      this.historyEl.appendChild(spacer);
    }

    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  // ── Tab completion ────────────────────────────────────────────────────

  private handleTab(): void {
    const current = this.inputEl.value;

    if (current !== this.lastTabInput) {
      this.tabCompletions = this.vfs.getCompletions(current);
      this.tabIdx = 0;
      this.lastTabInput = current;
    }

    if (this.tabCompletions.length === 0) return;

    if (this.tabCompletions.length === 1) {
      const completion = this.tabCompletions[0]!;
      const tokens = current.split(' ');
      tokens[tokens.length - 1] = completion;
      this.inputEl.value = tokens.join(' ');
      this.resetTab();
      return;
    }

    // Cycle through completions
    const completion = this.tabCompletions[this.tabIdx]!;
    const tokens = current.split(' ');
    tokens[tokens.length - 1] = completion;
    this.inputEl.value = tokens.join(' ');
    this.lastTabInput = this.inputEl.value;
    this.tabIdx = (this.tabIdx + 1) % this.tabCompletions.length;
  }

  private resetTab(): void {
    this.tabCompletions = [];
    this.tabIdx = 0;
    this.lastTabInput = '';
  }

  // ── History navigation ────────────────────────────────────────────────

  private historyUp(): void {
    if (this.cmdHistory.length === 0) return;
    if (this.historyIdx === -1) this.draftInput = this.inputEl.value;
    this.historyIdx = Math.min(this.historyIdx + 1, this.cmdHistory.length - 1);
    this.inputEl.value = this.cmdHistory[this.historyIdx] ?? '';
    this.moveCursorToEnd();
  }

  private historyDown(): void {
    if (this.historyIdx <= 0) {
      this.historyIdx = -1;
      this.inputEl.value = this.draftInput;
      return;
    }
    this.historyIdx--;
    this.inputEl.value = this.cmdHistory[this.historyIdx] ?? '';
    this.moveCursorToEnd();
  }

  private moveCursorToEnd(): void {
    const len = this.inputEl.value.length;
    this.inputEl.setSelectionRange(len, len);
  }

  // ── Event handlers ────────────────────────────────────────────────────

  private readonly onPoiInteract = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    if (this.isOpen) {
      this.inputEl.focus();
      return;
    }
    this.open(poiId);
  };

  private readonly onGlobalMouseDown = (event: MouseEvent): void => {
    if (!this.isOpen) return;
    if (!this.panel.contains(event.target as Node)) {
      event.stopImmediatePropagation();
      this.close();
    }
  };

  private readonly onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (!this.isOpen) return;
    if (event.code === 'Backquote') {
      event.stopImmediatePropagation();
      event.preventDefault();
      this.close();
    }
  };

  private readonly onInputKeyDown = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'Enter':
        event.stopPropagation();
        this.execute();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.historyUp();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.historyDown();
        break;
      case 'Tab':
        event.preventDefault();
        this.handleTab();
        break;
      case 'KeyL':
        if (event.ctrlKey) {
          event.preventDefault();
          this.entries.length = 0;
          this.renderEntries();
        }
        break;
      case 'KeyC':
        if (event.ctrlKey) {
          event.preventDefault();
          this.inputEl.value = '';
          this.resetTab();
          this.historyIdx = -1;
        }
        break;
      default:
        if (!event.ctrlKey) this.resetTab();
    }
  };
}

// Helper: checks if a poiId has a scenario (used to decide alert logic)
import { SCENARIOS } from '../data/scenarios';
function normalizeCmd(cmd: string): string {
  const parts = cmd.trim().split(/\s+/);
  const name = parts[0] ?? '';
  const rest = parts.slice(1).map(token =>
    /^-[a-zA-Z]{2,}$/.test(token) ? '-' + [...token.slice(1)].sort().join('') : token
  );
  return [name, ...rest].join(' ');
}
function SCENARIOS_HAS(poiId: string, command: string | null): boolean {
  const s = SCENARIOS[poiId];
  if (s === undefined) return false;
  if (command === null) return true;
  return normalizeCmd(s.correctCommand) === normalizeCmd(command);
}
function SCENARIOS_HAS_SECOND(poiId: string, command: string): boolean {
  const s = SCENARIOS[poiId];
  return s !== undefined && s.secondCommand !== undefined && normalizeCmd(s.secondCommand) === normalizeCmd(command);
}
