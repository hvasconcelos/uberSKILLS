import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { runMigrations } from "./migrate";
import * as schema from "./schema";
import { DEFAULT_DATABASE_URL, resolveFileUrl } from "./sqlite-utils";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: DbInstance | null = null;

/**
 * Returns a Drizzle ORM database instance, creating one if needed (singleton).
 *
 * On first call, auto-runs pending Drizzle migrations so the database is
 * always up-to-date without requiring a manual migration step.
 *
 * Connection type is auto-detected from `DATABASE_URL`:
 * - `file:` prefix → local SQLite via bun:sqlite (migrations auto-applied)
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
 * Creates a local SQLite connection via bun:sqlite.
 * Auto-creates the parent directory for the database file if it doesn't exist.
 */
function createSqliteClient(url: string): DbInstance {
  const absolutePath = resolveFileUrl(url);
  const sqlite = new Database(absolutePath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  return drizzle(sqlite, { schema }) as unknown as DbInstance;
}

/**
 * Creates a remote Turso connection via @libsql/client.
 */
function createLibsqlClient(url: string): DbInstance {
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return drizzleLibsql(client, { schema }) as unknown as DbInstance;
}

/**
 * Resets the cached database instance.
 * Intended for testing only -- allows tests to create fresh connections.
 */
export function resetDbForTesting(): void {
  cachedDb = null;
}
