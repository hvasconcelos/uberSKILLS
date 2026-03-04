"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { EditorSkillData } from "./editor-shell";

interface InstructionsTabProps {
  skill: EditorSkillData;
  onSaved?: () => void;
}

const TAB_SIZE = 2;
const TAB_STRING = " ".repeat(TAB_SIZE);

/** Calls PUT /api/skills/:id and throws on failure. */
async function updateSkillApi(skillId: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/skills/${skillId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
}

export function InstructionsTab({ skill, onSaved }: InstructionsTabProps) {
  const [content, setContent] = useState(skill.content);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const stats = useMemo(() => {
    const lines = content.split("\n");
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { lineCount: lines.length, wordCount: words, charCount: content.length };
  }, [content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Tab") return;

      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;

      if (e.shiftKey) {
        const beforeCursor = content.slice(0, selectionStart);
        const lineStart = beforeCursor.lastIndexOf("\n") + 1;
        const linePrefix = content.slice(lineStart, selectionStart);

        if (linePrefix.startsWith(TAB_STRING)) {
          const updated = content.slice(0, lineStart) + content.slice(lineStart + TAB_SIZE);
          setContent(updated);
          requestAnimationFrame(() => {
            textarea.selectionStart = Math.max(lineStart, selectionStart - TAB_SIZE);
            textarea.selectionEnd = Math.max(lineStart, selectionEnd - TAB_SIZE);
          });
        }
      } else {
        const updated = content.slice(0, selectionStart) + TAB_STRING + content.slice(selectionEnd);
        setContent(updated);
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + TAB_SIZE;
          textarea.selectionEnd = selectionStart + TAB_SIZE;
        });
      }
    },
    [content],
  );

  const save = useCallback(async () => {
    if (content === skill.content) return;

    setSaving(true);
    try {
      await updateSkillApi(skill.id, { content });
      onSaved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save instructions";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [content, skill.content, skill.id, onSaved]);

  return (
    <div className="space-y-3">
      <div
        className="relative flex overflow-hidden rounded-md border border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        style={{ minHeight: "400px", maxHeight: "70vh" }}
      >
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="shrink-0 select-none overflow-hidden border-r border-input bg-muted/50 px-3 py-2 text-right font-mono text-xs leading-[1.625rem] text-muted-foreground"
          style={{ minWidth: "3.5rem" }}
        >
          {Array.from({ length: stats.lineCount }, (_, i) => {
            const lineNumber = i + 1;
            return <div key={lineNumber}>{lineNumber}</div>;
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onBlur={save}
          placeholder="Write your skill instructions in Markdown..."
          spellCheck={false}
          aria-label="Skill instructions editor"
          className="flex-1 resize-y bg-transparent px-4 py-2 font-mono text-sm leading-[1.625rem] text-foreground outline-none placeholder:text-muted-foreground"
          style={{ minHeight: "400px", tabSize: TAB_SIZE }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>{stats.charCount} characters</span>
          <span>{stats.wordCount} words</span>
          <span>{stats.lineCount} lines</span>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}
