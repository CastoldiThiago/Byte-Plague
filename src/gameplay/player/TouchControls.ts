import { GameStateManager } from '../../core/GameStateManager';

interface TouchControlsOptions {
  setMovement: (forward: boolean, backward: boolean, left: boolean, right: boolean) => void;
  applyLook: (deltaYaw: number, deltaPitch: number) => void;
}

interface FocusDetail {
  poiId: string;
  poiLabel?: string;
  distance: number;
}

const INTERACTION_RANGE = 2.4; // mirrors InteractionManager.interactionRange
const LOOK_SENSITIVITY = 0.0025;
const JOYSTICK_RADIUS = 50;
const MOVE_THRESHOLD = 0.3;

// ── TouchControls ────────────────────────────────────────────────────────
// Adaptador de input táctil: alimenta PlayerController (joystick + drag-look)
// y dispatcha los mismos CustomEvent/KeyboardEvent que ya consumen
// InteractionManager, NotesPanel, EvasionItemManager y PauseMenu.

export class TouchControls {
  private readonly options: TouchControlsOptions;

  private readonly root: HTMLDivElement;
  private readonly lookZone: HTMLDivElement;
  private readonly joystickZone: HTMLDivElement;
  private readonly joystickThumb: HTMLDivElement;
  private readonly interactBtn: HTMLButtonElement;

  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };

  private lookTouchId: number | null = null;
  private lookLast = { x: 0, y: 0 };

  public constructor(options: TouchControlsOptions) {
    this.options = options;
    this.injectStyles();
    document.body.classList.add('mobile-mode');

    const built = this.buildDom();
    this.root = built.root;
    this.lookZone = built.lookZone;
    this.joystickZone = built.joystickZone;
    this.joystickThumb = built.joystickThumb;
    this.interactBtn = built.interactBtn;

    document.getElementById('app')!.appendChild(this.root);

    this.lookZone.addEventListener('touchstart', this.onLookStart, { passive: false });
    this.lookZone.addEventListener('touchmove', this.onLookMove, { passive: false });
    this.lookZone.addEventListener('touchend', this.onLookEnd);
    this.lookZone.addEventListener('touchcancel', this.onLookEnd);

    this.joystickZone.addEventListener('touchstart', this.onJoystickStart, { passive: false });
    this.joystickZone.addEventListener('touchmove', this.onJoystickMove, { passive: false });
    this.joystickZone.addEventListener('touchend', this.onJoystickEnd);
    this.joystickZone.addEventListener('touchcancel', this.onJoystickEnd);

    this.interactBtn.addEventListener('touchstart', this.onInteractPress, { passive: false });

    window.addEventListener('poiFocus', this.onPoiFocus);
    window.addEventListener('poiBlur', this.onPoiBlur);
    window.addEventListener('gamePaused', this.onGamePaused);
    window.addEventListener('gameResumed', this.onGameResumed);
  }

  public dispose(): void {
    this.lookZone.removeEventListener('touchstart', this.onLookStart);
    this.lookZone.removeEventListener('touchmove', this.onLookMove);
    this.lookZone.removeEventListener('touchend', this.onLookEnd);
    this.lookZone.removeEventListener('touchcancel', this.onLookEnd);

    this.joystickZone.removeEventListener('touchstart', this.onJoystickStart);
    this.joystickZone.removeEventListener('touchmove', this.onJoystickMove);
    this.joystickZone.removeEventListener('touchend', this.onJoystickEnd);
    this.joystickZone.removeEventListener('touchcancel', this.onJoystickEnd);

    this.interactBtn.removeEventListener('touchstart', this.onInteractPress);

    window.removeEventListener('poiFocus', this.onPoiFocus);
    window.removeEventListener('poiBlur', this.onPoiBlur);
    window.removeEventListener('gamePaused', this.onGamePaused);
    window.removeEventListener('gameResumed', this.onGameResumed);

    document.body.classList.remove('mobile-mode');
    this.root.remove();
  }

  // ── DOM ──────────────────────────────────────────────────────────────────

  private buildDom(): {
    root: HTMLDivElement;
    lookZone: HTMLDivElement;
    joystickZone: HTMLDivElement;
    joystickThumb: HTMLDivElement;
    interactBtn: HTMLButtonElement;
  } {
    const root = document.createElement('div');
    root.id = 'touch-controls';

    const lookZone = document.createElement('div');
    lookZone.id = 'touch-look-zone';

    const joystickZone = document.createElement('div');
    joystickZone.id = 'touch-joystick-zone';
    const joystickBase = document.createElement('div');
    joystickBase.id = 'touch-joystick-base';
    const joystickThumb = document.createElement('div');
    joystickThumb.id = 'touch-joystick-thumb';
    joystickZone.appendChild(joystickBase);
    joystickZone.appendChild(joystickThumb);

    const interactBtn = document.createElement('button');
    interactBtn.id = 'touch-interact-btn';
    interactBtn.textContent = 'E';

    const actionBar = document.createElement('div');
    actionBar.id = 'touch-action-bar';
    actionBar.appendChild(this.createActionButton('N', this.dispatchKey('KeyN')));
    actionBar.appendChild(this.createActionButton('H', this.dispatchKey('KeyH')));
    actionBar.appendChild(this.createActionButton('1', this.dispatchKey(undefined, '1')));
    actionBar.appendChild(this.createActionButton('2', this.dispatchKey(undefined, '2')));
    actionBar.appendChild(this.createActionButton('3', this.dispatchKey(undefined, '3')));
    actionBar.appendChild(this.createActionButton('II', this.onPausePress));

    root.appendChild(lookZone);
    root.appendChild(joystickZone);
    root.appendChild(interactBtn);
    root.appendChild(actionBar);

    return { root, lookZone, joystickZone, joystickThumb, interactBtn };
  }

  private createActionButton(label: string, onPress: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onPress();
    }, { passive: false });
    return btn;
  }

  private dispatchKey(code?: string, key?: string): () => void {
    return () => {
      const init: KeyboardEventInit = {};
      if (code !== undefined) init.code = code;
      if (key !== undefined) init.key = key;
      window.dispatchEvent(new KeyboardEvent('keydown', init));
    };
  }

  // ── Pause ────────────────────────────────────────────────────────────────

  private readonly onPausePress = (): void => {
    if (this.isInputBlocked()) return;
    GameStateManager.getInstance().setPaused(true);
    window.dispatchEvent(new CustomEvent('gamePaused'));
  };

  private readonly onGamePaused = (): void => {
    this.root.classList.add('hidden');
    this.resetJoystick();
    this.lookTouchId = null;
  };

  private readonly onGameResumed = (): void => {
    this.root.classList.remove('hidden');
  };

  // ── Interact button ──────────────────────────────────────────────────────

  private readonly onPoiFocus = (event: Event): void => {
    const { distance } = (event as CustomEvent<FocusDetail>).detail;
    this.interactBtn.classList.toggle('visible', distance <= INTERACTION_RANGE);
  };

  private readonly onPoiBlur = (): void => {
    this.interactBtn.classList.remove('visible');
  };

  private readonly onInteractPress = (e: TouchEvent): void => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  };

  // ── Joystick (movement) ──────────────────────────────────────────────────

  private isInputBlocked(): boolean {
    const gsm = GameStateManager.getInstance();
    return gsm.terminalOpen || gsm.isPaused;
  }

  private readonly onJoystickStart = (e: TouchEvent): void => {
    if (this.isInputBlocked()) return;
    if (this.joystickTouchId !== null) return;
    e.preventDefault();
    const touch = e.changedTouches[0]!;
    this.joystickTouchId = touch.identifier;
    const rect = this.joystickZone.getBoundingClientRect();
    this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.updateJoystick(touch.clientX, touch.clientY);
  };

  private readonly onJoystickMove = (e: TouchEvent): void => {
    const touch = this.findTouch(e.touches, this.joystickTouchId);
    if (touch === null) return;
    e.preventDefault();
    this.updateJoystick(touch.clientX, touch.clientY);
  };

  private readonly onJoystickEnd = (e: TouchEvent): void => {
    const touch = this.findTouch(e.changedTouches, this.joystickTouchId);
    if (touch === null) return;
    this.resetJoystick();
  };

  private resetJoystick(): void {
    this.joystickTouchId = null;
    this.joystickThumb.style.transform = 'translate(0px, 0px)';
    this.options.setMovement(false, false, false, false);
  }

  private updateJoystick(x: number, y: number): void {
    let dx = x - this.joystickCenter.x;
    let dy = y - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    this.joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;

    const nx = dx / JOYSTICK_RADIUS;
    const ny = dy / JOYSTICK_RADIUS;
    this.options.setMovement(
      ny < -MOVE_THRESHOLD, // forward
      ny > MOVE_THRESHOLD,  // backward
      nx < -MOVE_THRESHOLD, // left
      nx > MOVE_THRESHOLD,  // right
    );
  }

  // ── Look (camera rotation) ───────────────────────────────────────────────

  private readonly onLookStart = (e: TouchEvent): void => {
    if (this.isInputBlocked()) return;
    if (this.lookTouchId !== null) return;
    const touch = e.changedTouches[0]!;
    this.lookTouchId = touch.identifier;
    this.lookLast = { x: touch.clientX, y: touch.clientY };
  };

  private readonly onLookMove = (e: TouchEvent): void => {
    const touch = this.findTouch(e.touches, this.lookTouchId);
    if (touch === null) return;
    e.preventDefault();
    const dx = touch.clientX - this.lookLast.x;
    const dy = touch.clientY - this.lookLast.y;
    this.lookLast = { x: touch.clientX, y: touch.clientY };
    this.options.applyLook(dx * LOOK_SENSITIVITY, dy * LOOK_SENSITIVITY);
  };

  private readonly onLookEnd = (e: TouchEvent): void => {
    const touch = this.findTouch(e.changedTouches, this.lookTouchId);
    if (touch === null) return;
    this.lookTouchId = null;
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  private findTouch(touches: TouchList, identifier: number | null): Touch | null {
    if (identifier === null) return null;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]!;
      if (touch.identifier === identifier) return touch;
    }
    return null;
  }

  // ── Styles ───────────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('touch-controls-styles') !== null) return;
    const s = document.createElement('style');
    s.id = 'touch-controls-styles';
    s.textContent = `
      #touch-controls {
        position: fixed; inset: 0; z-index: 50;
        pointer-events: none; touch-action: none;
        font-family: 'Courier New', monospace;
      }
      #touch-controls.hidden { display: none; }

      #touch-look-zone {
        position: absolute; inset: 0;
        pointer-events: auto; touch-action: none;
        z-index: 1;
      }

      #touch-joystick-zone {
        position: absolute; left: 1rem; bottom: 1rem;
        width: 140px; height: 140px;
        pointer-events: auto; touch-action: none;
        z-index: 2;
      }
      #touch-joystick-base {
        position: absolute; inset: 0;
        border-radius: 50%;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(74,246,38,0.35);
      }
      #touch-joystick-thumb {
        position: absolute; left: 50%; top: 50%;
        width: 56px; height: 56px;
        margin: -28px;
        border-radius: 50%;
        background: rgba(74,246,38,0.45);
        border: 1px solid rgba(155,255,79,0.6);
        will-change: transform;
      }

      #touch-interact-btn {
        position: absolute; right: 1.2rem; bottom: 4.5rem;
        width: 64px; height: 64px;
        border-radius: 50%;
        border: 1px solid rgba(155,255,79,0.6);
        background: rgba(0,20,10,0.6);
        color: #9bff4f;
        font-family: 'Courier New', monospace;
        font-size: 1.3rem; font-weight: bold;
        pointer-events: auto; touch-action: none;
        z-index: 2;
        display: none;
        align-items: center; justify-content: center;
      }
      #touch-interact-btn.visible { display: flex; }

      #touch-action-bar {
        position: absolute; top: 1rem; right: 1rem;
        display: flex; gap: 0.5rem;
        pointer-events: auto; z-index: 2;
      }
      #touch-action-bar button {
        min-width: 44px; min-height: 44px;
        border-radius: 8px;
        border: 1px solid rgba(74,246,38,0.35);
        background: rgba(0,20,10,0.6);
        color: #9bff4f;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem; font-weight: bold;
        touch-action: none;
      }
      #touch-action-bar button:active {
        background: rgba(74,246,38,0.25);
      }
    `;
    document.head.appendChild(s);
  }
}
