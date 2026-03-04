"use client";

import { useCallback, useRef, useState } from "react";

import type { TestRunStream, TestSkillData } from "@/components/test/test-config-panel";
import { TestConfigPanel } from "@/components/test/test-config-panel";
import type { HistorySelection } from "@/components/test/test-history";
import { TestHistory } from "@/components/test/test-history";
import type { TestMetricsData } from "@/components/test/test-metrics";
import { TestResponsePanel } from "@/components/test/test-response-panel";

interface TestPageClientProps {
  skill: TestSkillData;
  defaultModel: string;
  hasApiKey: boolean;
}

interface TestRunResponse {
  status: "running" | "completed" | "error";
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  ttftMs: number | null;
  error: string | null;
}

export function TestPageClient({ skill, defaultModel, hasApiKey }: TestPageClientProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<TestMetricsData | null>(null);
  // Incremented after each test completes to trigger a history table refresh
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const testRunIdRef = useRef<string | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Retries up to 3 times since the server's onFinish callback may lag behind the stream ending.
  const fetchMetrics = useCallback(async (testRunId: string) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(`/api/test/${testRunId}`);
        if (!res.ok) return;

        const data = (await res.json()) as TestRunResponse;

        if (data.status === "running" && attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }

        if (data.status === "error" && data.error) {
          setError(data.error);
        }

        setMetrics({
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          latencyMs: data.latencyMs,
          ttftMs: data.ttftMs,
        });
        return;
      } catch {
        return;
      }
    }
  }, []);

  const handleTestStart = useCallback(
    async (stream: TestRunStream) => {
      setIsRunning(true);
      setStreamedText("");
      setError(null);
      setMetrics(null);
      testRunIdRef.current = stream.testRunId;
      readerRef.current = stream.reader;

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await stream.reader.read();
          if (done) break;
          setStreamedText((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream interrupted";
        setError(message);
      } finally {
        setIsRunning(false);
        readerRef.current = null;

        if (testRunIdRef.current) {
          await fetchMetrics(testRunIdRef.current);
        }

        // Trigger history table refresh after metrics are fetched
        setHistoryRefreshKey((k) => k + 1);
      }
    },
    [fetchMetrics],
  );

  // Load a historical test run's response into the response panel
  const handleSelectHistoryRun = useCallback((selection: HistorySelection) => {
    setStreamedText(selection.text);
    setError(selection.error);
    setMetrics(selection.metrics);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Main two-panel layout */}
      <div className="flex h-[calc(100vh-14rem)] overflow-hidden rounded-lg border border-border">
        <div className="w-1/2 shrink-0 border-r border-border">
          <TestConfigPanel
            skill={skill}
            defaultModel={defaultModel}
            hasApiKey={hasApiKey}
            onTestStart={handleTestStart}
            isRunning={isRunning}
          />
        </div>

        <div className="flex w-1/2 flex-col overflow-hidden p-5">
          <TestResponsePanel
            streamedText={streamedText}
            isRunning={isRunning}
            error={error}
            metrics={metrics}
          />
        </div>
      </div>

      {/* Test history table */}
      <TestHistory
        skillId={skill.id}
        refreshKey={historyRefreshKey}
        onSelectRun={handleSelectHistoryRun}
      />
    </div>
  );
}
