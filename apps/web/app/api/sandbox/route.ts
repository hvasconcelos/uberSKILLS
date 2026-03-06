import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createSandboxState, getSkillById, listSandboxStates } from "@uberskills/db";
import { buildFileIndexFromZip, MAX_ZIP_SIZE } from "@uberskills/skill-engine/server";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("POST", "/api/sandbox");
const getLog = routeLogger("GET", "/api/sandbox");

/**
 * POST /api/sandbox -- Upload a zip file to create a new sandbox state.
 *
 * Expects multipart form data with:
 * - file: the zip archive
 * - skillId: the skill this sandbox is for
 * - name: human-readable name for the sandbox state
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const skillId = formData.get("skillId");
    const name = formData.get("name");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid zip file", code: "INVALID_FILE" },
        { status: 400 },
      );
    }

    if (typeof skillId !== "string" || skillId.trim() === "") {
      return NextResponse.json(
        { error: "skillId must be a non-empty string", code: "INVALID_SKILL_ID" },
        { status: 400 },
      );
    }

    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name must be a non-empty string", code: "INVALID_NAME" },
        { status: 400 },
      );
    }

    // Validate skill exists
    const skill = getSkillById(skillId);
    if (!skill) {
      return NextResponse.json(
        { error: `Skill with ID "${skillId}" not found`, code: "SKILL_NOT_FOUND" },
        { status: 404 },
      );
    }

    // Read zip buffer
    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    if (zipBuffer.length > MAX_ZIP_SIZE) {
      return NextResponse.json(
        {
          error: `Zip file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024} MB`,
          code: "FILE_TOO_LARGE",
        },
        { status: 400 },
      );
    }

    // Validate it's a valid zip
    if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
      return NextResponse.json(
        { error: "File does not appear to be a valid zip archive", code: "INVALID_ZIP" },
        { status: 400 },
      );
    }

    // Build file index
    const fileIndex = buildFileIndexFromZip(zipBuffer);

    // Store zip to disk
    const timestamp = Date.now();
    const zipRelPath = join("sandboxes", skillId, `${timestamp}.zip`);
    const zipAbsPath = resolve("data", zipRelPath);
    await mkdir(dirname(zipAbsPath), { recursive: true });
    await writeFile(zipAbsPath, zipBuffer);

    // Create DB record
    const sandboxState = createSandboxState({
      skillId,
      name: name.trim(),
      zipPath: zipRelPath,
      fileIndex: JSON.stringify(fileIndex),
    });

    log.info(
      { sandboxId: sandboxState.id, skillId, fileCount: fileIndex.length },
      "sandbox created",
    );

    return NextResponse.json(
      {
        id: sandboxState.id,
        name: sandboxState.name,
        fileIndex,
        createdAt: sandboxState.createdAt,
      },
      { status: 201 },
    );
  } catch (err) {
    log.error({ err }, "failed to create sandbox state");
    return NextResponse.json(
      { error: "Failed to create sandbox state", code: "SANDBOX_CREATE_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/sandbox?skillId=xxx -- List all sandbox states for a skill.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const skillId = searchParams.get("skillId");

  if (!skillId) {
    return NextResponse.json(
      { error: "skillId query parameter is required", code: "MISSING_SKILL_ID" },
      { status: 400 },
    );
  }

  try {
    const states = listSandboxStates(skillId);

    const sandboxStates = states.map((s) => ({
      id: s.id,
      name: s.name,
      fileIndex: JSON.parse(s.fileIndex) as unknown,
      createdAt: s.createdAt,
    }));

    getLog.info({ skillId, count: sandboxStates.length }, "sandbox states listed");
    return NextResponse.json({ sandboxStates });
  } catch (err) {
    getLog.error({ err }, "failed to list sandbox states");
    return NextResponse.json(
      { error: "Failed to list sandbox states", code: "SANDBOX_LIST_ERROR" },
      { status: 500 },
    );
  }
}
