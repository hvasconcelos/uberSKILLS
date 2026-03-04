import type { SkillFrontmatter, ValidationError } from "@uberskillz/types";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_CONTENT_LENGTH = 50;

/** Result of validating a parsed skill. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Check whether a string is empty or whitespace-only. */
function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

/** Check whether a string compiles as a valid RegExp. */
function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a parsed skill's frontmatter and content against the
 * Claude Code skill specification.
 *
 * Rules:
 *  - name: required, non-empty, max 100 characters
 *  - description: required, non-empty, max 500 characters
 *  - trigger: required, non-empty
 *  - model_pattern: if present, must compile as a valid RegExp
 *  - content: required, non-empty markdown instructions
 */
export function validateSkill(frontmatter: SkillFrontmatter, content: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (isBlank(frontmatter.name)) {
    errors.push({ field: "name", message: "Name is required.", severity: "error" });
  } else if (frontmatter.name.length > MAX_NAME_LENGTH) {
    errors.push({
      field: "name",
      message: `Name must be at most ${MAX_NAME_LENGTH} characters (got ${frontmatter.name.length}).`,
      severity: "error",
    });
  }

  if (isBlank(frontmatter.description)) {
    errors.push({
      field: "description",
      message: "A description is recommended.",
      severity: "warning",
    });
  } else if (frontmatter.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push({
      field: "description",
      message: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters (got ${frontmatter.description.length}).`,
      severity: "error",
    });
  }

  if (isBlank(frontmatter.trigger)) {
    errors.push({ field: "trigger", message: "Trigger is required.", severity: "error" });
  }

  if (frontmatter.model_pattern !== undefined && frontmatter.model_pattern !== "") {
    if (!isValidRegex(frontmatter.model_pattern)) {
      errors.push({
        field: "model_pattern",
        message: "Model pattern is not a valid regular expression.",
        severity: "error",
      });
    }
  }

  if (isBlank(content)) {
    errors.push({
      field: "content",
      message: "Content (markdown instructions) is required.",
      severity: "error",
    });
  } else if (content.trim().length < MIN_CONTENT_LENGTH) {
    errors.push({
      field: "content",
      message: `Content is very short (${content.trim().length} chars). Consider adding more detail.`,
      severity: "warning",
    });
  }

  const valid = !errors.some((e) => e.severity === "error");
  return { valid, errors };
}
