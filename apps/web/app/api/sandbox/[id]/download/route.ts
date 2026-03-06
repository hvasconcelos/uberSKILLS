import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getSandboxState } from "@uberskills/db";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/sandbox/[id]/download -- Download the input zip for a sandbox state.
 */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

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

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${state.name}-input.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Sandbox zip file not found on disk", code: "FILE_NOT_FOUND" },
      { status: 404 },
    );
  }
}
