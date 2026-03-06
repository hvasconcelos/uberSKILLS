# Skill Engine

The `@uberskills/skill-engine` package handles all SKILL.md processing. It is the core business logic package with no UI dependencies.

**Source:** `packages/skill-engine/src/`

## Parser

**File:** `parser.ts`

Parses a raw SKILL.md string into structured data.

**Input:** Raw SKILL.md content (string)
**Output:** `{ frontmatter: SkillFrontmatter, content: string }`

Steps:

1. Extract YAML frontmatter between `---` delimiters.
2. Parse YAML into a `SkillFrontmatter` object.
3. Extract remaining markdown as `content`.

## Validator

**File:** `validator.ts`

Validates a parsed skill against the Claude Code skill specification.

**Rules:**

| Field | Requirement |
|---|---|
| `name` | Required, non-empty, max 100 characters |
| `description` | Required, non-empty, max 500 characters |
| `trigger` | Required, non-empty |
| `model_pattern` | If present, must be a valid regex |
| `content` | Required, non-empty |
| File paths | No duplicates in associated skill files |

**Output:** `{ valid: boolean, errors: ValidationError[] }`

```typescript
interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}
```

## Generator

**File:** `generator.ts`

Generates a SKILL.md string from structured data.

**Input:** `{ frontmatter: SkillFrontmatter, content: string }`
**Output:** Complete SKILL.md string

Steps:

1. Serialize `SkillFrontmatter` to YAML.
2. Wrap in `---` delimiters.
3. Append content after a blank line.
4. Ensure trailing newline.

Example output:

```markdown
---
name: PR Reviewer
description: Reviews pull requests and provides feedback
trigger: When user asks to review a PR
---

## Instructions

When reviewing a pull request...
```

## Substitutions

**File:** `substitutions.ts`

Handles argument placeholder replacement for skill testing.

**Placeholder patterns:**

- `$ARGUMENTS` -- replaced with the full user-provided arguments string
- `$VARIABLE_NAME` -- named placeholders detected via regex `/\$([A-Z_]+)/g`

**Functions:**

- `detectPlaceholders(content: string): string[]` -- returns placeholder names found in content.
- `substitute(content: string, values: Record<string, string>): string` -- replaces placeholders with values.

## Exporter

**File:** `exporter.ts`

### Zip Export

1. Creates directory structure: `<slug>/SKILL.md`, `<slug>/prompts/*`, `<slug>/resources/*`.
2. Generates SKILL.md via the generator.
3. Includes skill files in appropriate subdirectories.
4. Compresses to `.zip` and returns as buffer.

### Filesystem Deploy

1. Resolves target: `~/.claude/skills/<slug>/`.
2. Creates directory if it doesn't exist.
3. Writes SKILL.md via the generator.
4. Copies skill files to appropriate subdirectories.
5. Returns the deployed path.

## Importer

**File:** `importer.ts`

### Directory Scan

1. Recursively scans the given path for directories containing `SKILL.md`.
2. Parses each `SKILL.md` via the parser.
3. Detects additional files in `prompts/` and `resources/` subdirectories.
4. Returns an array of parsed skills with validation results.

### Zip Import

1. Extracts zip to a temporary directory.
2. Delegates to directory scan logic.
3. Cleans up temporary files.

### Security

- All paths are resolved to absolute paths and canonicalized.
- Symlinks are not followed outside the source directory.
- Only `.md` and known text file extensions are read.
