import type { FileType } from "@uberskills/types";

/** A skill file to include in the system prompt. */
export interface SystemPromptFile {
  path: string;
  content: string;
  type: FileType;
}

/** Options for building the test system prompt. */
export interface BuildSystemPromptOptions {
  /** The resolved skill content (after placeholder substitution). */
  resolvedContent: string;
  /** Skill files (prompts and resources) to include. */
  files: SystemPromptFile[];
  /**
   * Max lines before an unreferenced resource file is summarized instead of
   * inlined. Prompt files and referenced resource files are always inlined
   * regardless of size.
   * @default 100
   */
  resourceInlineThreshold?: number;
  /**
   * Number of preview lines to show for summarized resource files.
   * @default 20
   */
  previewLines?: number;
}

/** Result from building the system prompt. */
export interface BuildSystemPromptResult {
  /** The full system prompt string. */
  systemPrompt: string;
  /** Number of files inlined in full. */
  inlinedCount: number;
  /** Number of files summarized (progressive disclosure). */
  summarizedCount: number;
}

/**
 * Check whether a file is referenced by path in the skill content.
 *
 * A file is considered "referenced" when its path (or filename) appears in
 * the resolved skill content. This catches patterns like:
 *   - "See resources/api-docs.md for details"
 *   - "Follow the style guide in style-guide.md"
 */
export function isFileReferenced(resolvedContent: string, filePath: string): boolean {
  // Check the full path first
  if (resolvedContent.includes(filePath)) {
    return true;
  }
  // Also check just the filename (last segment) for brevity references
  const filename = filePath.split("/").pop();
  if (filename && filename !== filePath && resolvedContent.includes(filename)) {
    return true;
  }
  return false;
}

/**
 * Builds a test system prompt with progressive disclosure for skill files.
 *
 * Strategy:
 * - **Prompt files** (type: "prompt") are always inlined in full — these are
 *   core instructions/templates the AI needs to function.
 * - **Referenced resource files** — resource files whose path or filename
 *   appears in the skill content are always inlined in full, since the skill
 *   explicitly depends on them.
 * - **Unreferenced resource files** use progressive disclosure:
 *   - Small files (≤ threshold lines) are inlined in full.
 *   - Large files show a preview (first N lines) plus a summary noting
 *     the total line count and that the content was truncated.
 *
 * Files are appended as clearly delimited sections after the main skill content.
 */
export function buildTestSystemPrompt(options: BuildSystemPromptOptions): BuildSystemPromptResult {
  const { resolvedContent, files, resourceInlineThreshold = 100, previewLines = 20 } = options;

  if (files.length === 0) {
    return { systemPrompt: resolvedContent, inlinedCount: 0, summarizedCount: 0 };
  }

  // Separate prompt files from resource files for ordering:
  // prompts first (they're core instructions), then resources.
  const promptFiles = files.filter((f) => f.type === "prompt");
  const resourceFiles = files.filter((f) => f.type === "resource");
  const orderedFiles = [...promptFiles, ...resourceFiles];

  let inlinedCount = 0;
  let summarizedCount = 0;
  const fileSections: string[] = [];

  for (const file of orderedFiles) {
    const lines = file.content.split("\n");
    const totalLines = lines.length;

    // Determine whether to inline or summarize:
    // - Prompt files: always inline
    // - Resource files referenced in content: always inline (the skill needs them)
    // - Unreferenced resource files: inline if small, summarize if large
    const referenced = file.type === "resource" && isFileReferenced(resolvedContent, file.path);
    const shouldSummarize =
      file.type === "resource" && !referenced && totalLines > resourceInlineThreshold;

    if (shouldSummarize) {
      const preview = lines.slice(0, previewLines).join("\n");
      const remainingLines = totalLines - previewLines;
      fileSections.push(
        `### File: ${file.path} (${file.type})\n` +
          `> Showing first ${previewLines} of ${totalLines} lines. ` +
          `${remainingLines} additional lines omitted for brevity.\n\n` +
          `\`\`\`\n${preview}\n\`\`\``,
      );
      summarizedCount++;
    } else {
      fileSections.push(`### File: ${file.path} (${file.type})\n\`\`\`\n${file.content}\n\`\`\``);
      inlinedCount++;
    }
  }

  const filesSection =
    "\n\n---\n\n" +
    "## Skill Reference Files\n\n" +
    `The following ${files.length} file(s) are bundled with this skill:\n\n` +
    fileSections.join("\n\n");

  return {
    systemPrompt: resolvedContent + filesSection,
    inlinedCount,
    summarizedCount,
  };
}
