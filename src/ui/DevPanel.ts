import { isDevMode } from '../core/DevMode';

export type TeleportCallback = (x: number, y: number, z: number) => void;
export type ToggleCollidersCallback = (ignore: boolean) => void;
export type SkipStageCallback = () => void;

export class DevPanel {
  private root: HTMLDivElement;
  private posDisplay!: HTMLElement;
  private collidersIgnored = false;
  private teleportCb: TeleportCallback;
  private toggleCollidersCb: ToggleCollidersCallback;
  private skipStageCb: SkipStageCallback;
  private skipStage2Cb: SkipStageCallback;
  private lastPos = { x: 0, y: 0, z: 0 };

  constructor(opts: { teleport: TeleportCallback; toggleColliders: ToggleCollidersCallback; skipStage: SkipStageCallback; skipStage2: SkipStageCallback }) {
    if (!isDevMode()) throw new Error('DevPanel only allowed in dev mode');
    this.teleportCb = opts.teleport;
    this.toggleCollidersCb = opts.toggleColliders;
    this.skipStageCb = opts.skipStage;
    this.skipStage2Cb = opts.skipStage2;

    this.root = document.createElement('div');
    this.root.className = 'dev-panel-overlay';
    this.root.innerHTML = `
      <div class="dev-panel-header">Dev Panel</div>
      <div class="dev-panel-row">
        <button data-teleport="entrada">Entrada</button>
        <button data-teleport="clientes">Clientes</button>
        <button data-teleport="soporte">Soporte</button>
        <button data-teleport="red">Red Interna</button>
      </div>
      <div class="dev-panel-row">
        <button id="dev-toggle-colliders">Toggle Collisions</button>
        <button id="dev-request-lock">Request PointerLock</button>
        <button id="dev-respawn">Respawn</button>
      </div>
      <div class="dev-panel-row">
        <button id="dev-skip-stage1">⏩ Skip Etapa 1</button>
        <button id="dev-skip-stage2">⏩ Skip Etapa 2</button>
      </div>
      <div class="dev-pos-box">
        <span id="dev-pos-label">X 0.00  Y 0.00  Z 0.00</span>
        <button id="dev-copy-pos" title="Copiar coordenadas">📋</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .dev-panel-overlay { position: fixed; right: 12px; top: 12px; background: rgba(0,0,0,0.6); color: #dfe6f0; font-family: monospace; padding: 10px; border-radius: 6px; z-index: 9999; min-width: 220px; }
      .dev-panel-header { font-weight: 700; margin-bottom: 8px; font-family: sans-serif; }
      .dev-panel-row { display:flex; gap:6px; margin-bottom:6px; }
      .dev-panel-overlay button { background:#1b1f2a; border:1px solid #3b4150; color:#dfe6f0; padding:6px 8px; border-radius:4px; cursor:pointer; font-family:sans-serif; }
      .dev-panel-overlay button:hover { filter:brightness(1.3); }
      .dev-pos-box { display:flex; align-items:center; gap:6px; margin-top:6px; padding-top:6px; border-top:1px solid #3b4150; }
      #dev-pos-label { flex:1; font-size:12px; color:#7fefb0; letter-spacing:0.04em; }
      #dev-copy-pos { padding:4px 6px; font-size:13px; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.root);

    this.posDisplay = this.root.querySelector('#dev-pos-label')!;
    this.root.addEventListener('click', this.onClick);
  }

  public setPosition(x: number, y: number, z: number): void {
    this.lastPos = { x, y, z };
    this.posDisplay.textContent =
      `X ${x.toFixed(2)}  Y ${y.toFixed(2)}  Z ${z.toFixed(2)}`;
  }

  private readonly onClick = (ev: MouseEvent): void => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const tp = target.getAttribute?.('data-teleport');
    if (tp) {
      this.handleTeleport(tp);
      return;
    }

    if (target.id === 'dev-toggle-colliders') {
      this.collidersIgnored = !this.collidersIgnored;
      this.toggleCollidersCb(this.collidersIgnored);
      target.textContent = this.collidersIgnored ? 'Collisions: OFF' : 'Toggle Collisions';
      return;
    }

    if (target.id === 'dev-copy-pos') {
      const { x, y, z } = this.lastPos;
      const text = `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
      void navigator.clipboard.writeText(text);
      target.textContent = '✓';
      setTimeout(() => { target.textContent = '📋'; }, 1000);
      return;
    }

    if (target.id === 'dev-request-lock') {
      window.dispatchEvent(new CustomEvent('devRequestPointerLock'));
      return;
    }

    if (target.id === 'dev-respawn') {
      // simple respawn to entrance
      this.teleportCb(0, 1.7, 6);
      return;
    }

    if (target.id === 'dev-skip-stage1') {
      this.skipStageCb();
      target.textContent = '✓ Etapa 1 salteada';
      (target as HTMLButtonElement).disabled = true;
      return;
    }

    if (target.id === 'dev-skip-stage2') {
      this.skipStage2Cb();
      target.textContent = '✓ Etapa 2 salteada';
      (target as HTMLButtonElement).disabled = true;
      return;
    }
  };

  private handleTeleport(key: string): void {
    // Positions mirror WorldBuilder room Zs
    switch (key) {
      case 'entrada':
        this.teleportCb(0, 1.7, 6);
        break;
      case 'clientes':
        this.teleportCb(0, 1.7, -5);
        break;
      case 'soporte':
        this.teleportCb(0, 1.7, -15);
        break;
      case 'red':
        this.teleportCb(0, 1.7, -25);
        break;
      default:
        break;
    }
  }

  public dispose(): void {
    this.root.removeEventListener('click', this.onClick);
    if (this.root.parentElement) this.root.parentElement.removeChild(this.root);
  }
}
