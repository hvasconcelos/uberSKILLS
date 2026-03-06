import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getSandboxState } from "@uberskills/db";
import { readTextFileFromZip } from "@uberskills/skill-engine/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/sandbox/[id]/file?path=src/index.ts -- Read a text file from the sandbox input zip.
 */
export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json(
      { error: "path query parameter is required", code: "MISSING_PATH" },
      { status: 400 },
    );
  }

  const state = getSandboxState(id);
  if (!state) {
    return NextResponse.json(
      { error: `Sandbox state "${id}" not found`, code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  try {
    const zipAbsPath = resolve("data", state.zipPath);
    const zipBuffer = await readFile(zipAbsPath);
    const content = readTextFileFromZip(zipBuffer, filePath);

    if (content === null) {
      return NextResponse.json(
        { error: `File "${filePath}" not found in sandbox zip`, code: "FILE_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ path: filePath, content });
  } catch {
    return NextResponse.json(
      { error: "Failed to read file from sandbox zip", code: "FILE_READ_ERROR" },
      { status: 500 },
    );
  }
}
