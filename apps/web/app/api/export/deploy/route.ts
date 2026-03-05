import { getSkillById, listFiles, updateSkill } from "@uberskills/db";
import { deployToFilesystem } from "@uberskills/skill-engine/server";
import type { Skill, SkillFile } from "@uberskills/types";
import { NextResponse } from "next/server";

/**
 * POST /api/export/deploy -- Deploys a skill to the local filesystem.
 *
 * Body: `{ skillId: string }`
 * Writes the skill to `~/.claude/skills/<slug>/` and updates its status to "deployed".
 * Returns the deployed path on success.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const { skillId } = body;

  if (typeof skillId !== "string" || skillId.trim().length === 0) {
    return NextResponse.json(
      { error: "skillId is required and must be a non-empty string", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const skill = getSkillById(skillId);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const files = listFiles(skillId);

  try {
    // Map DB rows to the shapes expected by the exporter
    const skillData: Skill = {
      ...skill,
      tags: JSON.parse(skill.tags) as string[],
      status: skill.status as Skill["status"],
    };

    const skillFiles: SkillFile[] = files.map((f) => ({
      ...f,
      type: f.type as SkillFile["type"],
    }));

    const deployedPath = await deployToFilesystem(skillData, skillFiles);

    // Update skill status to "deployed"
    updateSkill(skillId, { status: "deployed" });

    return NextResponse.json({ path: deployedPath, status: "deployed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Surface path traversal errors as 400
    if (message.includes("Path traversal")) {
      return NextResponse.json({ error: message, code: "PATH_TRAVERSAL" }, { status: 400 });
    }

    return NextResponse.json(
      { error: `Failed to deploy skill: ${message}`, code: "DEPLOY_ERROR" },
      { status: 500 },
    );
  }
}
