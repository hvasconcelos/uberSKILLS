import { runMigrations } from "./migrate";
import * as schema from "./schema";
import { DEFAULT_DATABASE_URL, openSqliteDb, resolveFileUrl } from "./sqlite-utils";

// Use a generic type for the db instance since the concrete type depends on the
// driver selected at runtime (bun-sqlite, better-sqlite3, or libsql).
// All Drizzle SQLite instances expose the same synchronous query API surface.
// biome-ignore lint/suspicious/noExplicitAny: Driver-agnostic DB instance requires untyped bridge
type DbInstance = any;

let cachedDb: DbInstance | null = null;

/**
 * Returns a Drizzle ORM database instance, creating one if needed (singleton).
 *
 * On first call, auto-runs pending Drizzle migrations so the database is
 * always up-to-date without requiring a manual migration step.
 *
 * Connection type is auto-detected from `DATABASE_URL`:
 * - `file:` prefix → local SQLite via bun:sqlite (Bun) or better-sqlite3 (Node.js)
 * - `libsql://` prefix → remote Turso via @libsql/client (migrations skipped)
 */
export function getDb(): DbInstance {
  if (cachedDb) {
    return cachedDb;
  }

  const url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  runMigrations(url);

  if (url.startsWith("libsql://")) {
    cachedDb = createLibsqlClient(url);
  } else if (url.startsWith("file:")) {
    cachedDb = createSqliteClient(url);
  } else {
    throw new Error(
      `Unsupported DATABASE_URL scheme: "${url}". Expected "file:" or "libsql://" prefix.`,
    );
  }

  return cachedDb;
}

/**
 * Creates a local SQLite connection via bun:sqlite (Bun) or better-sqlite3 (Node.js).
 * Uses the runtime-aware openSqliteDb utility to select the correct driver.
 */
function createSqliteClient(url: string): DbInstance {
  const absolutePath = resolveFileUrl(url);
  const { db } = openSqliteDb(absolutePath, schema);
  return db;
}

/**
 * Creates a remote Turso connection via @libsql/client.
 * Import is deferred to avoid bundling issues in environments that don't use libsql.
 */
function createLibsqlClient(url: string): DbInstance {
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
  const { drizzle } = require("drizzle-orm/libsql");

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return drizzle(client, { schema });
}

/**
 * Resets the cached database instance.
 * Intended for testing only -- allows tests to create fresh connections.
 */
export function resetDbForTesting(): void {
  cachedDb = null;
}
