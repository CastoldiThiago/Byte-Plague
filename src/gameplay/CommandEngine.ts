import type { CommandResult, Scenario } from '../types/game';
import { SCENARIOS } from '../data/scenarios';

export type { CommandChoice, CommandResult } from '../types/game';

export class CommandEngine {
  public getScenario(poiId: string): Scenario | null {
    return SCENARIOS[poiId] ?? null;
  }

  public process(
    command: string,
    poiId: string,
    unlockedObjectives: readonly string[] = [],
  ): CommandResult {
    const scenario = SCENARIOS[poiId];

    if (scenario === undefined) {
      return { success: false, feedback: `Puerta '${poiId}' no reconocida.` };
    }

    if (command !== scenario.correctCommand) {
      return {
        success: false,
        feedback: `${scenario.failOutput}\n\n${scenario.prompt}`,
      };
    }

    const requirements = scenario.requiredObjectives ?? [];
    const hasAllRequirements = requirements.every(req => unlockedObjectives.includes(req));

    if (!hasAllRequirements) {
      return {
        success: false,
        feedback:
          '[ERROR] Aun no tienes la informacion necesaria para este salto.\n\nExplora primero clientes y soporte-it para obtener ruta y credenciales.',
      };
    }

    return {
      success: true,
      feedback: scenario.successOutput,
      conclusion: scenario.conclusion,
      objectiveId: scenario.objectiveId,
    };
  }
}
