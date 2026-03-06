import { desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { sandboxStates } from "../schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields accepted when creating a new sandbox state. */
export interface CreateSandboxStateInput {
  skillId: string;
  name: string;
  zipPath: string;
  fileIndex: string;
}

// ---------------------------------------------------------------------------
// CRUD functions
// ---------------------------------------------------------------------------

/**
 * Lists all sandbox states for a skill, sorted by `created_at` descending.
 */
export function listSandboxStates(skillId: string): (typeof sandboxStates.$inferSelect)[] {
  const db = getDb();
  return db
    .select()
    .from(sandboxStates)
    .where(eq(sandboxStates.skillId, skillId))
    .orderBy(desc(sandboxStates.createdAt))
    .all();
}

/**
 * Returns a single sandbox state by its ID, or `null` if not found.
 */
export function getSandboxState(id: string): typeof sandboxStates.$inferSelect | null {
  const db = getDb();
  return db.select().from(sandboxStates).where(eq(sandboxStates.id, id)).get() ?? null;
}

/**
 * Creates a new sandbox state record.
 */
export function createSandboxState(
  input: CreateSandboxStateInput,
): typeof sandboxStates.$inferSelect {
  const db = getDb();

  const rows = db
    .insert(sandboxStates)
    .values({
      skillId: input.skillId,
      name: input.name,
      zipPath: input.zipPath,
      fileIndex: input.fileIndex,
      createdAt: new Date(),
    })
    .returning()
    .all();

  return rows[0] as typeof sandboxStates.$inferSelect;
}

/**
 * Deletes a sandbox state by ID. Returns true if a row was deleted.
 */
export function deleteSandboxState(id: string): boolean {
  const db = getDb();
  const result = db.delete(sandboxStates).where(eq(sandboxStates.id, id)).run();
  return result.changes > 0;
}
