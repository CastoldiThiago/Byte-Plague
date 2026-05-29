import type { CommandResult, Scenario } from '../types/game';
import { SCENARIOS } from '../data/scenarios';
import { VirtualFS } from '../core/VirtualFS';

export type { CommandChoice, CommandResult } from '../types/game';

export class CommandEngine {
  private readonly vfs = VirtualFS.getInstance();

  public getScenario(poiId: string): Scenario | null {
    return SCENARIOS[poiId] ?? null;
  }

  public process(
    command: string,
    poiId: string,
    unlockedObjectives: readonly string[] = [],
  ): CommandResult {
    const raw = command.trim();

    // ── 1. Narrative: exact match against the POI's correct command ──────
    const scenario = SCENARIOS[poiId];
    if (scenario !== undefined && raw === scenario.correctCommand) {
      const requirements = scenario.requiredObjectives ?? [];
      const hasAll = requirements.every(r => unlockedObjectives.includes(r));

      if (!hasAll) {
        return {
          success: false,
          feedback:
            '[ERROR] Aun no tienes la informacion necesaria para este salto.\n\n' +
            'Explora primero clientes y soporte-it para obtener ruta y credenciales.',
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
      raw === scenario.secondCommand
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
