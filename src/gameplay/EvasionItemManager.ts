import { GameStateManager } from '../core/GameStateManager';
import type { AntivirusAgent } from './AntivirusAgent';

// ── Item definitions ───────────────────────────────────────────────────────

const ITEMS = [
  {
    key: '1',
    objectiveId: 'item-traffic-spoof',
    name: 'traffic_spoof.exe',
    effect: 'Desvía el drone a la zona más lejana del mapa',
    duration: 20,
  },
  {
    key: '2',
    objectiveId: 'item-firewall-rule',
    name: 'firewall_rule.sh',
    effect: 'Congela el drone en su posición actual',
    duration: 15,
  },
  {
    key: '3',
    objectiveId: 'item-stealth-mode',
    name: 'stealth_mode.bin',
    effect: 'El cono de detección queda ciego',
    duration: 10,
  },
] as const;

type ItemDef = (typeof ITEMS)[number];

// ── EvasionItemManager ─────────────────────────────────────────────────────

export class EvasionItemManager {
  private readonly agent: AntivirusAgent;
  private readonly toast: HTMLDivElement;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Per-item active state (used to disable key while effect is running)
  private readonly activeUntil: Record<string, number> = {};

  public constructor(agent: AntivirusAgent) {
    this.agent = agent;
    this.toast = this.buildToast();
    this.buildSlots();

    window.addEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public dispose(): void {
    window.removeEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.toastTimeout !== null) clearTimeout(this.toastTimeout);
    this.toast.remove();
  }

  // ── UI construction ────────────────────────────────────────────────

  private buildToast(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'evasion-toast';
    el.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(5, 15, 25, 0.92);
      border: 1px solid #00ff88;
      color: #dfe6f0;
      font-family: monospace;
      padding: 20px 28px;
      border-radius: 6px;
      z-index: 8000;
      min-width: 340px;
      max-width: 420px;
      display: none;
      line-height: 1.6;
      box-shadow: 0 0 24px rgba(0,255,136,0.25);
    `;
    document.body.appendChild(el);
    return el;
  }

  private buildSlots(): void {
    const container = document.getElementById('item-slots');
    if (container === null) return;

    for (const item of ITEMS) {
      const slot = document.createElement('div');
      slot.className = 'item-slot locked';
      slot.dataset.objective = item.objectiveId;
      slot.innerHTML =
        `<span class="item-slot-key">${item.key}</span>` +
        `<span class="item-slot-name">???</span>`;
      container.appendChild(slot);
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────

  private readonly onObjectiveUnlocked = (e: Event): void => {
    const { id } = (e as CustomEvent<{ id: string }>).detail;
    const item = ITEMS.find(i => i.objectiveId === id);
    if (item === undefined) return;
    this.showToast(item);
    this.refreshSlot(item);
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const gsm = GameStateManager.getInstance();
    if (gsm.terminalOpen || gsm.isPaused) return;

    const item = ITEMS.find(i => i.key === e.key);
    if (item === undefined) return;
    if (!gsm.objectivesCompleted.includes(item.objectiveId)) return;

    const now = Date.now();
    if ((this.activeUntil[item.objectiveId] ?? 0) > now) return; // still cooling down

    this.activateItem(item, now);
  };

  // ── Activation ─────────────────────────────────────────────────────

  private activateItem(item: ItemDef, now: number): void {
    switch (item.objectiveId) {
      case 'item-traffic-spoof':  this.agent.trafficSpoof(); break;
      case 'item-firewall-rule':  this.agent.firewallRule(); break;
      case 'item-stealth-mode':   this.agent.stealthMode();  break;
    }

    this.activeUntil[item.objectiveId] = now + item.duration * 1000;
    this.markSlotActive(item, item.duration);
  }

  // ── Slot updates ───────────────────────────────────────────────────

  private refreshSlot(item: ItemDef): void {
    const slot = document.querySelector<HTMLElement>(
      `[data-objective="${item.objectiveId}"]`,
    );
    if (slot === null) return;
    slot.classList.remove('locked');
    slot.classList.add('ready');
    const nameEl = slot.querySelector('.item-slot-name');
    if (nameEl !== null) nameEl.textContent = item.name;
  }

  private markSlotActive(item: ItemDef, seconds: number): void {
    const slot = document.querySelector<HTMLElement>(
      `[data-objective="${item.objectiveId}"]`,
    );
    if (slot === null) return;
    slot.classList.add('active');

    let remaining = seconds;
    const tick = setInterval(() => {
      remaining--;
      const nameEl = slot.querySelector('.item-slot-name');
      if (nameEl !== null) nameEl.textContent = `${item.name} (${remaining}s)`;
      if (remaining <= 0) {
        clearInterval(tick);
        slot.classList.remove('active');
        if (nameEl !== null) nameEl.textContent = item.name;
      }
    }, 1000);
  }

  // ── Toast notification ─────────────────────────────────────────────

  private showToast(item: ItemDef): void {
    if (this.toastTimeout !== null) clearTimeout(this.toastTimeout);

    this.toast.innerHTML = `
      <div style="color:#00ff88;font-size:11px;letter-spacing:0.12em;margin-bottom:10px;">
        ▼ HERRAMIENTA ENCONTRADA
      </div>
      <div style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:6px;">
        ${item.name}
      </div>
      <div style="border-top:1px solid #1e3a2a;margin:8px 0;"></div>
      <div style="font-size:13px;color:#b0c8b8;margin-bottom:10px;">
        ${item.effect}<br>
        <span style="color:#7fefb0;">Duración: ${item.duration} segundos</span>
      </div>
      <div style="font-size:13px;color:#dfe6f0;">
        Presioná
        <span style="
          background:#1b3a2a;
          border:1px solid #00ff88;
          padding:2px 8px;
          border-radius:3px;
          font-size:14px;
          font-weight:bold;
          color:#00ff88;
        ">${item.key}</span>
        para activar
      </div>
    `;

    this.toast.style.display = 'block';
    this.toastTimeout = setTimeout(() => {
      this.toast.style.display = 'none';
    }, 7000);
  }
}
