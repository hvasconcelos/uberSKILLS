/** Status of a test run execution. */
export type TestRunStatus = "running" | "completed" | "error";

/** A single test execution of a skill against an AI model. */
export interface TestRun {
  id: string;
  skillId: string;
  /** Model identifier, e.g. "anthropic/claude-sonnet-4". */
  model: string;
  systemPrompt: string;
  userMessage: string;
  /** Model response; null while streaming or if an error occurred. */
  assistantResponse: string | null;
  /** Substituted $VARIABLE_NAME arguments used in this run. */
  arguments: Record<string, string>;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  /** Total response time in milliseconds. */
  latencyMs: number | null;
  /** Time to first token in milliseconds. */
  ttftMs: number | null;
  status: TestRunStatus;
  /** Error message when status is "error". */
  error: string | null;
  /** ID of the sandbox state used for this run (null if no sandbox). */
  sandboxStateId: string | null;
  /** JSON-serialized SandboxResult (null if no sandbox or not yet complete). */
  sandboxResult: string | null;
  createdAt: Date;
}
