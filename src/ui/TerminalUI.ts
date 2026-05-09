import { CommandEngine } from '../gameplay/CommandEngine';
import type { CommandResult, CommandChoice } from '../gameplay/CommandEngine';
import { GameStateManager } from '../core/GameStateManager';

interface FeedbackEntry {
  command: string;
  result: CommandResult;
}

export class TerminalUI {
  private readonly popup: HTMLElement;
  private readonly popupTitle: HTMLElement;
  private readonly popupChoices: HTMLElement;
  private readonly feedbackPanel: HTMLElement;
  private readonly commandEngine = new CommandEngine();
  private isOpen = false;
  private currentPoiId = '';
  private currentChoices: readonly CommandChoice[] = [];
  private readonly history: FeedbackEntry[] = [];
  private historyIndex = -1;

  public constructor() {
    const { popup, title, choices } = this.buildPopup();
    this.popup = popup;
    this.popupTitle = title;
    this.popupChoices = choices;
    this.feedbackPanel = this.buildFeedbackPanel();

    const root = document.getElementById('app')!;
    root.appendChild(this.popup);
    root.appendChild(this.feedbackPanel);

    window.addEventListener('poiInteract', this.onPoiInteract);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public dispose(): void {
    window.removeEventListener('poiInteract', this.onPoiInteract);
    window.removeEventListener('keydown', this.onKeyDown);
    this.popup.remove();
    this.feedbackPanel.remove();
  }

  private buildPopup(): { popup: HTMLElement; title: HTMLElement; choices: HTMLElement } {
    const popup = document.createElement('div');
    popup.id = 'command-popup';

    const header = document.createElement('div');
    header.id = 'command-popup-header';

    const title = document.createElement('span');
    title.id = 'command-popup-title';

    const esc = document.createElement('span');
    esc.id = 'command-popup-esc';
    esc.textContent = '[E] cerrar';

    header.appendChild(title);
    header.appendChild(esc);

    const choices = document.createElement('div');
    choices.id = 'command-popup-choices';

    popup.appendChild(header);
    popup.appendChild(choices);

    return { popup, title, choices };
  }

  private buildFeedbackPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'feedback-panel';
    return panel;
  }

  private open(poiId: string): void {
    const scenario = this.commandEngine.getScenario(poiId);
    if (scenario === null) return;

    this.feedbackPanel.innerHTML = '';
    this.historyIndex = -1;
    this.currentPoiId = poiId;
    this.currentChoices = scenario.choices;
    this.popupTitle.textContent = scenario.label;

    this.popupChoices.innerHTML = '';
    scenario.choices.forEach((choice, i) => {
      const row = document.createElement('div');
      row.className = 'command-choice';
      row.innerHTML =
        `<span class="command-choice-key">[${i + 1}]</span>` +
        `<span class="command-choice-cmd">${choice.command}</span>`;
      this.popupChoices.appendChild(row);
    });

    this.isOpen = true;
    this.popup.classList.add('visible');
  }

  private close(): void {
    this.isOpen = false;
    this.popup.classList.remove('visible');
    this.currentPoiId = '';
    this.currentChoices = [];
  }

  private choose(index: number): void {
    if (!this.isOpen || index >= this.currentChoices.length) return;

    const poiId = this.currentPoiId;
    const choice = this.currentChoices[index]!;
    const result = this.commandEngine.process(
      choice.command,
      poiId,
      GameStateManager.getInstance().objectivesCompleted,
    );

    this.close();
    this.addFeedback(choice.command, result);

    if (result.objectiveId !== undefined) {
      GameStateManager.getInstance().completeObjective(result.objectiveId);
    }

    if (result.success) {
      window.dispatchEvent(new CustomEvent('doorUnlocked', { detail: { poiId } }));
      window.dispatchEvent(new CustomEvent('commandSuccess'));
    } else {
      GameStateManager.getInstance().increaseAlert(20);
      window.dispatchEvent(new CustomEvent('commandFail'));
    }
  }

  private addFeedback(command: string, result: CommandResult): void {
    this.history.push({ command, result });
    this.historyIndex = this.history.length - 1;
    this.renderFeedback();
  }

  private renderFeedback(): void {
    const entry = this.history[this.historyIndex];
    if (entry === undefined) return;

    this.feedbackPanel.innerHTML = '';

    const cmdLine = document.createElement('div');
    cmdLine.className = 'feedback-cmd';
    cmdLine.textContent = `> ${entry.command}`;
    this.feedbackPanel.appendChild(cmdLine);

    const outputClass = entry.result.success ? 'feedback-output--ok' : 'feedback-output--err';
    for (const line of entry.result.feedback.split('\n')) {
      const el = document.createElement('div');
      el.className = `feedback-output ${outputClass}`;
      el.textContent = line;
      this.feedbackPanel.appendChild(el);
    }

    if (entry.result.conclusion !== undefined) {
      const sep = document.createElement('div');
      sep.className = 'feedback-output';
      this.feedbackPanel.appendChild(sep);

      const conc = document.createElement('div');
      conc.className = 'feedback-conclusion';
      conc.textContent = `// ${entry.result.conclusion}`;
      this.feedbackPanel.appendChild(conc);
    }

    this.feedbackPanel.appendChild(this.buildNavFooter());
    this.feedbackPanel.classList.add('visible');
  }

  private buildNavFooter(): HTMLElement {
    const nav = document.createElement('div');
    nav.className = 'feedback-nav';

    const hasPrev = this.historyIndex > 0;
    const hasNext = this.historyIndex < this.history.length - 1;

    const q = document.createElement('span');
    q.className = hasPrev ? 'feedback-nav-key' : 'feedback-nav-key feedback-nav-key--off';
    q.textContent = '[Q] ←';

    const count = document.createElement('span');
    count.className = 'feedback-nav-count';
    count.textContent = `${this.historyIndex + 1} / ${this.history.length}`;

    const r = document.createElement('span');
    r.className = hasNext ? 'feedback-nav-key' : 'feedback-nav-key feedback-nav-key--off';
    r.textContent = '→ [R]';

    nav.appendChild(q);
    nav.appendChild(count);
    nav.appendChild(r);
    return nav;
  }

  private readonly onPoiInteract = (event: Event): void => {
    const { poiId } = (event as CustomEvent<{ poiId: string }>).detail;
    this.open(poiId);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.isOpen) {
      if (event.code === 'KeyE') {
        // stopImmediatePropagation evita que InteractionManager procese este E
        // y vuelva a disparar poiInteract reabriendo el panel
        event.stopImmediatePropagation();
        this.close();
        return;
      }
      if (event.code === 'Digit1') this.choose(0);
      else if (event.code === 'Digit2') this.choose(1);
      else if (event.code === 'Digit3') this.choose(2);
      return;
    }

    if (event.code === 'KeyQ' && this.historyIndex > 0) {
      this.historyIndex--;
      this.renderFeedback();
    } else if (event.code === 'KeyR' && this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.renderFeedback();
    }
  };
}
