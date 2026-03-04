import type { SkillFrontmatter } from "@uberskillz/types";
import { parse as parseYaml } from "yaml";

/** Result of parsing a SKILL.md file. */
export interface ParseResult {
  frontmatter: SkillFrontmatter;
  content: string;
}

/** Regex matching YAML frontmatter delimited by --- on its own line. */
const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

/** Empty frontmatter returned when no valid YAML block is found. */
const EMPTY_FRONTMATTER: SkillFrontmatter = {
  name: "",
  description: "",
  trigger: "",
};

/** Extract a string value from a record, defaulting to "" for non-strings. */
function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

/**
 * Parse a raw SKILL.md string into structured frontmatter and content.
 *
 * Extracts YAML between `---` delimiters and treats the remainder as
 * the markdown instructions body. Returns empty frontmatter when no
 * valid YAML block is found, with the full input as content.
 */
export function parseSkillMd(raw: string): ParseResult {
  if (!raw.trim()) {
    return { frontmatter: { ...EMPTY_FRONTMATTER }, content: "" };
  }

  const match = FRONTMATTER_RE.exec(raw);

  if (!match) {
    return { frontmatter: { ...EMPTY_FRONTMATTER }, content: raw.trim() };
  }

  const yamlBlock = match[1] ?? "";
  const content = raw.slice(match[0].length).trim();

  let parsed: Record<string, unknown>;
  try {
    const result: unknown = parseYaml(yamlBlock);
    parsed =
      typeof result === "object" && result !== null ? (result as Record<string, unknown>) : {};
  } catch {
    return { frontmatter: { ...EMPTY_FRONTMATTER }, content };
  }

  const frontmatter: SkillFrontmatter = {
    name: stringField(parsed, "name"),
    description: stringField(parsed, "description"),
    trigger: stringField(parsed, "trigger"),
  };

  if (typeof parsed.model_pattern === "string") {
    frontmatter.model_pattern = parsed.model_pattern;
  }

  return { frontmatter, content };
}
