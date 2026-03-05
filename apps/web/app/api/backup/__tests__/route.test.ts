import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const { existsSync, readFileSync } = await import("node:fs");
const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

const { GET } = await import("../route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/backup", () => {
  it("returns the database file as a download", async () => {
    mockedExistsSync.mockReturnValue(true);
    const dbContent = Buffer.from("SQLite format 3\0test-database-content");
    mockedReadFileSync.mockReturnValue(dbContent);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
    const disposition = response.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("uberskills-backup-");
    // Filename should follow YYYY-MM-DD format (e.g. uberskills-backup-2026-03-05.db)
    expect(disposition).toMatch(/uberskills-backup-\d{4}-\d{2}-\d{2}\.db/);
  });

  it("returns 404 when database file does not exist", async () => {
    mockedExistsSync.mockReturnValue(false);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 500 on read error", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("Read failure");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("BACKUP_ERROR");
  });
});
