import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seed } from "../seed";

const TEST_DIR = resolve(process.cwd(), "data/test-seed");
const TEST_DB_URL = "file:data/test-seed/seed-test.db";
const TEST_DB_PATH = resolve(process.cwd(), "data/test-seed/seed-test.db");

describe("seed", () => {
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

  it("inserts 3-5 sample skills into an empty database", async () => {
    await seed(TEST_DB_URL);

    const sqlite = new BetterSqlite3(TEST_DB_PATH);
    const rows = sqlite.prepare("SELECT * FROM skills").all() as { name: string }[];

    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.length).toBeLessThanOrEqual(5);

    sqlite.close();
  });

  it("seeds skills with required fields populated", async () => {
    await seed(TEST_DB_URL);

    const sqlite = new BetterSqlite3(TEST_DB_PATH);
    const rows = sqlite.prepare("SELECT * FROM skills").all() as {
      name: string;
      slug: string;
      description: string;
      content: string;
      status: string;
    }[];

    for (const row of rows) {
      expect(row.name).toBeTruthy();
      expect(row.slug).toBeTruthy();
      expect(row.description).toBeTruthy();
      expect(row.content).toBeTruthy();
      expect(["draft", "ready", "deployed"]).toContain(row.status);
    }

    sqlite.close();
  });

  it("is idempotent — does not duplicate skills on second run", async () => {
    await seed(TEST_DB_URL);
    await seed(TEST_DB_URL);

    const sqlite = new BetterSqlite3(TEST_DB_PATH);
    const rows = sqlite.prepare("SELECT * FROM skills").all();

    expect(rows.length).toBe(5);

    sqlite.close();
  });

  it("skips seed for non-file URLs", async () => {
    // Should not throw
    await expect(seed("libsql://test-db.turso.io")).resolves.not.toThrow();
  });
});
