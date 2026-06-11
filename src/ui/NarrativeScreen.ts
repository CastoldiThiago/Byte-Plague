import { GameStateManager } from '../core/GameStateManager';
import { SaveManager } from '../core/SaveManager';
import { GameConfig } from '../core/GameConfig';

const CHAR_DELAY_MS = 40;
const LINE_PAUSE_MS = 900;
const END_PAUSE_MS = 1800;

const NARRATIVE_INTRO: readonly string[] = [
  'BYTE-PLAGUE v0.1',
  'Entraste a la maquina de un empleado mediante phishing.',
  'Tu objetivo inicial es encontrar un canal de acceso a la red interna.',
  'La computadora se representa como una casa con habitaciones.',
  'Elige bien los comandos en cada puerta para avanzar.',
  'Si fallas, el antivirus detecta tu presencia...',
];

const NARRATIVE_LEVEL: Readonly<Record<number, readonly string[]>> = {
  1: [
    'Ingresaste a la red interna de la empresa.',
    'Las credenciales de netops abrieron el camino.',
    'El antivirus entró en patrulla activa. Moverse rápido.',
  ],
  2: [
    'Privilegios de domain_admin obtenidos.',
    'El acceso a los archivos críticos está abierto.',
    'Etapa final: cifrá todo antes de que te encuentren.',
  ],
  3: [
    'CLAVE RSA-2048 GENERADA.',
    'El antivirus detectó la actividad.',
    'Viene directo a esta sala.',
    'Cifrá la mayor cantidad de archivos posible.',
  ],
};

const NARRATIVE_LOSE: readonly string[] = [
  'El antivirus te encontró.',
  'Intrusión contenida. Conexion terminada.',
];

export class NarrativeScreen {
  private readonly overlay: HTMLElement;
  private readonly textContainer: HTMLElement;
  private isActive = false;
  private timeoutIds: number[] = [];
  private skipCallBack: (() => void) | null = null;

  public constructor() {
    this.injectStyles();
    const { overlay, textContainer } = this.buildDOM();
    this.overlay = overlay;
    this.textContainer = textContainer;
    document.getElementById('app')!.appendChild(this.overlay);

    window.addEventListener('levelComplete', this.onLevelComplete);
    window.addEventListener('gameOver', this.onGameOver);
    window.addEventListener('gameWon', this.onGameWon);
    window.addEventListener('gameCaptured', this.onGameCaptured);
    window.addEventListener('allFilesEncrypted', this.onAllFilesEncrypted);
    window.addEventListener('keydown', this.onKeyDown);

    const save = SaveManager.load();
    const introLines = save !== null
      ? [
          `ETAPA ${save.stage} — CHECKPOINT`,
          'Retomando desde el último punto de guardado.',
          'El antivirus sigue activo. Mantené el perfil bajo.',
        ]
      : (NARRATIVE_INTRO as string[]);

    GameStateManager.getInstance().setPaused(true);
    this.show(introLines, () => {
      GameStateManager.getInstance().setPaused(false);
      if (overlay.lastChild !== null) overlay.removeChild(overlay.lastChild);
    });
  }

  public show(lines: string[], onComplete: () => void): void {
    if (this.isActive) return;
    this.isActive = true;
    this.prepareOverlay();

    this.skipCallBack = () => {
      this.clearTimeouts();
      this.overlay.classList.remove('visible');
      this.isActive = false;
      this.skipCallBack = null;
      window.dispatchEvent(new CustomEvent('narrativeHidden'));
      onComplete();
    };

    this.typeLines(lines, 0, () => {
      this.skipCallBack = null;
      const id = window.setTimeout(() => {
        this.overlay.classList.remove('visible');
        this.isActive = false;
        window.dispatchEvent(new CustomEvent('narrativeHidden'));
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
      this.skipCallBack = null;
      const id = window.setTimeout(() => this.mountRetryButton(), 800);
      this.timeoutIds.push(id);
    });
  }

  public dispose(): void {
    this.clearTimeouts();
    window.removeEventListener('levelComplete', this.onLevelComplete);
    window.removeEventListener('gameOver', this.onGameOver);
    window.removeEventListener('gameWon', this.onGameWon);
    window.removeEventListener('gameCaptured', this.onGameCaptured);
    window.removeEventListener('allFilesEncrypted', this.onAllFilesEncrypted);
    window.removeEventListener('keydown', this.onKeyDown);
    this.overlay.remove();
  }

  public showVictoryScreen(count: number, total: number): void {
    this.clearTimeouts();
    this.isActive = true;
    this.prepareOverlay();

    const damage = count * 1_500_000;
    const dmgStr = damage.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    const row = (label: string, value: string): string =>
      `  ${label.padEnd(26)}${value}`;

    const lines: string[] = [
      'MISIÓN COMPLETADA',
      `Cifraste los ${total} archivos críticos antes de ser atrapado.`,
      'La empresa no puede recuperar sus datos.',
      '',
      '--- REPORTE BYTE-PLAGUE ---',
      row('archivos cifrados',   `${count}/${total}`),
      row('daño estimado',       dmgStr),
      row('calificacion',        'S — Operación perfecta'),
      '',
      '  BYTE-PLAGUE v0.1',
    ];

    this.typeLines(lines, 0, () => {
      this.skipCallBack = null;
      const id = window.setTimeout(() => {
        // Solo botón Inicio
        const btn = document.createElement('button');
        btn.id = 'narrative-retry-btn';
        btn.textContent = '[ Inicio ]';
        btn.addEventListener('click', () => {
          SaveManager.clear();
          window.location.reload();
        }, { once: true });
        this.textContainer.appendChild(btn);
        requestAnimationFrame(() => { btn.style.opacity = '1'; });
      }, 800);
      this.timeoutIds.push(id);
    });
  }

  public showCapturedScreen(count: number, total: number): void {
    this.clearTimeouts();
    this.isActive = true;
    this.prepareOverlay();

    const lines = this.buildCapturedLines(count, total);
    this.typeLines(lines, 0, () => {
      this.skipCallBack = null;
      const id = window.setTimeout(() => this.mountCapturedButtons(count, total), 800);
      this.timeoutIds.push(id);
    });
  }

  private buildCapturedLines(count: number, total: number): string[] {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const damage = count * 1_500_000;
    const dmgStr = damage.toLocaleString('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const row = (label: string, value: string): string =>
      `  ${label.padEnd(26)}${value}`;

    const grade =
      count === total ? 'S — Operación perfecta'
      : count >= 6    ? 'A — Gran éxito'
      : count >= 4    ? 'B — Éxito parcial'
      : count >= 1    ? 'C — Daño limitado'
      :                 'F — Sin archivos cifrados';

    return [
      'EL ANTIVIRUS TE ATRAPÓ',
      `Lograste cifrar ${count} de ${total} archivos (${pct}%).`,
      '',
      '--- REPORTE BYTE-PLAGUE ---',
      row('archivos cifrados',   `${count}/${total}`),
      row('daño estimado',       dmgStr),
      row('datos comprometidos', `${pct}%`),
      row('calificacion',        grade),
      '',
      `  BYTE-PLAGUE v0.1`,
    ];
  }

  private buildWinLines(): string[] {
    const gs = GameStateManager.getInstance();
    const mistakes = Math.round(gs.alertLevel / 10);

    const row = (label: string, value: string): string =>
      `  ${label.padEnd(26)}${value}`;

    const completedStage3 = gs.objectivesCompleted.includes('mission-complete');

    if (completedStage3) {
      return [
        'BYTE-PLAGUE — OPERACION EXITOSA',
        'Lograste cifrar los archivos criticos.',
        'La empresa esta negociando el rescate.',
        '',
        '--- REPORTE DE INTRUSION ---',
        row('vector de entrada',   'phishing → jperez'),
        row('pivote interno',      'netops → svc_backup'),
        row('privilegios max.',    'domain_admin'),
        row('archivos cifrados',   '5 (database, backups, xlsx)'),
        row('alertas generadas',   `${mistakes} aprox.`),
        '',
        '  BYTE-PLAGUE v0.1 — mision completada.',
      ];
    }

    return [
      'Mision completada.',
      'Infiltracion exitosa en la red interna.',
      '',
      row('alertas generadas', `${mistakes} aprox.`),
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

  private mountCapturedButtons(count: number, total: number): void {
    const allEncrypted = count >= total;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;gap:1.2rem;justify-content:center;margin-top:2rem;flex-wrap:wrap;';

    if (!allEncrypted) {
      const retry = document.createElement('button');
      retry.id = 'narrative-retry-btn';
      retry.textContent = '[ Reintentar — Etapa 3 ]';
      retry.addEventListener('click', () => {
        GameConfig.flagAutostart();
        window.location.reload();
      }, { once: true });
      wrapper.appendChild(retry);
    }

    const inicio = document.createElement('button');
    inicio.id = allEncrypted ? 'narrative-retry-btn' : 'narrative-inicio-btn';
    inicio.textContent = '[ Inicio ]';
    inicio.addEventListener('click', () => {
      SaveManager.clear();
      window.location.reload();
    }, { once: true });
    wrapper.appendChild(inicio);

    this.textContainer.appendChild(wrapper);
    requestAnimationFrame(() => {
      wrapper.querySelectorAll('button').forEach(b => { (b as HTMLElement).style.opacity = '1'; });
    });
  }

  private prepareOverlay(): void {
    this.textContainer.innerHTML = '';
    this.overlay.classList.add('visible');
    document.exitPointerLock();
    window.dispatchEvent(new CustomEvent('narrativeShown'));
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

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && this.skipCallBack !== null) {
      e.preventDefault();
      this.skipCallBack();
    }
  }

  private readonly onLevelComplete = (event: Event): void => {
    const { level } = (event as CustomEvent<{ level: number }>).detail;
    const lines = (NARRATIVE_LEVEL[level] ?? ['Nivel completado.', 'Continuando...']) as string[];
    GameStateManager.getInstance().setPaused(true);
    this.show(lines, () => {
      GameStateManager.getInstance().setPaused(false);
      if (level === 3) {
        // Signal the antivirus to start rushing now that the player has read the warning
        window.dispatchEvent(new CustomEvent('chaseRushStart'));
      }
    });
  };

  private readonly onGameOver = (): void => {
    this.showEndScreen(false);
  };

  private readonly onGameWon = (): void => {
    this.showEndScreen(true);
  };

  private readonly onGameCaptured = (e: Event): void => {
    const { count, total } = (e as CustomEvent<{ count: number; total: number }>).detail;
    this.showCapturedScreen(count, total);
  };

  private readonly onAllFilesEncrypted = (e: Event): void => {
    const { count, total } = (e as CustomEvent<{ count: number; total: number }>).detail;
    this.showVictoryScreen(count, total);
  };

  private buildDOM(): { overlay: HTMLElement; textContainer: HTMLElement } {
    const overlay = document.createElement('div');
    overlay.id = 'narrative-overlay';

    const content = document.createElement('div');
    content.id = 'narrative-content';

    const textContainer = document.createElement('div');
    textContainer.id = 'narrative-text';

    const skipHint = document.createElement('div');
    skipHint.id = 'narrative-skip-hint';
    skipHint.textContent = "Presione la tecla 'espacio' para saltar intro";

    content.appendChild(textContainer);
    overlay.appendChild(content);
    overlay.appendChild(skipHint);
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
        max-width: 760px;
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
        text-align: center;
        white-space: pre-wrap;
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
      #narrative-inicio-btn {
        display: block;
        padding: 0.55rem 1.8rem;
        font-family: 'Courier New', monospace;
        font-size: 0.95rem;
        color: rgba(155, 255, 79, 0.5);
        background: transparent;
        border: 1px solid rgba(155, 255, 79, 0.3);
        cursor: pointer;
        letter-spacing: 0.12em;
        opacity: 0;
        transition: opacity 0.6s ease, background 0.2s ease, color 0.2s ease;
      }
      #narrative-inicio-btn:hover {
        background: rgba(155, 255, 79, 0.08);
        color: #9bff4f;
      }
      #narrative-skip-hint {
        position: absolute;
        bottom: 1.8rem;
        right: 2rem;
        font-family: 'Courier New', monospace;
        font-size: 0.78rem;
        color: rgba(81, 235, 15, 0.92);
        letter-spacing: 0.08em;
        pointer-events: none;
        animation: narrative-blink 2.4s ease-in-out infinite;
      }  
    `;
    document.head.appendChild(style);
  }
}
