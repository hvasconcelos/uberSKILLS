"use client";

import { generateSkillMd } from "@uberskillz/skill-engine";
import type { SkillFrontmatter, ValidationError } from "@uberskillz/types";
import {
  Badge,
  Button,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uberskillz/ui";
import { AlertCircle, AlertTriangle, Check, Copy, FileText } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import type { EditorFileData, EditorSkillData } from "./editor-shell";

interface PreviewTabProps {
  skill: EditorSkillData;
  files: EditorFileData[];
  validationErrors: ValidationError[];
}

export function PreviewTab({ skill, files, validationErrors }: PreviewTabProps) {
  const [copied, setCopied] = useState(false);

  // Build frontmatter from current editor state and generate the full SKILL.md
  const { rawSkillMd, frontmatterBlock, contentBody } = useMemo(() => {
    const frontmatter: SkillFrontmatter = {
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      model_pattern: skill.modelPattern ?? undefined,
    };

    const raw = generateSkillMd(frontmatter, skill.content);

    // Split into frontmatter block and content body for separate rendering.
    // The generator always produces: ---\n<yaml>\n---\n\n<content>\n
    const closingDelimiter = raw.indexOf("---", 4);
    const fmBlock = closingDelimiter !== -1 ? raw.slice(0, closingDelimiter + 3) : "";
    const body = closingDelimiter !== -1 ? raw.slice(closingDelimiter + 3).trim() : raw;

    return { rawSkillMd: raw, frontmatterBlock: fmBlock, contentBody: body };
  }, [skill.name, skill.description, skill.trigger, skill.modelPattern, skill.content]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawSkillMd);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [rawSkillMd]);

  const errors = validationErrors.filter((e) => e.severity === "error");
  const warnings = validationErrors.filter((e) => e.severity === "warning");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header with copy button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-heading">Generated SKILL.md</h2>
          <p className="text-sm text-muted-foreground">
            Preview of the skill file exactly as it will be exported.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Validation warning banner */}
      {errors.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              {errors.length} validation {errors.length === 1 ? "error" : "errors"}
            </p>
            <ul className="list-inside list-disc text-xs text-destructive/80">
              {errors.map((e) => (
                <li key={`${e.field}-${e.message}`}>{e.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {warnings.length > 0 && errors.length === 0 && (
        <div className="flex items-start gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              {warnings.length} {warnings.length === 1 ? "warning" : "warnings"}
            </p>
            <ul className="list-inside list-disc text-xs text-yellow-600/80 dark:text-yellow-400/80">
              {warnings.map((e) => (
                <li key={`${e.field}-${e.message}`}>{e.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* YAML frontmatter block -- monospace, code-style rendering */}
      <div className="rounded-md border border-border bg-muted/50">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">YAML Frontmatter</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
          {frontmatterBlock}
        </pre>
      </div>

      <Separator />

      {/* Markdown content body -- proportional font */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Instructions</span>
        <div className="rounded-md border border-border p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
            {contentBody || (
              <span className="italic text-muted-foreground">No instructions content.</span>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Associated files list */}
      <div className="space-y-3">
        <span className="text-xs font-medium text-muted-foreground">Associated Files</span>

        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No additional files attached to this skill.
          </p>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-sm">{file.path}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {file.type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {files.length} {files.length === 1 ? "file" : "files"} &middot;{" "}
            {files.filter((f) => f.type === "prompt").length} prompt,{" "}
            {files.filter((f) => f.type === "resource").length} resource
          </p>
        )}
      </div>
    </div>
  );
}
