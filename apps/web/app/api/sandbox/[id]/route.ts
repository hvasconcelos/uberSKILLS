import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { deleteSandboxState, getSandboxState } from "@uberskills/db";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("DELETE", "/api/sandbox/[id]");

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/sandbox/[id] -- Fetch a single sandbox state by ID.
 */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const state = getSandboxState(id);
    if (!state) {
      return NextResponse.json(
        { error: `Sandbox state "${id}" not found`, code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: state.id,
      skillId: state.skillId,
      name: state.name,
      fileIndex: JSON.parse(state.fileIndex) as unknown,
      createdAt: state.createdAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch sandbox state", code: "SANDBOX_READ_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sandbox/[id] -- Delete a sandbox state and its zip file.
 */
export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const rlog = log.child({ sandboxId: id });

  try {
    const state = getSandboxState(id);
    if (!state) {
      return NextResponse.json(
        { error: `Sandbox state "${id}" not found`, code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Delete the zip file from disk
    const zipAbsPath = resolve("data", state.zipPath);
    await rm(zipAbsPath, { force: true }).catch(() => {});

    // Delete the DB record
    deleteSandboxState(id);

    rlog.info("sandbox state deleted");
    return NextResponse.json({ success: true });
  } catch (err) {
    rlog.error({ err }, "failed to delete sandbox state");
    return NextResponse.json(
      { error: "Failed to delete sandbox state", code: "SANDBOX_DELETE_ERROR" },
      { status: 500 },
    );
  }
}
