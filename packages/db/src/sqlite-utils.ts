import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Default database URL used when `DATABASE_URL` is not set.
 */
export const DEFAULT_DATABASE_URL = "file:data/uberskillz.db";

// biome-ignore lint/suspicious/noExplicitAny: Dynamic driver selection requires untyped bridge
type AnyDb = any;

/**
 * Returns `true` when running inside the Bun runtime.
 */
export function isBunRuntime(): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: Bun global is not typed in Node.js
  return typeof (globalThis as any).Bun !== "undefined";
}

/**
 * Resolves a `file:` database URL to an absolute filesystem path
 * and ensures the parent directory exists.
 */
export function resolveFileUrl(url: string): string {
  const relativePath = url.slice("file:".length);
  const absolutePath = resolve(process.cwd(), relativePath);

  const dir = dirname(absolutePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return absolutePath;
}

/**
 * Opens a SQLite database using the appropriate driver for the current runtime.
 *
 * - Bun: `bun:sqlite` + `drizzle-orm/bun-sqlite`
 * - Node.js: `better-sqlite3` + `drizzle-orm/better-sqlite3`
 *
 * @param absolutePath - Resolved filesystem path to the SQLite file.
 * @param schema - Optional Drizzle schema object to pass to `drizzle()`.
 */
export function openSqliteDb(
  absolutePath: string,
  schema?: Record<string, unknown>,
): { db: AnyDb; close: () => void } {
  if (isBunRuntime()) {
    const { Database } = require("bun:sqlite");
    const { drizzle } = require("drizzle-orm/bun-sqlite");
    const sqlite = new Database(absolutePath);
    sqlite.exec("PRAGMA journal_mode = WAL;");
    return { db: drizzle(sqlite, schema ? { schema } : undefined), close: () => sqlite.close() };
  }

  const BetterSqlite3 = require("better-sqlite3");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const sqlite = new BetterSqlite3(absolutePath);
  sqlite.pragma("journal_mode = WAL");
  return { db: drizzle(sqlite, schema ? { schema } : undefined), close: () => sqlite.close() };
}

/**
 * Returns the correct `drizzle-orm` migrator module path for the current runtime.
 */
export function getMigratorPath(): string {
  return isBunRuntime() ? "drizzle-orm/bun-sqlite/migrator" : "drizzle-orm/better-sqlite3/migrator";
}
