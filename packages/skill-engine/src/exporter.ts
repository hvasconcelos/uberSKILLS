import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { Skill, SkillFile } from "@uberskills/types";
import archiver from "archiver";
import { generateSkillMd } from "./generator";

/** Default root directory for deployed skills. */
const SKILLS_ROOT = join(homedir(), ".claude", "skills");

/**
 * Generate a zip archive buffer containing a skill and its associated files.
 *
 * Zip structure:
 *   <slug>/SKILL.md
 *   <slug>/prompts/...
 *   <slug>/resources/...
 */
export async function exportToZip(skill: Skill, files: SkillFile[]): Promise<Buffer> {
  const skillMd = generateSkillMd(
    {
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      model_pattern: skill.modelPattern ?? undefined,
    },
    skill.content,
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  // Collect archive output into memory
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Add the main SKILL.md
  archive.append(skillMd, { name: `${skill.slug}/SKILL.md` });

  // Add associated files in their type-based subdirectories
  for (const file of files) {
    const entryPath = `${skill.slug}/${file.path}`;
    archive.append(file.content, { name: entryPath });
  }

  await archive.finalize();

  return Buffer.concat(chunks);
}

/**
 * Deploy a skill and its files to the local filesystem.
 *
 * Writes to `targetDir/<slug>/` (defaults to `~/.claude/skills/<slug>/`).
 * Creates directories as needed and overwrites existing files.
 *
 * Returns the absolute path of the deployed skill directory.
 *
 * @throws if targetDir resolves outside `~/.claude/skills/` (path traversal prevention)
 */
export async function deployToFilesystem(
  skill: Skill,
  files: SkillFile[],
  targetDir?: string,
): Promise<string> {
  const root = targetDir ?? SKILLS_ROOT;
  const skillDir = resolve(root, skill.slug);

  // Path traversal guard: deployed directory must live within the skills root
  const canonicalRoot = resolve(SKILLS_ROOT);
  const canonicalDir = resolve(skillDir);
  if (!canonicalDir.startsWith(`${canonicalRoot}/`) && canonicalDir !== canonicalRoot) {
    throw new Error(`Path traversal detected: target must be within ${SKILLS_ROOT}`);
  }

  const skillMd = generateSkillMd(
    {
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      model_pattern: skill.modelPattern ?? undefined,
    },
    skill.content,
  );

  // Ensure the skill directory exists
  await mkdir(skillDir, { recursive: true });

  // Write SKILL.md
  await writeFile(join(skillDir, "SKILL.md"), skillMd, "utf-8");

  // Write associated files, creating subdirectories as needed
  for (const file of files) {
    const filePath = resolve(skillDir, file.path);

    // Ensure the file path stays within the skill directory
    if (!filePath.startsWith(`${canonicalDir}/`)) {
      throw new Error(`Path traversal detected in file path: ${file.path}`);
    }

    await mkdir(resolve(filePath, ".."), { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }

  return skillDir;
}
