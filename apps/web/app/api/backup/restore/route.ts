import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { resetDbForTesting } from "@uberskills/db";
import { type NextRequest, NextResponse } from "next/server";

import { getDbPath } from "@/lib/db-path";

/** First 16 bytes of every valid SQLite database file. */
const SQLITE_MAGIC = "SQLite format 3\0";

/**
 * POST /api/backup/restore -- Restores the database from an uploaded SQLite file.
 *
 * Steps:
 * 1. Validates the uploaded file is a SQLite database (magic bytes check).
 * 2. Creates an automatic backup of the current database before overwriting.
 * 3. Replaces the database file with the uploaded one.
 * 4. Resets the DB connection singleton so subsequent queries use the new file.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const dbPath = getDbPath();
    if (!dbPath) {
      return NextResponse.json(
        { error: "Restore is only supported for local SQLite databases.", code: "UNSUPPORTED" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file uploaded. Send a SQLite database file.", code: "NO_FILE" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 16 || buffer.subarray(0, 16).toString("ascii") !== SQLITE_MAGIC) {
      return NextResponse.json(
        { error: "Invalid file. Please upload a valid SQLite database.", code: "INVALID_FILE" },
        { status: 400 },
      );
    }

    // Create automatic backup of current database before overwriting
    if (existsSync(dbPath)) {
      const backupDir = resolve(dirname(dbPath), "backups");
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = resolve(backupDir, `uberskills-pre-restore-${timestamp}.db`);
      copyFileSync(dbPath, backupPath);
    }

    // Write the uploaded file as the new database
    writeFileSync(dbPath, buffer);

    // Reset the cached DB connection so subsequent queries use the new file
    resetDbForTesting();

    return NextResponse.json({ status: "restored" });
  } catch {
    return NextResponse.json(
      { error: "Failed to restore database.", code: "RESTORE_ERROR" },
      { status: 500 },
    );
  }
}
