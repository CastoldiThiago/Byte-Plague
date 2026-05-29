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
}
