"use client";

import { detectPlaceholders, substitute } from "@uberskills/skill-engine";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Separator,
  Textarea,
} from "@uberskills/ui";
import { ArrowLeft, Eye, Key, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { ModelSelector } from "@/components/model-selector";

import { ArgumentInputs } from "./argument-inputs";
import type { SandboxStateItem } from "./sandbox-upload";
import { SandboxUpload } from "./sandbox-upload";

/** Serialised skill data passed from the server component. */
export interface TestSkillData {
  id: string;
  name: string;
  slug: string;
  content: string;
}

/** Represents the result stream from a test run. */
export interface TestRunStream {
  testRunId: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  /** Sandbox state ID used for this run, if any. */
  sandboxStateId: string | null;
}

interface TestConfigPanelProps {
  skill: TestSkillData;
  defaultModel: string;
  hasApiKey: boolean;
  /** Called when a test run starts streaming. */
  onTestStart: (stream: TestRunStream) => void;
  /** Whether a test is currently running. */
  isRunning: boolean;
}

/**
 * Left panel of the skill testing page.
 *
 * Contains model selector, resolved system prompt preview, sandbox selector,
 * argument inputs for detected $VARIABLE_NAME placeholders, user message
 * textarea, and the "Run Test" button that initiates a test via POST /api/test.
 */
export function TestConfigPanel({
  skill,
  defaultModel,
  hasApiKey,
  onTestStart,
  isRunning,
}: TestConfigPanelProps) {
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [userMessage, setUserMessage] = useState("");
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSandbox, setSelectedSandbox] = useState<SandboxStateItem | null>(null);

  // Detect $VARIABLE_NAME placeholders in skill content
  const placeholders = useMemo(() => detectPlaceholders(skill.content), [skill.content]);

  // Build the resolved system prompt by substituting argument values
  const resolvedPrompt = useMemo(
    () => substitute(skill.content, argValues),
    [skill.content, argValues],
  );

  const isBusy = isRunning || isSubmitting;
  const canRun = hasApiKey && selectedModel && userMessage.trim().length > 0 && !isBusy;

  const handleRunTest = useCallback(async () => {
    if (!canRun) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.id,
          model: selectedModel,
          userMessage: userMessage.trim(),
          // Only include arguments when the skill has placeholders to substitute
          arguments: placeholders.length > 0 ? argValues : undefined,
          // Include sandbox state ID if a sandbox is selected
          sandboxStateId: selectedSandbox?.id ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? `Test failed (${res.status})`);
        return;
      }

      // The API returns the test run ID in a header and streams the response body.
      // Pass both to the parent so it can track the run and consume the stream.
      const testRunId = res.headers.get("X-Test-Run-Id") ?? "";
      const reader = res.body?.getReader();

      if (!reader) {
        toast.error("No response stream available");
        return;
      }

      onTestStart({ testRunId, reader, sandboxStateId: selectedSandbox?.id ?? null });
    } catch {
      toast.error("Failed to start test. Check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canRun,
    skill.id,
    selectedModel,
    userMessage,
    argValues,
    placeholders.length,
    selectedSandbox,
    onTestStart,
  ]);

  // Early return: prompt the user to configure an API key before testing
  if (!hasApiKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <Key className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">API Key Required</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your OpenRouter API key in Settings to run skill tests.
          </p>
        </div>
        <Button asChild variant="default">
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Back link and skill name */}
      <div className="shrink-0 space-y-4 p-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/skills/${skill.slug}`}>
            <ArrowLeft className="size-4" />
            Back to Editor
          </Link>
        </Button>

        <h1 className="text-page-title tracking-tight">{skill.name}</h1>
        <p className="text-sm text-muted-foreground">
          Configure parameters and run a test against this skill.
        </p>
      </div>

      <Separator />

      {/* Configuration form */}
      <div className="flex-1 space-y-5 p-5">
        {/* Model selector */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Model</Label>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={isBusy} />
        </div>

        {/* System prompt preview dialog */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Resolved System Prompt</Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Eye className="size-4 text-muted-foreground" />
                <span className="truncate text-muted-foreground">View Resolved Prompt</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>Resolved System Prompt</DialogTitle>
                <DialogDescription>
                  The system prompt sent to the model with all arguments substituted.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {resolvedPrompt || (
                  <span className="text-muted-foreground italic">No skill content</span>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sandbox file upload / selector */}
        <SandboxUpload
          skillId={skill.id}
          selectedId={selectedSandbox?.id ?? null}
          onSelect={setSelectedSandbox}
          disabled={isBusy}
        />

        {/* Argument inputs for detected placeholders */}
        <ArgumentInputs
          placeholders={placeholders}
          values={argValues}
          onChange={setArgValues}
          disabled={isBusy}
        />

        {/* User message textarea */}
        <div className="space-y-1.5">
          <Label htmlFor="test-user-message" className="text-sm font-medium">
            User Message
          </Label>
          <Textarea
            id="test-user-message"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Enter the test prompt to send alongside the system prompt..."
            className="min-h-[120px] resize-none font-mono text-sm"
            disabled={isBusy}
          />
        </div>
      </div>

      {/* Run test button pinned at bottom */}
      <div className="shrink-0 border-t border-border p-5">
        <Button className="w-full" onClick={handleRunTest} disabled={!canRun}>
          {isBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Run Test
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
