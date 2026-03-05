import { getSkillById, listFiles, listSkills } from "@uberskills/db";
import { generateSkillMd } from "@uberskills/skill-engine";
import { zipSync } from "fflate";
import { NextResponse } from "next/server";

const encoder = new TextEncoder();

/**
 * Builds zip entry map for a skill and its associated files.
 * Returns entries keyed by `<slug>/SKILL.md` and `<slug>/<file.path>`.
 */
function buildSkillZipEntries(skill: {
  id: string;
  slug: string;
  name: string;
  description: string;
  trigger: string;
  modelPattern: string | null;
  content: string;
}): Record<string, Uint8Array> {
  const dir = skill.slug;
  const entries: Record<string, Uint8Array> = {};

  const skillMd = generateSkillMd(
    {
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      model_pattern: skill.modelPattern ?? undefined,
    },
    skill.content,
  );
  entries[`${dir}/SKILL.md`] = encoder.encode(skillMd);

  for (const file of listFiles(skill.id)) {
    entries[`${dir}/${file.path}`] = encoder.encode(file.content);
  }

  return entries;
}

/**
 * GET /api/export -- Exports all skills as a single zip file.
 *
 * Each skill is placed in its own subdirectory (named by slug) containing:
 * - SKILL.md (the main skill file)
 * - Any auxiliary files associated with the skill
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = listSkills({ limit: 10000 });

    if (result.data.length === 0) {
      return NextResponse.json({ error: "No skills to export.", code: "EMPTY" }, { status: 404 });
    }

    const files: Record<string, Uint8Array> = {};
    for (const skill of result.data) {
      Object.assign(files, buildSkillZipEntries(skill));
    }

    const zipped = zipSync(files);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `uberskills-export-${timestamp}.zip`;

    return new NextResponse(Buffer.from(zipped), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipped.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export skills.", code: "EXPORT_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/export -- Exports one or more skills as a zip download.
 *
 * Body: `{ skillId: string }` for a single skill, or `{ skillIds: string[] }` for batch export.
 * Returns a zip file as a binary response with Content-Disposition header.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const { skillId, skillIds } = body;

  // Resolve the list of IDs to export
  let ids: string[];
  if (typeof skillId === "string") {
    ids = [skillId];
  } else if (Array.isArray(skillIds) && skillIds.every((id) => typeof id === "string")) {
    ids = skillIds as string[];
  } else {
    return NextResponse.json(
      { error: "Provide skillId (string) or skillIds (string[])", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "At least one skill ID is required", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const files: Record<string, Uint8Array> = {};
    const slugs: string[] = [];

    for (const id of ids) {
      const skill = getSkillById(id);
      if (!skill) {
        return NextResponse.json(
          { error: `Skill not found: ${id}`, code: "NOT_FOUND" },
          { status: 404 },
        );
      }
      Object.assign(files, buildSkillZipEntries(skill));
      slugs.push(skill.slug);
    }

    const zipped = zipSync(files);

    // Single skill: use slug as filename; batch: generic name
    const filename = ids.length === 1 ? `${slugs[0]}.zip` : "uberskills-export.zip";

    return new NextResponse(Buffer.from(zipped), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipped.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export skills.", code: "EXPORT_ERROR" },
      { status: 500 },
    );
  }
}
