"use client";

import { useEffect, useRef } from "react";

import type { TestMetricsData } from "./test-metrics";
import { TestMetrics } from "./test-metrics";

interface TestResponsePanelProps {
  streamedText: string;
  isRunning: boolean;
  error: string | null;
  metrics: TestMetricsData | null;
}

export function TestResponsePanel({
  streamedText,
  isRunning,
  error,
  metrics,
}: TestResponsePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRunning && streamedText.length > 0) {
      scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [isRunning, streamedText]);

  if (!streamedText && !error && !isRunning) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <p className="text-sm">Run a test to see results</p>
        <p className="mt-1 text-xs">
          Configure the parameters on the left and click &quot;Run Test&quot;.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div
          className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--status-error-text)",
            color: "var(--status-error-text)",
          }}
          role="alert"
        >
          {error}
        </div>
        {metrics && <TestMetrics metrics={metrics} />}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
          role="log"
          aria-live="polite"
          aria-atomic={false}
        >
          {streamedText}
          {isRunning && (
            <span
              className="inline-block h-4 w-1.5 animate-pulse bg-foreground motion-reduce:animate-none motion-reduce:opacity-50"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {!isRunning && metrics && <TestMetrics metrics={metrics} />}
    </div>
  );
}
