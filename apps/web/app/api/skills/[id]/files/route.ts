import { createFile, getSkillById, listFiles } from "@uberskillz/db";
import type { FileType } from "@uberskillz/types";
import { NextResponse } from "next/server";

const VALID_FILE_TYPES: FileType[] = ["prompt", "resource"];
const PATH_TRAVERSAL_PATTERN = /(?:^|\/)\.\.(?:\/|$)/;

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/files — list all files for a skill
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const skill = getSkillById(id);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const files = listFiles(id);
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json(
      { error: "Failed to list files", code: "FILES_READ_ERROR" },
      { status: 500 },
    );
  }
}

// POST /api/skills/[id]/files — create a new file for a skill
export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

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

  // Validate path
  if (typeof path !== "string" || path.trim().length === 0) {
    return NextResponse.json(
      { error: "path must be a non-empty string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const trimmedPath = path.trim();

  // Reject absolute paths
  if (trimmedPath.startsWith("/")) {
    return NextResponse.json(
      { error: "path must be a relative path", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Reject path traversal attempts
  if (PATH_TRAVERSAL_PATTERN.test(trimmedPath)) {
    return NextResponse.json(
      { error: "path must not contain '..'", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Validate type
  if (type !== undefined) {
    if (typeof type !== "string" || !VALID_FILE_TYPES.includes(type as FileType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_FILE_TYPES.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
  }

  // Validate content
  if (content !== undefined && typeof content !== "string") {
    return NextResponse.json(
      { error: "content must be a string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Check for duplicate path within the same skill
  const existingFiles = listFiles(id);
  if (existingFiles.some((f) => f.path === trimmedPath)) {
    return NextResponse.json(
      { error: `A file with path "${trimmedPath}" already exists`, code: "DUPLICATE_PATH" },
      { status: 409 },
    );
  }

  try {
    const file = createFile({
      skillId: id,
      path: trimmedPath,
      content: typeof content === "string" ? content : "",
      type: (type as FileType) ?? "resource",
    });

    return NextResponse.json(file, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create file", code: "FILE_CREATE_ERROR" },
      { status: 500 },
    );
  }
}
