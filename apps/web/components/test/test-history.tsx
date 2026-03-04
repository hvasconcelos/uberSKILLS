"use client";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uberskillz/ui";
import { Check, History, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { TestMetricsData } from "./test-metrics";

/** Shape of a test run returned by GET /api/skills/[id]/test-runs. */
export interface TestRunRow {
  id: string;
  runNumber: number;
  model: string;
  status: "running" | "completed" | "error";
  totalTokens: number | null;
  latencyMs: number | null;
  error: string | null;
  assistantResponse: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  ttftMs: number | null;
  createdAt: string;
}

/** Data emitted when a history row is selected. */
export interface HistorySelection {
  text: string;
  error: string | null;
  metrics: TestMetricsData;
}

interface TestHistoryProps {
  skillId: string;
  /** Incremented each time a new test completes to trigger a refresh. */
  refreshKey: number;
  onSelectRun: (selection: HistorySelection) => void;
}

const PAGE_SIZE = 10;

function formatTokenCount(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Returns a human-readable relative time string (e.g. "2 hours ago"). */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TestHistory({ skillId, refreshKey, onSelectRun }: TestHistoryProps) {
  const [runs, setRuns] = useState<TestRunRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/skills/${skillId}/test-runs`);
      if (!res.ok) return;
      const data = (await res.json()) as { testRuns: TestRunRow[] };
      setRuns(data.testRuns);
    } catch {
      // Silently fail — the table just stays empty or stale
    } finally {
      setIsLoading(false);
    }
  }, [skillId]);

  // Fetch on mount and whenever refreshKey changes (new test completed).
  // refreshKey is read inside the effect to satisfy the exhaustive-deps rule.
  useEffect(() => {
    if (refreshKey >= 0) fetchRuns();
  }, [fetchRuns, refreshKey]);

  const handleRowClick = useCallback(
    (run: TestRunRow) => {
      onSelectRun({
        text: run.assistantResponse ?? "",
        error: run.status === "error" ? run.error : null,
        metrics: {
          promptTokens: run.promptTokens,
          completionTokens: run.completionTokens,
          totalTokens: run.totalTokens,
          latencyMs: run.latencyMs,
          ttftMs: run.ttftMs,
        },
      });
    },
    [onSelectRun],
  );

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">Loading test history...</div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <History className="size-5" />
        <p className="text-sm">No test runs yet</p>
      </div>
    );
  }

  const visibleRuns = runs.slice(0, visibleCount);
  const hasMore = visibleCount < runs.length;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Test History</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="w-24 text-right">Tokens</TableHead>
              <TableHead className="w-24 text-right">Latency</TableHead>
              <TableHead className="w-16 text-center">Status</TableHead>
              <TableHead className="w-28 text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRuns.map((run) => (
              <TableRow
                key={run.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(run)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowClick(run);
                  }
                }}
              >
                <TableCell className="font-medium tabular-nums">{run.runNumber}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">{run.model}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTokenCount(run.totalTokens)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatLatency(run.latencyMs)}
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon status={run.status} />
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {relativeTime(run.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Load more ({runs.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: "running" | "completed" | "error" }) {
  if (status === "completed") {
    return (
      <Check className="inline-block size-4" style={{ color: "var(--status-success-text)" }} />
    );
  }
  if (status === "error") {
    return <X className="inline-block size-4" style={{ color: "var(--status-error-text)" }} />;
  }
  // "running" — shouldn't normally appear in history, but handle gracefully
  return <span className="inline-block size-2 animate-pulse rounded-full bg-muted-foreground" />;
}
