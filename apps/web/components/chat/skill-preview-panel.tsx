"use client";

import { parseSkillMd, validateSkill } from "@uberskills/skill-engine";
import type { Skill, SkillFrontmatter, ValidationError } from "@uberskills/types";
import { Button, Input } from "@uberskills/ui";
import type { UIMessage } from "ai";
import { AlertCircle, AlertTriangle, Check, Copy, Loader2, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/** Shape of the JSON block the AI is instructed to produce. */
interface SkillJsonOutput {
  name: string;
  description: string;
  trigger: string;
  model_pattern?: string | null;
  content: string;
}

/**
 * Try to extract and parse a ```json code block from the assistant's text.
 * Returns null when no valid JSON block is found.
 */
function extractSkillJson(text: string): SkillJsonOutput | null {
  // Match ```json ... ``` code blocks (greedy so we get the largest one)
  const jsonBlockRe = /```json\s*\n([\s\S]*?)\n```/;
  const match = jsonBlockRe.exec(text);
  if (!match?.[1]) return null;

  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

    const obj = parsed as Record<string, unknown>;

    // Require the mandatory fields to be non-empty strings
    if (
      typeof obj.name !== "string" ||
      typeof obj.description !== "string" ||
      typeof obj.trigger !== "string" ||
      typeof obj.content !== "string"
    ) {
      return null;
    }

    return {
      name: obj.name,
      description: obj.description,
      trigger: obj.trigger,
      model_pattern: typeof obj.model_pattern === "string" ? obj.model_pattern : null,
      content: obj.content,
    };
  } catch {
    return null;
  }
}

interface SkillPreviewPanelProps {
  messages: UIMessage[];
  isStreaming: boolean;
  onRegenerate: () => void;
}

/**
 * Right panel of the AI skill creation page.
 *
 * Parses the latest assistant message as a SKILL.md in real-time,
 * renders structured frontmatter and content, and provides
 * "Edit & Save" (creates a draft skill) and "Regenerate" actions.
 */
export function SkillPreviewPanel({ messages, isStreaming, onRegenerate }: SkillPreviewPanelProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nameOverride, setNameOverride] = useState("");

  const lastAssistantText = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return "";

    return lastAssistant.parts
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("");
  }, [messages]);

  // Only parse when streaming has finished to avoid partial/broken parses
  const [stableText, setStableText] = useState("");

  useEffect(() => {
    if (!isStreaming && lastAssistantText) {
      setStableText(lastAssistantText);
    }
  }, [isStreaming, lastAssistantText]);

  const { frontmatter, content, errors, hasFrontmatter } = useMemo(() => {
    if (!stableText) {
      return {
        frontmatter: { name: "", description: "", trigger: "" } as SkillFrontmatter,
        content: "",
        errors: [] as ValidationError[],
        hasFrontmatter: false,
      };
    }

    // Try JSON extraction first (preferred, more reliable)
    const jsonResult = extractSkillJson(stableText);
    if (jsonResult) {
      const fm: SkillFrontmatter = {
        name: jsonResult.name,
        description: jsonResult.description,
        trigger: jsonResult.trigger,
      };
      if (jsonResult.model_pattern) {
        fm.model_pattern = jsonResult.model_pattern;
      }
      const validation = validateSkill(fm, jsonResult.content);
      return {
        frontmatter: fm,
        content: jsonResult.content,
        errors: validation.errors,
        hasFrontmatter: true,
      };
    }

    // Fallback: try SKILL.md frontmatter parsing (for backward compatibility)
    const codeBlockMatch = /```(?:md|markdown)?\s*\n(---[\s\S]*?---[\s\S]*)\n```/.exec(stableText);
    const skillMdText = codeBlockMatch?.[1]?.trim() ?? stableText;

    const parsed = parseSkillMd(skillMdText);
    const validation = validateSkill(parsed.frontmatter, parsed.content);
    const detected = parsed.frontmatter.name.length > 0;

    return {
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      errors: validation.errors,
      hasFrontmatter: detected,
    };
  }, [stableText]);

  // Auto-fill name from parsed frontmatter when it changes
  useEffect(() => {
    if (frontmatter.name) {
      setNameOverride(frontmatter.name);
    }
  }, [frontmatter.name]);

  const validationErrors = errors.filter((e) => e.severity === "error");
  const validationWarnings = errors.filter((e) => e.severity === "warning");
  const canSave = nameOverride.trim().length > 0 && hasFrontmatter && !isStreaming;

  /** Reconstruct a SKILL.md string for the clipboard. */
  const skillMdText = useMemo(() => {
    if (!hasFrontmatter) return stableText;
    const yamlLines = [
      `---`,
      `name: "${frontmatter.name}"`,
      `description: "${frontmatter.description}"`,
      `trigger: "${frontmatter.trigger}"`,
    ];
    if (frontmatter.model_pattern) {
      yamlLines.push(`model_pattern: "${frontmatter.model_pattern}"`);
    }
    yamlLines.push(`---`, "", content);
    return yamlLines.join("\n");
  }, [hasFrontmatter, frontmatter, content, stableText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(skillMdText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [skillMdText]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameOverride.trim() || frontmatter.name,
          description: frontmatter.description,
          trigger: frontmatter.trigger,
          modelPattern: frontmatter.model_pattern ?? null,
          content,
          tags: [],
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to create skill");
        return;
      }

      const skill = (await res.json()) as Skill;
      toast.success("Skill created! Redirecting to editor...");
      router.push(`/skills/${skill.slug}`);
    } catch {
      toast.error("Failed to save skill");
    } finally {
      setIsSaving(false);
    }
  }, [frontmatter, content, nameOverride, router]);

  if (!lastAssistantText) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-sm">Start a conversation to see the preview</p>
        <p className="mt-1 text-xs">The AI-generated SKILL.md will be parsed and displayed here.</p>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Preview</h2>
          <p className="text-xs text-muted-foreground">Generating skill...</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">AI is generating your SKILL.md...</p>
          <p className="text-xs">The preview will appear once generation is complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with action buttons */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Preview</h2>
            {isStreaming && <p className="text-xs text-muted-foreground">Parsing stream...</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} aria-label="Copy raw SKILL.md">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isSaving || isStreaming}
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {isSaving ? "Saving..." : "Edit & Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable preview content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Skill name input */}
          {lastAssistantText && (
            <div className="space-y-1.5">
              <label htmlFor="skill-name" className="text-xs font-medium text-muted-foreground">
                Skill Name
              </label>
              <Input
                id="skill-name"
                value={nameOverride}
                onChange={(e) => setNameOverride(e.target.value)}
                placeholder="Enter a name for this skill..."
                disabled={isStreaming}
              />
            </div>
          )}

          {/* Skill detected indicator */}
          {hasFrontmatter && !isStreaming && validationErrors.length === 0 && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 p-3">
              <Check className="size-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Valid skill detected — ready to save
              </span>
            </div>
          )}

          {/* Validation errors */}
          {validationErrors.length > 0 && !isStreaming && (
            <div
              className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">
                  {validationErrors.length} validation{" "}
                  {validationErrors.length === 1 ? "error" : "errors"}
                </p>
                <ul className="list-inside list-disc text-xs text-destructive/80">
                  {validationErrors.map((e) => (
                    <li key={`${e.field}-err`}>{e.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Validation warnings */}
          {validationWarnings.length > 0 && validationErrors.length === 0 && !isStreaming && (
            <div className="flex items-start gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                  {validationWarnings.length}{" "}
                  {validationWarnings.length === 1 ? "warning" : "warnings"}
                </p>
                <ul className="list-inside list-disc text-xs text-yellow-600/80 dark:text-yellow-400/80">
                  {validationWarnings.map((e) => (
                    <li key={`${e.field}-warn`}>{e.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Structured frontmatter display */}
          {hasFrontmatter ? (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Metadata</span>
              <div className="rounded-md border border-border bg-muted/50 p-3">
                <dl className="space-y-2 text-sm">
                  <FrontmatterField label="Name" value={frontmatter.name} />
                  <FrontmatterField label="Description" value={frontmatter.description} />
                  <FrontmatterField label="Trigger" value={frontmatter.trigger} />
                  {frontmatter.model_pattern && (
                    <FrontmatterField
                      label="Model Pattern"
                      value={frontmatter.model_pattern}
                      mono
                    />
                  )}
                </dl>
              </div>
            </div>
          ) : (
            // No valid frontmatter detected — show raw text with warning
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="size-3.5" />
                <span>Could not parse SKILL.md frontmatter. Showing raw output.</span>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {stableText}
              </pre>
            </div>
          )}

          {/* Content body */}
          {hasFrontmatter && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Instructions</span>
              <div className="rounded-md border border-border p-3">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {content || (
                    <span className="italic text-muted-foreground">
                      {isStreaming ? "Waiting for content..." : "No instructions content."}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FrontmatterFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function FrontmatterField({ label, value, mono = false }: FrontmatterFieldProps) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-xs"}>
        {value || <span className="italic text-muted-foreground">(not set)</span>}
      </dd>
    </div>
  );
}
