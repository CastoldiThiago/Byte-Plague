export interface CommandChoice {
  command: string;
  description: string;
}

export interface CommandResult {
  success: boolean;
  feedback: string;
  conclusion?: string;
  objectiveId?: string;
}

export interface Scenario {
  label: string;
  prompt: string;
  choices: readonly CommandChoice[];
  correctCommand: string;
  successOutput: string;
  conclusion: string;
  failOutput: string;
  hint?: string;     // comentario mostrado en la terminal al abrir el POI
  helpText?: string; // respuesta al comando /help
  objectiveId?: string;
  requiredObjectives?: readonly string[];
}
