import { getSkillById, listVersions } from "@uberskillz/db";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/skills/[id]/versions — list all versions for a skill
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const skill = getSkillById(id);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const versions = listVersions(id);
    return NextResponse.json({ versions });
  } catch {
    return NextResponse.json(
      { error: "Failed to list versions", code: "VERSIONS_READ_ERROR" },
      { status: 500 },
    );
  }
}
