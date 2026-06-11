import { SCENARIOS } from '../data/scenarios';
import type { CommandChoice, Scenario } from '../types/game';
import { GameStateManager } from '../core/GameStateManager';

// ── ChoiceUI ───────────────────────────────────────────────────────────────────
// Panel de selección de opción para dificultad Muy Fácil. Reemplaza a TerminalUI.
// Muestra 3 opciones shuffleadas; el jugador elige con 1/2/3 o clic.
// Penalización: +5 de alerta por error, máximo 2 veces por sesión de terminal.

const MAX_WRONG_PENALTY = 2;
const ALERT_PER_WRONG   = 5;

export class ChoiceUI {
  private overlay: HTMLDivElement | null = null;
  private currentPoiId: string | null = null;
  private currentStep: 'first' | 'second' = 'first';
  private wrongCount = 0;
  private shuffledChoices: CommandChoice[] = [];
  private readonly onRequestLock: () => void;

  public constructor(onRequestLock: () => void) {
    this.onRequestLock = onRequestLock;
    this.injectStyles();
    window.addEventListener('poiInteract',      this.onPoiInteract);
    window.addEventListener('encryptionEnabled', this.onChaseStart);
    window.addEventListener('keydown',           this.onKeyDown);
  }

  public dispose(): void {
    window.removeEventListener('poiInteract',      this.onPoiInteract);
    window.removeEventListener('encryptionEnabled', this.onChaseStart);
    window.removeEventListener('keydown',           this.onKeyDown);
    this.close(false);
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private readonly onPoiInteract = (e: Event): void => {
    const { poiId } = (e as CustomEvent<{ poiId: string }>).detail;
    const scenario = SCENARIOS[poiId];
    if (scenario === undefined) return;
    if (GameStateManager.getInstance().isChasing) return;
    this.open(poiId, scenario);
  };

  private readonly onChaseStart = (): void => {
    this.close(false);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.overlay === null) return;

    // Close with backtick
    if (e.code === 'Backquote') { this.close(true); return; }

    // Select option 1/2/3
    const idx = e.code === 'Digit1' ? 0 : e.code === 'Digit2' ? 1 : e.code === 'Digit3' ? 2 : -1;
    if (idx >= 0 && idx < this.shuffledChoices.length) {
      e.preventDefault();
      this.select(this.shuffledChoices[idx]!.command);
    }
  };

  // ── Open / Close ─────────────────────────────────────────────────────────

  private open(poiId: string, scenario: Scenario): void {
    this.close(false);
    this.currentPoiId  = poiId;
    this.currentStep   = 'first';
    this.wrongCount    = 0;
    GameStateManager.getInstance().setTerminalOpen(true);
    document.exitPointerLock();
    this.renderChoices(scenario, 'first');
  }

  private close(relockMouse: boolean): void {
    this.overlay?.remove();
    this.overlay = null;
    this.currentPoiId = null;
    GameStateManager.getInstance().setTerminalOpen(false);
    if (relockMouse) this.onRequestLock();
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private renderChoices(scenario: Scenario, step: 'first' | 'second'): void {
    this.overlay?.remove();

    const raw = step === 'first' ? [...scenario.choices] : [...(scenario.secondChoices ?? scenario.choices)];
    this.shuffledChoices = shuffle(raw);

    const overlay = document.createElement('div');
    overlay.id = 'choice-overlay';

    overlay.innerHTML = `
      <div id="choice-panel">
        <div id="choice-header">
          <span id="choice-label">> ${scenario.label}</span>
          <span id="choice-close">[° Cerrar]</span>
        </div>
        <div id="choice-prompt">${scenario.prompt}</div>
        <div id="choice-options">
          ${this.shuffledChoices.map((c, i) => `
            <button class="choice-opt" data-idx="${i}">
              <span class="choice-key">[${i + 1}]</span>
              <span class="choice-cmd">${escapeHtml(c.command)}</span>
              <span class="choice-desc">${escapeHtml(c.description)}</span>
            </button>
          `).join('')}
        </div>
        <div id="choice-footer">Presioná 1, 2 o 3 para seleccionar &nbsp;·&nbsp; ° para cerrar</div>
      </div>
    `;

    overlay.addEventListener('click', this.onClick);
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private renderFeedback(text: string, success: boolean, then?: () => void): void {
    const opts = this.overlay?.querySelector<HTMLElement>('#choice-options');
    const footer = this.overlay?.querySelector<HTMLElement>('#choice-footer');
    if (opts === null || opts === undefined) return;

    opts.innerHTML = `<div class="choice-feedback ${success ? 'choice-feedback--ok' : 'choice-feedback--err'}">${escapeHtml(text)}</div>`;
    if (footer !== null && footer !== undefined) {
      footer.textContent = success ? (then !== undefined ? 'Continuando...' : 'Presioná ° para cerrar') : 'Intentá de nuevo...';
    }

    if (then !== undefined) {
      setTimeout(then, 1800);
    } else if (!success) {
      setTimeout(() => {
        if (this.overlay !== null && this.currentPoiId !== null) {
          const scenario = SCENARIOS[this.currentPoiId];
          if (scenario !== undefined) this.renderChoices(scenario, this.currentStep);
        }
      }, 2500);
    }
  }

  // ── Selection logic ──────────────────────────────────────────────────────

  private readonly onClick = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.choice-opt');
    if (btn !== null) {
      const idx = parseInt(btn.dataset.idx ?? '-1', 10);
      if (idx >= 0 && idx < this.shuffledChoices.length) {
        this.select(this.shuffledChoices[idx]!.command);
      }
      return;
    }
    if ((e.target as HTMLElement).closest('#choice-close') !== null) {
      this.close(true);
    }
  };

  private select(command: string): void {
    if (this.currentPoiId === null) return;
    const scenario = SCENARIOS[this.currentPoiId];
    if (scenario === undefined) return;

    const expected = this.currentStep === 'first' ? scenario.correctCommand : scenario.secondCommand;
    const isCorrect = command === expected;

    if (!isCorrect) {
      if (this.wrongCount < MAX_WRONG_PENALTY) {
        GameStateManager.getInstance().increaseAlert(ALERT_PER_WRONG);
        this.wrongCount++;
      }
      window.dispatchEvent(new CustomEvent('commandFail'));
      this.renderFeedback('[SISTEMA] Instrucción rechazada. El sistema no reconoció ese comando.', false);
      return;
    }

    // ── Correct ──────────────────────────────────────────────────────────
    const successOutput = this.currentStep === 'first'
      ? scenario.successOutput
      : (scenario.secondSuccessOutput ?? '');
    const objectiveId = this.currentStep === 'first'
      ? scenario.objectiveId
      : scenario.secondObjectiveId;
    const unlocksDoor = this.currentStep === 'first'
      ? this.currentPoiId  // the poi itself is the barrier (same as TerminalUI)
      : scenario.secondUnlocksDoor;

    if (objectiveId !== undefined) {
      const gsm = GameStateManager.getInstance();
      const required = this.currentStep === 'first'
        ? (scenario.requiredObjectives ?? [])
        : (scenario.secondRequiredObjectives ?? []);

      if (!required.every(r => gsm.objectivesCompleted.includes(r))) {
        this.renderFeedback('[ERROR] Acceso denegado. Completá los pasos anteriores primero.', false);
        return;
      }

      gsm.completeObjective(objectiveId);
    }

    window.dispatchEvent(new CustomEvent('commandSuccess'));
    if (unlocksDoor !== undefined) {
      window.dispatchEvent(new CustomEvent('doorUnlocked', { detail: { poiId: unlocksDoor } }));
    }

    // ── Advance VFS cwd if this was a door terminal ──────────────────────
    if (this.currentStep === 'first' && scenario.targetPath !== undefined) {
      // VirtualFS is only relevant in TerminalUI, but we update it for consistency
    }

    // ── Determine next action ─────────────────────────────────────────────
    const hasSecondStep = this.currentStep === 'first' && scenario.secondCommand !== undefined;

    if (hasSecondStep) {
      this.renderFeedback(successOutput, true, () => {
        if (this.overlay !== null && this.currentPoiId !== null) {
          const sc = SCENARIOS[this.currentPoiId];
          if (sc !== undefined) {
            this.currentStep = 'second';
            this.wrongCount  = 0;
            this.renderChoices(sc, 'second');
          }
        }
      });
    } else {
      this.renderFeedback(successOutput, true);
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('choice-ui-styles') !== null) return;
    const s = document.createElement('style');
    s.id = 'choice-ui-styles';
    s.textContent = `
      #choice-overlay {
        position: fixed; inset: 0; z-index: 3000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.72); backdrop-filter: blur(2px);
        font-family: 'Courier New', monospace;
        animation: choice-fadein 0.15s ease;
      }
      @keyframes choice-fadein { from { opacity:0; } to { opacity:1; } }

      #choice-panel {
        width: min(640px, 92vw);
        background: rgba(2,9,4,0.97);
        border: 1px solid rgba(74,246,38,0.35);
        box-shadow: 0 0 40px rgba(74,246,38,0.1), inset 0 0 40px rgba(0,0,0,0.5);
        display: flex; flex-direction: column; gap: 0;
      }

      #choice-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 0.65rem 1rem;
        border-bottom: 1px solid rgba(74,246,38,0.2);
        background: rgba(0,20,10,0.6);
      }
      #choice-label {
        font-size: 0.72rem; letter-spacing: 0.1em;
        color: rgba(155,255,79,0.7);
      }
      #choice-close {
        font-size: 0.65rem; color: rgba(155,255,79,0.3);
        cursor: pointer; transition: color 0.2s;
      }
      #choice-close:hover { color: rgba(155,255,79,0.7); }

      #choice-prompt {
        padding: 1rem 1.1rem 0.7rem;
        font-size: 0.82rem; line-height: 1.55;
        color: rgba(155,255,79,0.85);
        border-bottom: 1px solid rgba(74,246,38,0.1);
      }

      #choice-options {
        padding: 0.5rem 0;
        min-height: 9rem;
        display: flex; flex-direction: column; justify-content: center;
      }

      .choice-opt {
        display: grid;
        grid-template-columns: 2.2rem 1fr;
        grid-template-rows: auto auto;
        column-gap: 0.5rem;
        padding: 0.65rem 1.1rem;
        background: transparent;
        border: none; border-top: 1px solid rgba(74,246,38,0.07);
        color: #9bff4f; font-family: 'Courier New', monospace;
        cursor: pointer; text-align: left;
        transition: background 0.15s;
      }
      .choice-opt:first-child { border-top: none; }
      .choice-opt:hover { background: rgba(74,246,38,0.06); }
      .choice-opt:active { background: rgba(74,246,38,0.12); }

      .choice-key {
        grid-row: 1 / 3; align-self: center;
        font-size: 0.8rem; color: rgba(155,255,79,0.45);
        font-weight: bold;
      }
      .choice-cmd {
        font-size: 0.88rem; color: #9bff4f;
        letter-spacing: 0.02em;
      }
      .choice-desc {
        font-size: 0.68rem; color: rgba(155,255,79,0.45);
        line-height: 1.3; margin-top: 0.1rem;
      }

      .choice-feedback {
        padding: 1.1rem 1.3rem;
        font-size: 0.78rem; line-height: 1.6;
        white-space: pre-wrap;
      }
      .choice-feedback--ok  { color: #9bff4f; }
      .choice-feedback--err { color: #ff6060; }

      #choice-footer {
        padding: 0.5rem 1.1rem;
        font-size: 0.62rem; letter-spacing: 0.08em;
        color: rgba(155,255,79,0.25);
        border-top: 1px solid rgba(74,246,38,0.12);
      }
    `;
    document.head.appendChild(s);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
