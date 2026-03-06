/** Metadata for a file within a sandbox zip (used for the file index). */
export interface SandboxFileEntry {
  /** Relative path within the zip, e.g. "src/index.ts". */
  path: string;
  /** File size in bytes. */
  size: number;
  /** Whether the file is a text file (vs. binary). */
  isText: boolean;
}

/** A single bash command execution recorded during a sandbox test run. */
export interface SandboxToolCall {
  /** The bash command that was executed. */
  command: string;
  /** Combined stdout + stderr output. */
  output: string;
  /** Unix timestamp (ms) when execution started. */
  timestamp: number;
  /** Execution duration in milliseconds. */
  durationMs: number;
}

/** Persisted sandbox state associated with a skill. */
export interface SandboxState {
  id: string;
  skillId: string;
  /** Human-readable name, e.g. "Node.js project with bug". */
  name: string;
  /** Path to the stored input zip on disk. */
  zipPath: string;
  /** Index of files in the zip for quick UI rendering. */
  fileIndex: SandboxFileEntry[];
  createdAt: Date;
}

/** Result of a sandbox test run, persisted alongside the test run. */
export interface SandboxResult {
  /** Path to the output zip on disk. */
  outputZipPath: string;
  /** Index of files in the output zip. */
  outputFileIndex: SandboxFileEntry[];
  /** Ordered log of all bash commands executed during the run. */
  toolCalls: SandboxToolCall[];
}
