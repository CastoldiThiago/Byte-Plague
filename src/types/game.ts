export interface CommandChoice {
  command: string;
  description: string;
}

export interface CommandResult {
  success: boolean;
  feedback: string;
  conclusion?: string;
  objectiveId?: string;
  /** When true, TerminalUI clears the visible history */
  clear?: boolean;
  /** poiId of a barrier to auto-open after this command succeeds */
  unlocksDoor?: string;
}

export type VFSNode =
  | { type: 'file'; content: string; hidden?: boolean }
  | { type: 'dir'; children: Record<string, VFSNode>; hidden?: boolean };

export interface Scenario {
  label: string;
  prompt: string;
  choices: readonly CommandChoice[];
  correctCommand: string;
  successOutput: string;
  conclusion: string;
  failOutput: string;
  hint?: string;
  helpText?: string;
  objectiveId?: string;
  requiredObjectives?: readonly string[];
  /** VFS directory that becomes cwd when this terminal opens */
  basePath: string;
  /** If true, `cd` commands reach VirtualFS (only door terminals); otherwise blocked */
  allowCd?: boolean;
  /** cwd to set in VirtualFS after a successful narrative unlock */
  targetPath?: string;
  // ── Optional second narrative command (multi-step terminals) ─────────
  secondCommand?: string;
  secondRequiredObjectives?: readonly string[];
  secondSuccessOutput?: string;
  secondConclusion?: string;
  secondObjectiveId?: string;
  /** poiId of a barrier to auto-open when secondCommand succeeds */
  secondUnlocksDoor?: string;
  /** Choices shown in very-easy mode for the second step (multi-step terminals) */
  secondChoices?: readonly CommandChoice[];
}
