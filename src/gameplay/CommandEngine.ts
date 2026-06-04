import type { CommandResult, Scenario } from '../types/game';
import { SCENARIOS } from '../data/scenarios';
import { VirtualFS } from '../core/VirtualFS';

export type { CommandChoice, CommandResult } from '../types/game';

export class CommandEngine {
  private readonly vfs = VirtualFS.getInstance();

  public getScenario(poiId: string): Scenario | null {
    return SCENARIOS[poiId] ?? null;
  }

  /**
   * Normalizes a shell command so that short-flag order doesn't matter.
   * e.g. "netstat -an" === "netstat -na" after normalization.
   * Non-flag args (no leading dash) and long-form args are left in place.
   */
  private static normalize(cmd: string): string {
    const parts = cmd.trim().split(/\s+/);
    const name  = parts[0] ?? '';
    const normalized = parts.slice(1).map(token => {
      // Short flags like -an, -na → sort letters, e.g. -an → -an, -na → -an
      if (/^-[a-zA-Z]{2,}$/.test(token)) {
        return '-' + [...token.slice(1)].sort().join('');
      }
      return token;
    });
    return [name, ...normalized].join(' ');
  }

  public process(
    command: string,
    poiId: string,
    unlockedObjectives: readonly string[] = [],
  ): CommandResult {
    const raw = command.trim();
    const norm = CommandEngine.normalize(raw);

    // ── 1. Narrative: exact match against the POI's correct command ──────
    const scenario = SCENARIOS[poiId];
    if (scenario !== undefined && norm === CommandEngine.normalize(scenario.correctCommand)) {
      const requirements = scenario.requiredObjectives ?? [];
      const hasAll = requirements.every(r => unlockedObjectives.includes(r));

      if (!hasAll) {
        return {
          success: false,
          feedback: scenario.failOutput,
        };
      }

      return {
        success: true,
        feedback: scenario.successOutput,
        conclusion: scenario.conclusion,
        objectiveId: scenario.objectiveId,
      };
    }

    // ── 1b. Second narrative command (multi-step terminals) ──────────────
    if (
      scenario !== undefined &&
      scenario.secondCommand !== undefined &&
      norm === CommandEngine.normalize(scenario.secondCommand)
    ) {
      const requirements = scenario.secondRequiredObjectives ?? [];
      const hasAll = requirements.every(r => unlockedObjectives.includes(r));

      if (!hasAll) {
        return {
          success: false,
          feedback: '[ERROR] Acceso denegado. Completá los pasos anteriores primero.',
        };
      }

      return {
        success: true,
        feedback: scenario.secondSuccessOutput ?? '',
        conclusion: scenario.secondConclusion,
        objectiveId: scenario.secondObjectiveId,
        unlocksDoor: scenario.secondUnlocksDoor,
      };
    }

    // ── 2. Generic VFS command ───────────────────────────────────────────
    const vfsResult = this.vfs.tryExecute(raw);
    if (vfsResult !== null) return vfsResult;

    // ── 3. Unknown command ───────────────────────────────────────────────
    const cmd = raw.split(' ')[0] ?? raw;
    return {
      success: false,
      feedback: `bash: ${cmd}: command not found`,
    };
  }
}
