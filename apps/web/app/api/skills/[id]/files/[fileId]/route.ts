import { deleteFile, getSkillById, listFiles, updateFile } from "@uberskillz/db";
import type { FileType } from "@uberskillz/types";
import { NextResponse } from "next/server";

const VALID_FILE_TYPES: FileType[] = ["prompt", "resource"];
const PATH_TRAVERSAL_PATTERN = /(?:^|\/)\.\.(?:\/|$)/;

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

// PUT /api/skills/[id]/files/[fileId] — update a file's path, content, or type
export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id, fileId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const skill = getSkillById(id);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const { path, content, type } = body;

  // Validate path if provided
  if (path !== undefined) {
    if (typeof path !== "string" || path.trim().length === 0) {
      return NextResponse.json(
        { error: "path must be a non-empty string", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const trimmedPath = (path as string).trim();

    if (trimmedPath.startsWith("/")) {
      return NextResponse.json(
        { error: "path must be a relative path", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    if (PATH_TRAVERSAL_PATTERN.test(trimmedPath)) {
      return NextResponse.json(
        { error: "path must not contain '..'", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    // Check for duplicate path (excluding the current file)
    const existingFiles = listFiles(id);
    if (existingFiles.some((f) => f.path === trimmedPath && f.id !== fileId)) {
      return NextResponse.json(
        { error: `A file with path "${trimmedPath}" already exists`, code: "DUPLICATE_PATH" },
        { status: 409 },
      );
    }
  }

  // Validate type if provided
  if (type !== undefined) {
    if (typeof type !== "string" || !VALID_FILE_TYPES.includes(type as FileType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_FILE_TYPES.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
  }

  // Validate content if provided
  if (content !== undefined && typeof content !== "string") {
    return NextResponse.json(
      { error: "content must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const updated = updateFile(fileId, {
      path: typeof path === "string" ? path.trim() : undefined,
      content: typeof content === "string" ? content : undefined,
      type: type as FileType | undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "File not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update file", code: "FILE_UPDATE_ERROR" },
      { status: 500 },
    );
  }
}

// DELETE /api/skills/[id]/files/[fileId] — delete a file
export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id, fileId } = await context.params;

  const skill = getSkillById(id);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const deleted = deleteFile(fileId);
    if (!deleted) {
      return NextResponse.json({ error: "File not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete file", code: "FILE_DELETE_ERROR" },
      { status: 500 },
    );
  }
}
