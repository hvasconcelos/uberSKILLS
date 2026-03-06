import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// skills — main skill definitions
// ---------------------------------------------------------------------------

export const skills = sqliteTable(
  "skills",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    trigger: text("trigger").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    modelPattern: text("model_pattern"),
    content: text("content").notNull().default(""),
    status: text("status", { enum: ["draft", "ready", "deployed"] })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_skills_slug").on(table.slug),
    index("idx_skills_status").on(table.status),
    index("idx_skills_updated_at").on(table.updatedAt),
  ],
);

// ---------------------------------------------------------------------------
// skill_files — auxiliary files (prompts, resources) belonging to a skill
// ---------------------------------------------------------------------------

export const skillFiles = sqliteTable(
  "skill_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull().default(""),
    type: text("type", { enum: ["prompt", "resource"] })
      .notNull()
      .default("resource"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_skill_files_skill_id").on(table.skillId)],
);

// ---------------------------------------------------------------------------
// skill_versions — point-in-time snapshots of a skill
// ---------------------------------------------------------------------------

export const skillVersions = sqliteTable(
  "skill_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    contentSnapshot: text("content_snapshot").notNull(),
    metadataSnapshot: text("metadata_snapshot").notNull(),
    changeSummary: text("change_summary").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_skill_versions_skill_id_version").on(table.skillId, table.version)],
);

// ---------------------------------------------------------------------------
// test_runs — AI model test execution records
// ---------------------------------------------------------------------------

export const testRuns = sqliteTable(
  "test_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    userMessage: text("user_message").notNull(),
    assistantResponse: text("assistant_response"),
    arguments: text("arguments").notNull().default("{}"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    latencyMs: integer("latency_ms"),
    ttftMs: integer("ttft_ms"),
    status: text("status", { enum: ["running", "completed", "error"] })
      .notNull()
      .default("running"),
    error: text("error"),
    sandboxStateId: text("sandbox_state_id"),
    sandboxResult: text("sandbox_result"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_test_runs_skill_id").on(table.skillId),
    index("idx_test_runs_created_at").on(table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// sandbox_states — predefined filesystem states for sandbox testing
// ---------------------------------------------------------------------------

export const sandboxStates = sqliteTable(
  "sandbox_states",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    zipPath: text("zip_path").notNull(),
    fileIndex: text("file_index").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_sandbox_states_skill_id").on(table.skillId)],
);

// ---------------------------------------------------------------------------
// settings — application configuration key-value store
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// models — cached OpenRouter model catalog
// ---------------------------------------------------------------------------

export const models = sqliteTable(
  "models",
  {
    id: text("id").primaryKey(),
    slug: text("slug"),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    contextLength: integer("context_length"),
    inputPrice: text("input_price"),
    outputPrice: text("output_price"),
    modality: text("modality"),
    syncedAt: integer("synced_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("idx_models_provider").on(table.provider)],
);

// ---------------------------------------------------------------------------
// settings — application configuration key-value store
// ---------------------------------------------------------------------------

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  encrypted: integer("encrypted", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
