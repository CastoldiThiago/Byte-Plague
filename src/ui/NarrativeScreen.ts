import { GameStateManager } from '../core/GameStateManager';

const CHAR_DELAY_MS = 40;
const LINE_PAUSE_MS = 900;
const END_PAUSE_MS = 1800;

const NARRATIVE_INTRO: readonly string[] = [
  'BYTE-PLAGUE v0.1',
  'Sistema objetivo identificado.',
  'Misión: cifrar 5 archivos clasificados antes de ser detectado.',
  'Tiempo disponible: 02:00.',
  'No te detecten.',
];

const NARRATIVE_LEVEL: Readonly<Record<number, readonly string[]>> = {
  1: ['Terminal del laboratorio comprometida.', 'Persistencia establecida en el sistema.'],
  2: ['Zona de red infiltrada.', 'Continúa hacia el mainframe.'],
  3: ['Mainframe comprometido.', 'Último núcleo de seguridad identificado.'],
  4: ['Acceso total obtenido.', 'Cifrá los archivos restantes.'],
};

const NARRATIVE_LOSE: readonly string[] = [
  'El antivirus te encontró.',
  'Proceso eliminado.',
];

const CIFRADO_OBJECTIVES = ['cifrado-1', 'cifrado-2', 'cifrado-3', 'cifrado-4', 'cifrado-5'];

export class NarrativeScreen {
  private readonly overlay: HTMLElement;
  private readonly textContainer: HTMLElement;
  private isActive = false;
  private timeoutIds: number[] = [];

  public constructor() {
    this.injectStyles();
    const { overlay, textContainer } = this.buildDOM();
    this.overlay = overlay;
    this.textContainer = textContainer;
    document.getElementById('app')!.appendChild(this.overlay);

    window.addEventListener('levelComplete', this.onLevelComplete);
    window.addEventListener('gameOver', this.onGameOver);

    GameStateManager.getInstance().setPaused(true);
    this.show(NARRATIVE_INTRO as string[], () => {
      GameStateManager.getInstance().setPaused(false);
    });
  }

  public show(lines: string[], onComplete: () => void): void {
    if (this.isActive) return;
    this.isActive = true;
    this.prepareOverlay();

    this.typeLines(lines, 0, () => {
      const id = window.setTimeout(() => {
        this.overlay.classList.remove('visible');
        this.isActive = false;
        onComplete();
      }, END_PAUSE_MS);
      this.timeoutIds.push(id);
    });
  }

  public showEndScreen(won: boolean): void {
    this.clearTimeouts();
    this.isActive = true;
    this.prepareOverlay();

    const lines = won ? this.buildWinLines() : (NARRATIVE_LOSE as string[]);

    this.typeLines(lines, 0, () => {
      const id = window.setTimeout(() => this.mountRetryButton(), 800);
      this.timeoutIds.push(id);
    });
  }

  public dispose(): void {
    this.clearTimeouts();
    window.removeEventListener('levelComplete', this.onLevelComplete);
    window.removeEventListener('gameOver', this.onGameOver);
    this.overlay.remove();
  }

  private buildWinLines(): string[] {
    const gs = GameStateManager.getInstance();
    const filesEncrypted = gs.objectivesCompleted.filter(id => id.startsWith('cifrado-')).length;
    const timeUsed = 120 - gs.timerSeconds;
    const min = Math.floor(timeUsed / 60).toString().padStart(2, '0');
    const sec = (timeUsed % 60).toString().padStart(2, '0');
    const dataMB = filesEncrypted * 480;
    const dataLabel = dataMB >= 1000 ? `${(dataMB / 1000).toFixed(1)} GB` : `${dataMB} MB`;
    const cost = (filesEncrypted * 169_400).toLocaleString('es-AR');

    const row = (label: string, value: string): string =>
      `  ${label.padEnd(24)}${value}`;

    return [
      'Misión completada.',
      'Lograste tu objetivo.',
      'La empresa tardó 23 días en recuperarse.',
      '',
      '--- REPORTE DE DAÑOS ---',
      row('archivos cifrados', `${filesEncrypted} / 5`),
      row('tiempo empleado', `${min}:${sec}`),
      row('datos exfiltrados', dataLabel),
      row('costo estimado', `$${cost}`),
      '',
      'El 60 % de las brechas tardan más de 200 días en detectarse.',
      'Conocer el ataque es la primera línea de defensa.',
    ];
  }

  private mountRetryButton(): void {
    const btn = document.createElement('button');
    btn.id = 'narrative-retry-btn';
    btn.textContent = '[ Reintentar ]';
    btn.addEventListener('click', () => {
      GameStateManager.getInstance().resetState();
      window.location.reload();
    }, { once: true });
    this.textContainer.appendChild(btn);
    requestAnimationFrame(() => { btn.style.opacity = '1'; });
  }

  private prepareOverlay(): void {
    this.textContainer.innerHTML = '';
    this.overlay.classList.add('visible');
    document.exitPointerLock();
  }

  private typeLines(lines: string[], index: number, onAllDone: () => void): void {
    if (index >= lines.length) {
      onAllDone();
      return;
    }

    const lineEl = document.createElement('p');
    lineEl.className = index === 0 ? 'narrative-line narrative-line--title' : 'narrative-line';
    this.textContainer.appendChild(lineEl);

    this.typeChars(lineEl, lines[index]!, 0, () => {
      const id = window.setTimeout(() => {
        this.typeLines(lines, index + 1, onAllDone);
      }, LINE_PAUSE_MS);
      this.timeoutIds.push(id);
    });
  }

  private typeChars(el: HTMLElement, text: string, charIndex: number, onDone: () => void): void {
    if (charIndex >= text.length) {
      onDone();
      return;
    }
    el.textContent = text.slice(0, charIndex + 1);
    const id = window.setTimeout(() => {
      this.typeChars(el, text, charIndex + 1, onDone);
    }, CHAR_DELAY_MS);
    this.timeoutIds.push(id);
  }

  private clearTimeouts(): void {
    for (const id of this.timeoutIds) clearTimeout(id);
    this.timeoutIds = [];
  }

  private readonly onLevelComplete = (event: Event): void => {
    const { level } = (event as CustomEvent<{ level: number }>).detail;
    const lines = (NARRATIVE_LEVEL[level] ?? ['Nivel completado.', 'Continuando...']) as string[];
    this.show(lines, () => {});
  };

  private readonly onGameOver = (): void => {
    const completed = GameStateManager.getInstance().objectivesCompleted;
    const won = CIFRADO_OBJECTIVES.every(id => completed.includes(id));
    this.showEndScreen(won);
  };

  private buildDOM(): { overlay: HTMLElement; textContainer: HTMLElement } {
    const overlay = document.createElement('div');
    overlay.id = 'narrative-overlay';

    const content = document.createElement('div');
    content.id = 'narrative-content';

    const textContainer = document.createElement('div');
    textContainer.id = 'narrative-text';

    content.appendChild(textContainer);
    overlay.appendChild(content);
    return { overlay, textContainer };
  }

  private injectStyles(): void {
    if (document.getElementById('narrative-styles') !== null) return;
    const style = document.createElement('style');
    style.id = 'narrative-styles';
    style.textContent = `
      #narrative-overlay {
        position: fixed;
        inset: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s ease;
      }
      #narrative-overlay.visible {
        opacity: 1;
        pointer-events: all;
      }
      #narrative-content {
        max-width: 600px;
        width: 100%;
        padding: 2rem;
        text-align: center;
      }
      .narrative-line {
        font-family: 'Courier New', monospace;
        font-size: 1.2rem;
        color: #9bff4f;
        line-height: 2;
        margin: 0;
        min-height: 1.5em;
        white-space: pre;
      }
      .narrative-line--title {
        font-size: 1.7rem;
        letter-spacing: 0.18em;
        color: #ffffff;
        margin-bottom: 0.6rem;
      }
      #narrative-retry-btn {
        display: block;
        margin: 2.5rem auto 0;
        padding: 0.55rem 1.8rem;
        font-family: 'Courier New', monospace;
        font-size: 0.95rem;
        color: #9bff4f;
        background: transparent;
        border: 1px solid #9bff4f;
        cursor: pointer;
        letter-spacing: 0.12em;
        opacity: 0;
        transition: opacity 0.6s ease, background 0.2s ease, color 0.2s ease;
      }
      #narrative-retry-btn:hover {
        background: rgba(155, 255, 79, 0.12);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
}
