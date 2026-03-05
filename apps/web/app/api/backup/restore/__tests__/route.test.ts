import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("@uberskills/db", () => ({
  resetDbForTesting: vi.fn(),
}));

const { existsSync, copyFileSync, writeFileSync, mkdirSync } = await import("node:fs");
const mockedExistsSync = vi.mocked(existsSync);
const mockedCopyFileSync = vi.mocked(copyFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedMkdirSync = vi.mocked(mkdirSync);

const { resetDbForTesting } = await import("@uberskills/db");
const mockedResetDb = vi.mocked(resetDbForTesting);

const { POST } = await import("../route");

/** Helper to build a FormData request with a file Blob. */
function makeRequest(content: Buffer | null): Request {
  const formData = new FormData();
  if (content) {
    formData.append("file", new Blob([content]));
  }
  return new Request("http://localhost/api/backup/restore", { method: "POST", body: formData });
}

/** Valid SQLite header: "SQLite format 3\0" followed by arbitrary data. */
const VALID_SQLITE = Buffer.concat([Buffer.from("SQLite format 3\0"), Buffer.from("data")]);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/backup/restore", () => {
  it("restores from a valid SQLite file and resets the DB connection", async () => {
    mockedExistsSync.mockReturnValue(true);

    const response = await POST(makeRequest(VALID_SQLITE) as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("restored");
    expect(mockedCopyFileSync).toHaveBeenCalledTimes(1);
    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockedResetDb).toHaveBeenCalledTimes(1);
  });

  it("creates backups directory if it does not exist", async () => {
    // First call: DB file exists; second call: backups dir does not exist
    mockedExistsSync.mockImplementation((p) => {
      return !String(p).includes("backups");
    });

    const response = await POST(makeRequest(VALID_SQLITE) as never);

    expect(response.status).toBe(200);
    expect(mockedMkdirSync).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost/api/backup/restore", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("NO_FILE");
  });

  it("returns 400 for a non-SQLite file", async () => {
    const invalidContent = Buffer.from("This is not a SQLite database");

    const response = await POST(makeRequest(invalidContent) as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_FILE");
  });

  it("returns 400 for a file shorter than 16 bytes", async () => {
    const shortContent = Buffer.from("short");

    const response = await POST(makeRequest(shortContent) as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_FILE");
  });

  it("skips pre-restore backup when database file does not exist yet", async () => {
    mockedExistsSync.mockReturnValue(false);

    const response = await POST(makeRequest(VALID_SQLITE) as never);

    expect(response.status).toBe(200);
    expect(mockedCopyFileSync).not.toHaveBeenCalled();
  });

  it("returns 500 when write fails", async () => {
    mockedExistsSync.mockReturnValue(false);
    mockedWriteFileSync.mockImplementation(() => {
      throw new Error("Disk full");
    });

    const response = await POST(makeRequest(VALID_SQLITE) as never);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe("RESTORE_ERROR");
  });
});
