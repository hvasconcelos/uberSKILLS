import { resolve } from "node:path";

const FILE_PREFIX = "file:";

/**
 * Resolves the SQLite database file path from DATABASE_URL.
 * Only supports `file:` URLs (local SQLite). Returns null for remote connections.
 */
export function getDbPath(): string | null {
  const url = process.env.DATABASE_URL ?? "file:data/uberskillz.db";
  if (!url.startsWith(FILE_PREFIX)) return null;
  return resolve(process.cwd(), url.slice(FILE_PREFIX.length));
}
