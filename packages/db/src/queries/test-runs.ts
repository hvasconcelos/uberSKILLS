import type { TestRunStatus } from "@uberskills/types";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { testRuns } from "../schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields accepted when creating a new test run. */
export interface CreateTestRunInput {
  skillId: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  /** JSON-serialized substitution arguments (default: "{}"). */
  arguments?: string;
  status?: TestRunStatus;
  /** Optional sandbox state ID if this run uses a sandbox. */
  sandboxStateId?: string;
}

/** Fields accepted when updating an existing test run (all optional). */
export interface UpdateTestRunInput {
  assistantResponse?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  ttftMs?: number | null;
  status?: TestRunStatus;
  error?: string | null;
  /** JSON-serialized SandboxResult. */
  sandboxResult?: string | null;
}

// ---------------------------------------------------------------------------
// CRUD functions
// ---------------------------------------------------------------------------

/**
 * Lists all test runs for a skill, sorted by `created_at` descending (newest first).
 */
export function listTestRuns(skillId: string): (typeof testRuns.$inferSelect)[] {
  const db = getDb();
  return db
    .select()
    .from(testRuns)
    .where(eq(testRuns.skillId, skillId))
    .orderBy(desc(testRuns.createdAt))
    .all();
}

/**
 * Returns a single test run by its ID, or `null` if not found.
 */
export function getTestRun(id: string): typeof testRuns.$inferSelect | null {
  const db = getDb();
  return db.select().from(testRuns).where(eq(testRuns.id, id)).get() ?? null;
}

/**
 * Creates a new test run record. Typically created with `status: "running"`
 * before the AI response starts streaming, then updated on completion or error.
 */
export function createTestRun(input: CreateTestRunInput): typeof testRuns.$inferSelect {
  const db = getDb();

  const rows = db
    .insert(testRuns)
    .values({
      skillId: input.skillId,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
      arguments: input.arguments ?? "{}",
      status: input.status ?? "running",
      sandboxStateId: input.sandboxStateId ?? null,
      createdAt: new Date(),
    })
    .returning()
    .all();

  return rows[0] as typeof testRuns.$inferSelect;
}

/**
 * Partially updates a test run by ID. Used to record the AI response,
 * token metrics, and final status after streaming completes.
 *
 * Returns the updated test run, or `null` if not found.
 */
export function updateTestRun(
  id: string,
  input: UpdateTestRunInput,
): typeof testRuns.$inferSelect | null {
  const db = getDb();

  const updates: Record<string, unknown> = {};

  if (input.assistantResponse !== undefined) updates.assistantResponse = input.assistantResponse;
  if (input.promptTokens !== undefined) updates.promptTokens = input.promptTokens;
  if (input.completionTokens !== undefined) updates.completionTokens = input.completionTokens;
  if (input.totalTokens !== undefined) updates.totalTokens = input.totalTokens;
  if (input.latencyMs !== undefined) updates.latencyMs = input.latencyMs;
  if (input.ttftMs !== undefined) updates.ttftMs = input.ttftMs;
  if (input.status !== undefined) updates.status = input.status;
  if (input.error !== undefined) updates.error = input.error;
  if (input.sandboxResult !== undefined) updates.sandboxResult = input.sandboxResult;

  if (Object.keys(updates).length === 0) {
    return getTestRun(id);
  }

  const [updated] = db.update(testRuns).set(updates).where(eq(testRuns.id, id)).returning().all();

  return updated ?? null;
}
