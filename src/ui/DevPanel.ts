import { isDevMode } from '../core/DevMode';

export type TeleportCallback = (x: number, y: number, z: number) => void;
export type ToggleCollidersCallback = (ignore: boolean) => void;

export class DevPanel {
  private root: HTMLDivElement;
  private collidersIgnored = false;
  private teleportCb: TeleportCallback;
  private toggleCollidersCb: ToggleCollidersCallback;

  constructor(opts: { teleport: TeleportCallback; toggleColliders: ToggleCollidersCallback }) {
    if (!isDevMode()) throw new Error('DevPanel only allowed in dev mode');
    this.teleportCb = opts.teleport;
    this.toggleCollidersCb = opts.toggleColliders;

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
    `;

    const style = document.createElement('style');
    style.textContent = `
      .dev-panel-overlay { position: fixed; right: 12px; top: 12px; background: rgba(0,0,0,0.6); color: #dfe6f0; font-family: sans-serif; padding: 10px; border-radius: 6px; z-index: 9999; min-width: 220px; }
      .dev-panel-header { font-weight: 700; margin-bottom: 8px; }
      .dev-panel-row { display:flex; gap:6px; margin-bottom:6px; }
      .dev-panel-overlay button { background:#1b1f2a; border:1px solid #3b4150; color:#dfe6f0; padding:6px 8px; border-radius:4px; cursor:pointer; }
      .dev-panel-overlay button:hover { filter:brightness(1.1); }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.root);

    this.root.addEventListener('click', this.onClick);
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

    if (target.id === 'dev-request-lock') {
      window.dispatchEvent(new CustomEvent('devRequestPointerLock'));
      return;
    }

    if (target.id === 'dev-respawn') {
      // simple respawn to entrance
      this.teleportCb(0, 1.7, 6);
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
