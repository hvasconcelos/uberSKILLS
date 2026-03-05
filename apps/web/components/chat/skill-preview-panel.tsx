"use client";

import { parseSkillMd, validateSkill } from "@uberskills/skill-engine";
import type { Skill, ValidationError } from "@uberskills/types";
import { Button, Input } from "@uberskills/ui";
import type { UIMessage } from "ai";
import { AlertCircle, AlertTriangle, Check, Copy, Loader2, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

  /** Extract SKILL.md content from markdown code blocks if present. */
  const skillMdText = useMemo(() => {
    if (!lastAssistantText) return "";
    // Match ```md, ```markdown, or plain ``` code blocks containing frontmatter
    const codeBlockMatch = /```(?:md|markdown)?\s*\n(---[\s\S]*?---[\s\S]*?)```/.exec(
      lastAssistantText,
    );
    if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim();
    return lastAssistantText;
  }, [lastAssistantText]);

  const { frontmatter, content, errors, hasFrontmatter } = useMemo(() => {
    if (!skillMdText) {
      return {
        frontmatter: { name: "", description: "", trigger: "" },
        content: "",
        errors: [] as ValidationError[],
        hasFrontmatter: false,
      };
    }

    const parsed = parseSkillMd(skillMdText);
    const validation = validateSkill(parsed.frontmatter, parsed.content);
    // Consider frontmatter detected if parser extracted a non-empty name
    const detected = parsed.frontmatter.name.length > 0;

    return {
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      errors: validation.errors,
      hasFrontmatter: detected,
    };
  }, [skillMdText]);

  // Auto-fill name from parsed frontmatter when it changes
  useEffect(() => {
    if (frontmatter.name) {
      setNameOverride(frontmatter.name);
    }
  }, [frontmatter.name]);

  const validationErrors = errors.filter((e) => e.severity === "error");
  const validationWarnings = errors.filter((e) => e.severity === "warning");
  const canSave = nameOverride.trim().length > 0 && hasFrontmatter && !isStreaming;

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
                {skillMdText}
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
