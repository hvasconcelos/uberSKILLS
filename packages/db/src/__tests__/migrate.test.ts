import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../migrate";

const TEST_DIR = resolve(process.cwd(), "data/test-migrate");
const TEST_DB_URL = "file:data/test-migrate/migrate-test.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-migrate/migrate-test.db");

describe("migrate", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("creates all tables defined in the schema", () => {
    runMigrations(TEST_DB_URL);

    const sqlite = new BetterSqlite3(TEST_DB_PATH);
    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      "models",
      "settings",
      "skill_files",
      "skill_versions",
      "skills",
      "test_runs",
    ]);

    sqlite.close();
  });

  it("creates indexes defined in the schema", () => {
    runMigrations(TEST_DB_URL);

    const sqlite = new BetterSqlite3(TEST_DB_PATH);
    const indexes = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
      )
      .all() as { name: string }[];

    const indexNames = indexes.map((i) => i.name).sort();
    expect(indexNames).toContain("idx_skills_slug");
    expect(indexNames).toContain("idx_skills_status");
    expect(indexNames).toContain("idx_skills_updated_at");
    expect(indexNames).toContain("idx_skill_files_skill_id");
    expect(indexNames).toContain("idx_skill_versions_skill_id_version");
    expect(indexNames).toContain("idx_test_runs_skill_id");
    expect(indexNames).toContain("idx_test_runs_created_at");

    sqlite.close();
  });

  it("is idempotent — running twice does not throw", () => {
    runMigrations(TEST_DB_URL);
    expect(() => runMigrations(TEST_DB_URL)).not.toThrow();
  });

  it("auto-creates the database directory", () => {
    expect(existsSync(TEST_DIR)).toBe(false);
    runMigrations(TEST_DB_URL);
    expect(existsSync(TEST_DIR)).toBe(true);
  });

  it("skips migration for non-file URLs with a warning", () => {
    expect(() => runMigrations("libsql://test-db.turso.io")).not.toThrow();
  });
});
