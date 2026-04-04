/** Lifecycle status of a skill. */
export type SkillStatus = "draft" | "ready" | "deployed";

/** Supported deploy targets (code agents). */
export type DeployTarget =
  | "antigravity"
  | "claude-code"
  | "codex"
  | "cursor"
  | "gemini-cli"
  | "github-copilot"
  | "opencode"
  | "windsurf";

/** Classification of a file within a skill. */
export type FileType = "script" | "reference";

/** YAML frontmatter parsed from a SKILL.md file. */
export interface SkillFrontmatter {
  name: string;
  description: string;
  trigger?: string;
  model_pattern?: string;
}

/** A skill definition with metadata and markdown instructions. */
export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  trigger: string;
  tags: string[];
  modelPattern: string | null;
  /** Markdown instructions body. */
  content: string;
  status: SkillStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** An auxiliary file associated with a skill (e.g. script, reference). */
export interface SkillFile {
  id: string;
  skillId: string;
  /** Relative path within the skill directory, e.g. "scripts/setup.md". */
  path: string;
  content: string;
  type: FileType;
  createdAt: Date;
  updatedAt: Date;
}

/** A point-in-time snapshot of a skill for version history. */
export interface SkillVersion {
  id: string;
  skillId: string;
  version: number;
  /** Full SKILL.md content at this version. */
  contentSnapshot: string;
  /** Frontmatter snapshot stored as JSON. */
  metadataSnapshot: SkillFrontmatter;
  changeSummary: string;
  createdAt: Date;
}
