import { GameConfig, type Difficulty } from '../core/GameConfig';
import { SaveManager } from '../core/SaveManager';

export class StartScreen {
  private readonly overlay: HTMLElement;
  private readonly onStart: () => void;

  public constructor(onStart: () => void) {
    this.onStart = onStart;
    this.injectStyles();
    this.overlay = this.buildDOM();
    document.body.appendChild(this.overlay);
    requestAnimationFrame(() => this.overlay.classList.add('ss-visible'));
  }

  public dispose(): void {
    this.overlay.remove();
  }

  // ── DOM ──────────────────────────────────────────────────────────────

  private buildDOM(): HTMLElement {
    const hasSave = SaveManager.load() !== null;

    const overlay = document.createElement('div');
    overlay.id = 'start-screen';

    overlay.innerHTML = `
      <div id="ss-scanlines"></div>
      <div id="ss-content">

        <div id="ss-header">
          <div id="ss-title">BYTE<span>-</span>PLAGUE</div>
          <div id="ss-version">v0.1 — RANSOMWARE SIMULATION</div>
          <div id="ss-tagline">// Infiltrate. Escalate. Encrypt.</div>
        </div>

        <div class="ss-columns">

          <div class="ss-col">
            <div class="ss-section-label">// CONFIGURACIÓN DE ATAQUE</div>

            <div class="ss-field">
              <label class="ss-label" for="ss-virus-name">NOMBRE DEL VIRUS</label>
              <input id="ss-virus-name" class="ss-input" type="text"
                     value="${GameConfig.virusName}" maxlength="20"
                     placeholder="BYTE-PLAGUE" spellcheck="false" autocomplete="off">
            </div>

            <div class="ss-field">
              <label class="ss-label" for="ss-company">EMPRESA OBJETIVO</label>
              <input id="ss-company" class="ss-input" type="text"
                     value="${GameConfig.targetCompany}" maxlength="30"
                     placeholder="corp.internal" spellcheck="false" autocomplete="off">
            </div>

            <div class="ss-field">
              <div class="ss-label">DIFICULTAD</div>
              <div id="ss-difficulty" class="ss-diff-group">
                <button class="ss-diff-btn${GameConfig.difficulty === 'very-easy' ? ' active' : ''}" data-diff="very-easy">
                  <span class="diff-name">MUY FÁCIL</span>
                  <span class="diff-desc">Selección de opción / sin terminal</span>
                </button>
                <button class="ss-diff-btn${GameConfig.difficulty === 'easy'   ? ' active' : ''}" data-diff="easy">
                  <span class="diff-name">FÁCIL</span>
                  <span class="diff-desc">+50% tiempo / drone lento</span>
                </button>
                <button class="ss-diff-btn${GameConfig.difficulty === 'normal' ? ' active' : ''}" data-diff="normal">
                  <span class="diff-name">NORMAL</span>
                  <span class="diff-desc">Configuración estándar</span>
                </button>
                <button class="ss-diff-btn${GameConfig.difficulty === 'hard'   ? ' active' : ''}" data-diff="hard">
                  <span class="diff-name">DIFÍCIL</span>
                  <span class="diff-desc">–35% tiempo / drone rápido</span>
                </button>
              </div>
            </div>
          </div>

          <div class="ss-col">
            <div class="ss-section-label ss-manual-toggle" id="ss-manual-toggle">
              // MANUAL DE JUEGO <span id="ss-manual-arrow">▼</span>
            </div>
            <div id="ss-manual" class="ss-manual-content">
              <p><span class="ss-kw">OBJETIVO</span><br>
              Sos un virus ransomware infiltrado por phishing.<br>
              Cifrá los archivos críticos antes de que el antivirus te atrape.</p>

              <p><span class="ss-kw">CONTROLES</span><br>
              WASD &nbsp;&nbsp;&nbsp;&nbsp; — moverse &nbsp;&nbsp;&nbsp;&nbsp; Mouse — apuntar<br>
              E &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; — interactuar &nbsp;&nbsp; Enter — ejecutar comando<br>
              ° — cerrar terminal &nbsp; N — objetivos &nbsp; H — herramientas &nbsp; ESC — pausa</p>

              <p><span class="ss-kw">ETAPAS</span><br>
              1. <em>Infiltración</em> — credenciales en la PC del empleado<br>
              2. <em>Escalada</em> &nbsp;&nbsp;&nbsp;— privilegios de domain_admin<br>
              3. <em>Cifrado</em> &nbsp;&nbsp;&nbsp;&nbsp;— cifrá archivos antes de ser atrapado</p>

              <p><span class="ss-kw">EVASIÓN</span><br>
              Teclas 1, 2, 3 — ítems que encontrás explorando el mapa.<br>
              Usá /help en cualquier terminal para obtener pistas.</p>
            </div>
          </div>

        </div>

        <div id="ss-actions">
          ${hasSave ? `<button id="ss-continue-btn" class="ss-btn ss-btn-secondary">[ CONTINUAR PARTIDA ]</button>` : ''}
          <button id="ss-start-btn" class="ss-btn ss-btn-primary">[ INICIAR ATAQUE ]</button>
        </div>

        <div id="ss-footer">
          BYTE-PLAGUE es una simulación educativa de ciberseguridad.
        </div>

      </div>
    `;

    overlay.addEventListener('click', this.onClick);
    return overlay;
  }

  // ── Events ───────────────────────────────────────────────────────────

  private readonly onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;

    // Difficulty buttons
    const diffBtn = target.closest<HTMLElement>('.ss-diff-btn');
    if (diffBtn !== null) {
      document.querySelectorAll('.ss-diff-btn').forEach(b => b.classList.remove('active'));
      diffBtn.classList.add('active');
      return;
    }

    // Manual toggle
    if (target.closest('#ss-manual-toggle')) {
      const manual = document.getElementById('ss-manual');
      const arrow  = document.getElementById('ss-manual-arrow');
      const open   = manual?.style.display !== 'none';
      if (manual) manual.style.display = open ? 'none' : 'block';
      if (arrow)  arrow.textContent    = open ? '▼' : '▲';
      return;
    }

    // Continue (checkpoint)
    if (target.closest('#ss-continue-btn')) {
      this.saveConfigAndStart();
      return;
    }

    // Start
    if (target.closest('#ss-start-btn')) {
      SaveManager.clear();
      this.saveConfigAndStart();
    }
  };

  private saveConfigAndStart(): void {
    const nameInput    = document.getElementById('ss-virus-name')  as HTMLInputElement | null;
    const companyInput = document.getElementById('ss-company')      as HTMLInputElement | null;
    const activeDiff   = document.querySelector<HTMLElement>('.ss-diff-btn.active');

    GameConfig.set({
      virusName:     nameInput?.value.trim()    || 'BYTE-PLAGUE',
      targetCompany: companyInput?.value.trim() || 'corp.internal',
      difficulty:    (activeDiff?.dataset.diff as Difficulty | undefined) ?? 'normal',
    });

    this.overlay.classList.remove('ss-visible');
    this.overlay.addEventListener('transitionend', () => {
      this.dispose();
      this.onStart();
    }, { once: true });
  }

  // ── Styles ───────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('start-screen-styles')) return;
    const style = document.createElement('style');
    style.id = 'start-screen-styles';
    style.textContent = `
      #start-screen {
        position: fixed; inset: 0; background: #020905;
        display: flex; align-items: center; justify-content: center;
        z-index: 9000; opacity: 0; transition: opacity 0.5s ease;
        font-family: 'Courier New', monospace; color: #9bff4f;
        overflow-y: auto;
      }
      #start-screen.ss-visible { opacity: 1; }

      #ss-scanlines {
        position: fixed; inset: 0; pointer-events: none; z-index: 1;
        background: repeating-linear-gradient(
          to bottom,
          transparent 0px, transparent 3px,
          rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px
        );
      }

      #ss-content {
        position: relative; z-index: 2;
        width: min(900px, 94vw); padding: 2.5rem 2rem;
        border: 1px solid rgba(74,246,38,0.22);
        box-shadow: 0 0 40px rgba(74,246,38,0.08), inset 0 0 60px rgba(0,0,0,0.4);
        margin: 2rem auto;
      }

      #ss-header { text-align: center; margin-bottom: 2.2rem; }
      #ss-title {
        font-size: clamp(2.2rem, 6vw, 3.6rem);
        letter-spacing: 0.22em; color: #fff;
        text-shadow: 0 0 30px rgba(155,255,79,0.55);
      }
      #ss-title span { color: #9bff4f; }
      #ss-version {
        font-size: 0.78rem; letter-spacing: 0.18em;
        color: rgba(155,255,79,0.55); margin-top: 0.3rem;
      }
      #ss-tagline {
        font-size: 0.72rem; color: rgba(155,255,79,0.35);
        letter-spacing: 0.1em; margin-top: 0.5rem;
      }

      .ss-columns {
        display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;
        margin-bottom: 2rem;
      }
      @media (max-width: 640px) { .ss-columns { grid-template-columns: 1fr; } }

      .ss-section-label {
        font-size: 0.68rem; letter-spacing: 0.12em;
        color: rgba(155,255,79,0.5); margin-bottom: 1.2rem;
      }
      .ss-manual-toggle { cursor: pointer; user-select: none; }
      .ss-manual-toggle:hover { color: #9bff4f; }

      .ss-field { margin-bottom: 1.2rem; }
      .ss-label {
        display: block; font-size: 0.65rem; letter-spacing: 0.1em;
        color: rgba(155,255,79,0.6); margin-bottom: 0.4rem;
      }
      .ss-input {
        width: 100%; background: rgba(0,20,10,0.8);
        border: 1px solid rgba(74,246,38,0.3); color: #9bff4f;
        font-family: 'Courier New', monospace; font-size: 0.95rem;
        padding: 0.5rem 0.75rem; outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .ss-input:focus { border-color: rgba(74,246,38,0.7); }
      .ss-input::placeholder { color: rgba(155,255,79,0.2); }

      .ss-diff-group { display: flex; gap: 0.5rem; }
      .ss-diff-btn {
        flex: 1; background: rgba(0,20,10,0.6);
        border: 1px solid rgba(74,246,38,0.2); color: rgba(155,255,79,0.5);
        font-family: 'Courier New', monospace; font-size: 0.7rem;
        padding: 0.55rem 0.3rem; cursor: pointer; text-align: center;
        transition: all 0.2s; letter-spacing: 0.04em;
        display: flex; flex-direction: column; gap: 0.25rem;
      }
      .ss-diff-btn:hover { border-color: rgba(74,246,38,0.5); color: rgba(155,255,79,0.8); }
      .ss-diff-btn.active {
        border-color: #9bff4f; color: #9bff4f;
        background: rgba(74,246,38,0.08);
        box-shadow: 0 0 12px rgba(74,246,38,0.15);
      }
      .diff-name { font-size: 0.78rem; font-weight: bold; }
      .diff-desc { font-size: 0.6rem; color: inherit; opacity: 0.7; }

      .ss-manual-content {
        display: none; font-size: 0.75rem; line-height: 1.7;
        color: rgba(155,255,79,0.7); border-left: 2px solid rgba(74,246,38,0.2);
        padding-left: 1rem; margin-top: 0.5rem;
      }
      .ss-manual-content p { margin: 0 0 0.9rem; }
      .ss-manual-content em { font-style: normal; color: #9bff4f; }
      .ss-kw { color: #fff; font-size: 0.68rem; letter-spacing: 0.1em; }

      #ss-actions {
        display: flex; gap: 1rem; justify-content: center;
        margin-top: 0.5rem; flex-wrap: wrap;
      }
      .ss-btn {
        font-family: 'Courier New', monospace; font-size: 0.95rem;
        padding: 0.7rem 2.2rem; cursor: pointer; letter-spacing: 0.12em;
        transition: all 0.2s; border: 1px solid;
      }
      .ss-btn-primary {
        background: rgba(74,246,38,0.1); border-color: #9bff4f; color: #9bff4f;
      }
      .ss-btn-primary:hover {
        background: rgba(74,246,38,0.2); box-shadow: 0 0 20px rgba(74,246,38,0.3);
        color: #fff;
      }
      .ss-btn-secondary {
        background: transparent; border-color: rgba(74,246,38,0.35);
        color: rgba(155,255,79,0.6);
      }
      .ss-btn-secondary:hover {
        border-color: rgba(74,246,38,0.6); color: rgba(155,255,79,0.9);
      }

      #ss-footer {
        text-align: center; font-size: 0.6rem;
        color: rgba(155,255,79,0.2); margin-top: 2rem;
        letter-spacing: 0.08em;
      }

      /* Landscape mobile: viewport bajo (~360–520px de alto) */
      @media (max-height: 520px) {
        #ss-content {
          padding: 0.7rem 1.2rem;
          margin: 0.2rem auto;
        }
        #ss-header { margin-bottom: 0.4rem; }
        #ss-title { font-size: clamp(1.4rem, 5vw, 2rem); }
        #ss-version { display: none; }
        #ss-tagline { font-size: 0.6rem; margin-top: 0.15rem; }
        .ss-columns { gap: 1rem; margin-bottom: 0.6rem; }
        .ss-section-label { margin-bottom: 0.5rem; }
        .ss-field { margin-bottom: 0.5rem; }
        .ss-input { padding: 0.35rem 0.6rem; font-size: 0.85rem; }
        .ss-diff-btn { padding: 0.3rem 0.15rem; }
        .diff-name { font-size: 0.7rem; }
        .diff-desc { font-size: 0.55rem; }
        #ss-actions { margin-top: 0.3rem; gap: 0.6rem; }
        .ss-btn { padding: 0.45rem 1.4rem; font-size: 0.82rem; }
        #ss-footer { display: none; }
      }
    `;
    document.head.appendChild(style);
  }
}
