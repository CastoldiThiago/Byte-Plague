import { GameStateManager } from '../core/GameStateManager';
import type { AntivirusAgent } from './AntivirusAgent';

// ── Item definitions ───────────────────────────────────────────────────────

const ITEMS = [
  {
    key: '1',
    objectiveId: 'item-traffic-spoof',
    name: 'traffic_spoof.exe',
    effect: 'Envía el drone al extremo del mapa (pasillo Documents)',
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
    effect: 'El cono de detección queda ciego temporalmente',
    duration: 10,
  },
] as const;

type ItemDef = (typeof ITEMS)[number];

// ── EvasionItemManager ─────────────────────────────────────────────────────

export class EvasionItemManager {
  private readonly agent: AntivirusAgent;
  private readonly panel: HTMLDivElement;
  private readonly itemsContainer: HTMLDivElement;

  private readonly activeUntil: Record<string, number> = {};
  private readonly usesLeft: Record<string, number> = {};
  private static readonly MAX_USES = 2;
  private chaseMode = false;
  private readonly activeIntervals: number[] = [];

  public constructor(agent: AntivirusAgent) {
    this.agent = agent;
    this.injectStyles();
    const built = this.buildPanel();
    this.panel = built.panel;
    this.itemsContainer = built.container;
    this.buildSlots(); // keep compact slots in NotesPanel

    window.addEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('encryptionEnabled', this.onChaseStart);
    window.addEventListener('keydown', this.onToggleKey);
  }

  public dispose(): void {
    window.removeEventListener('objectiveUnlocked', this.onObjectiveUnlocked);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('encryptionEnabled', this.onChaseStart);
    window.removeEventListener('keydown', this.onToggleKey);
    for (const id of this.activeIntervals) window.clearInterval(id);
    this.activeIntervals.length = 0;
    this.panel.remove();
  }

  // ── Panel construction ─────────────────────────────────────────────

  private buildPanel(): { panel: HTMLDivElement; container: HTMLDivElement } {
    const panel = document.createElement('div');
    panel.id = 'tools-panel';

    const header = document.createElement('div');
    header.id = 'tools-panel-header';
    header.textContent = '> HERRAMIENTAS';

    const container = document.createElement('div');
    container.id = 'tools-panel-items';

    const hint = document.createElement('div');
    hint.id = 'tools-panel-hint';
    hint.textContent = 'Explorá el mapa para obtener herramientas de evasión.';

    panel.appendChild(header);
    panel.appendChild(container);
    panel.appendChild(hint);
    document.body.appendChild(panel);

    return { panel, container };
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
    this.addToolCard(item);
    this.refreshSlot(item);

    // Hide the "no tools yet" hint once first item arrives
    const hint = document.getElementById('tools-panel-hint');
    if (hint !== null) hint.style.display = 'none';
  };

  private panelVisible = true;

  private readonly onToggleKey = (e: KeyboardEvent): void => {
    if (GameStateManager.getInstance().terminalOpen) return;
    if (e.code !== 'KeyH') return;
    this.panelVisible = !this.panelVisible;
    this.panel.style.display = this.panelVisible ? '' : 'none';
  };

  private readonly onChaseStart = (): void => {
    this.chaseMode = true;
    this.panel.style.opacity = '0.35';
    this.panel.style.pointerEvents = 'none';
    document.querySelectorAll<HTMLElement>('.item-slot').forEach(s => {
      s.style.opacity = '0.35';
      s.style.pointerEvents = 'none';
    });
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.chaseMode) return;
    const gsm = GameStateManager.getInstance();
    if (gsm.terminalOpen || gsm.isPaused) return;

    const item = ITEMS.find(i => i.key === e.key);
    if (item === undefined) return;
    if (!gsm.objectivesCompleted.includes(item.objectiveId)) return;

    const now = Date.now();
    if ((this.activeUntil[item.objectiveId] ?? 0) > now) return;
    if ((this.usesLeft[item.objectiveId] ?? 0) <= 0) return;

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
    this.usesLeft[item.objectiveId] = Math.max(0, (this.usesLeft[item.objectiveId] ?? 0) - 1);
    this.updateUsesDisplay(item);
    this.startCooldown(item, item.duration);
  }

  // ── Left panel card ────────────────────────────────────────────────

  private addToolCard(item: ItemDef): void {
    this.usesLeft[item.objectiveId] = EvasionItemManager.MAX_USES;

    const card = document.createElement('div');
    card.className = 'tool-card';
    card.dataset.objective = item.objectiveId;
    card.innerHTML = `
      <div class="tool-card-top">
        <span class="tool-card-key">[${item.key}]</span>
        <span class="tool-card-name">${item.name}</span>
        <span class="tool-card-uses">${EvasionItemManager.MAX_USES}/${EvasionItemManager.MAX_USES}</span>
      </div>
      <div class="tool-card-effect">${item.effect}</div>
      <div class="tool-card-meta">Duración: ${item.duration}s &nbsp;·&nbsp; Presioná <strong>${item.key}</strong></div>
      <div class="tool-card-status" style="display:none"></div>
    `;
    card.classList.add('tool-card--new');
    setTimeout(() => card.classList.remove('tool-card--new'), 2000);

    this.itemsContainer.appendChild(card);
  }

  private updateUsesDisplay(item: ItemDef): void {
    const card = this.itemsContainer.querySelector<HTMLElement>(
      `[data-objective="${item.objectiveId}"]`,
    );
    if (card === null) return;
    const uses = this.usesLeft[item.objectiveId] ?? 0;
    const usesEl = card.querySelector<HTMLElement>('.tool-card-uses');
    if (usesEl !== null) {
      usesEl.textContent = `${uses}/${EvasionItemManager.MAX_USES}`;
      usesEl.style.color = uses === 0 ? 'rgba(200,80,80,0.7)' : '';
    }
    if (uses <= 0) {
      card.classList.add('tool-card--depleted');
      const metaEl = card.querySelector<HTMLElement>('.tool-card-meta');
      if (metaEl !== null) metaEl.textContent = 'Sin usos restantes';
    }
  }

  private startCooldown(item: ItemDef, seconds: number): void {
    const card = this.itemsContainer.querySelector<HTMLElement>(
      `[data-objective="${item.objectiveId}"]`,
    );
    if (card === null) return;

    card.classList.add('tool-card--active');
    const statusEl = card.querySelector<HTMLElement>('.tool-card-status');
    if (statusEl !== null) {
      statusEl.style.display = 'block';
      statusEl.textContent = `ACTIVO — ${seconds}s`;
    }

    let remaining = seconds;
    const tick = window.setInterval(() => {
      remaining--;
      if (statusEl !== null) statusEl.textContent = `ACTIVO — ${remaining}s`;
      if (remaining <= 0) {
        window.clearInterval(tick);
        this.activeIntervals.splice(this.activeIntervals.indexOf(tick), 1);
        card.classList.remove('tool-card--active');
        if (statusEl !== null) statusEl.style.display = 'none';
        this.refreshSlot(item);
      }
    }, 1000);
    this.activeIntervals.push(tick);

    this.markSlotActive(item, seconds);
  }

  // ── NotesPanel slot updates ────────────────────────────────────────

  private refreshSlot(item: ItemDef): void {
    const slot = document.querySelector<HTMLElement>(`[data-objective="${item.objectiveId}"]`);
    if (slot === null) return;
    slot.classList.remove('locked', 'active');
    slot.classList.add('ready');
    const nameEl = slot.querySelector('.item-slot-name');
    if (nameEl !== null) nameEl.textContent = item.name;
  }

  private markSlotActive(item: ItemDef, seconds: number): void {
    const slot = document.querySelector<HTMLElement>(`[data-objective="${item.objectiveId}"]`);
    if (slot === null) return;
    slot.classList.add('active');

    let remaining = seconds;
    const tick = window.setInterval(() => {
      remaining--;
      const nameEl = slot.querySelector('.item-slot-name');
      if (nameEl !== null) nameEl.textContent = `${item.name} (${remaining}s)`;
      if (remaining <= 0) {
        window.clearInterval(tick);
        this.activeIntervals.splice(this.activeIntervals.indexOf(tick), 1);
        slot.classList.remove('active');
        if (nameEl !== null) nameEl.textContent = item.name;
      }
    }, 1000);
    this.activeIntervals.push(tick);
  }

  // ── Styles ─────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('tools-panel-styles')) return;
    const style = document.createElement('style');
    style.id = 'tools-panel-styles';
    style.textContent = `
      #tools-panel {
        position: fixed;
        left: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(4, 14, 8, 0.88);
        border: 1px solid rgba(0, 200, 90, 0.28);
        color: #b8d8c0;
        font-family: 'Courier New', monospace;
        font-size: 0.74rem;
        z-index: 500;
        min-width: 210px;
        max-width: 240px;
        backdrop-filter: blur(3px);
        transition: opacity 0.4s;
      }
      #tools-panel-header {
        padding: 0.45rem 0.75rem;
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        color: rgba(0, 220, 100, 0.6);
        border-bottom: 1px solid rgba(0, 200, 90, 0.15);
      }
      #tools-panel-hint {
        padding: 0.6rem 0.75rem;
        font-size: 0.67rem;
        color: rgba(155, 200, 170, 0.35);
        line-height: 1.5;
      }
      .tool-card {
        padding: 0.55rem 0.75rem;
        border-top: 1px solid rgba(0, 200, 90, 0.1);
        transition: background 0.3s;
      }
      .tool-card + .tool-card { }
      .tool-card--new {
        background: rgba(0, 255, 130, 0.07);
        border-left: 2px solid #00ff88;
      }
      .tool-card--active {
        background: rgba(0, 255, 130, 0.05);
      }
      .tool-card--depleted {
        opacity: 0.35;
        pointer-events: none;
      }
      .tool-card--depleted .tool-card-key {
        color: rgba(200,80,80,0.7);
      }
      .tool-card-top {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
        margin-bottom: 0.25rem;
      }
      .tool-card-uses {
        margin-left: auto;
        font-size: 0.65rem;
        color: rgba(0, 220, 100, 0.55);
        flex-shrink: 0;
      }
      .tool-card-key {
        color: #00ff88;
        font-weight: bold;
        font-size: 0.78rem;
        flex-shrink: 0;
      }
      .tool-card-name {
        color: #dfe6f0;
        font-size: 0.75rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tool-card-effect {
        color: rgba(155, 200, 170, 0.7);
        font-size: 0.68rem;
        line-height: 1.45;
        margin-bottom: 0.25rem;
      }
      .tool-card-meta {
        font-size: 0.63rem;
        color: rgba(155, 200, 170, 0.4);
        letter-spacing: 0.02em;
      }
      .tool-card-status {
        margin-top: 0.3rem;
        font-size: 0.68rem;
        color: #00ff88;
        letter-spacing: 0.06em;
        animation: tool-status-blink 1s ease-in-out infinite;
      }
      @keyframes tool-status-blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }
}
