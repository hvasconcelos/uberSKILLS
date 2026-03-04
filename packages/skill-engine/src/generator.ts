import type { SkillFrontmatter } from "@uberskillz/types";
import { stringify as stringifyYaml } from "yaml";

/**
 * Generate a SKILL.md string from structured frontmatter and markdown content.
 *
 * Produces YAML frontmatter wrapped in `---` delimiters followed by the
 * markdown body. Omits `model_pattern` when it is not set.
 *
 * Round-trip compatible with `parseSkillMd`.
 */
export function generateSkillMd(frontmatter: SkillFrontmatter, content: string): string {
  const yamlData: Record<string, string> = {
    name: frontmatter.name,
    description: frontmatter.description,
    trigger: frontmatter.trigger,
  };

  if (frontmatter.model_pattern != null && frontmatter.model_pattern !== "") {
    yamlData.model_pattern = frontmatter.model_pattern;
  }

  const yamlBlock = stringifyYaml(yamlData, { lineWidth: 0 }).trimEnd();

  return `---\n${yamlBlock}\n---\n\n${content.trim()}\n`;
}
