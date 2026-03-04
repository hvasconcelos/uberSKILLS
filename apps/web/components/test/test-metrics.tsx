"use client";

import { Separator } from "@uberskillz/ui";
import { Clock, Hash, Zap } from "lucide-react";

export interface TestMetricsData {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  ttftMs: number | null;
}

interface TestMetricsProps {
  metrics: TestMetricsData;
}

function formatTokenCount(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TestMetrics({ metrics }: TestMetricsProps) {
  return (
    <section
      className="flex items-center rounded-lg border border-border bg-muted/50 text-xs"
      aria-label="Test run metrics"
    >
      <MetricCell
        icon={<Hash className="size-3.5 text-muted-foreground" />}
        label="Prompt"
        value={formatTokenCount(metrics.promptTokens)}
      />
      <Separator orientation="vertical" className="h-8" />
      <MetricCell
        icon={<Hash className="size-3.5 text-muted-foreground" />}
        label="Completion"
        value={formatTokenCount(metrics.completionTokens)}
      />
      <Separator orientation="vertical" className="h-8" />
      <MetricCell
        icon={<Hash className="size-3.5 text-muted-foreground" />}
        label="Total"
        value={formatTokenCount(metrics.totalTokens)}
      />
      <Separator orientation="vertical" className="h-8" />
      <MetricCell
        icon={<Clock className="size-3.5 text-muted-foreground" />}
        label="Latency"
        value={formatMs(metrics.latencyMs)}
      />
      <Separator orientation="vertical" className="h-8" />
      <MetricCell
        icon={<Zap className="size-3.5 text-muted-foreground" />}
        label="TTFT"
        value={formatMs(metrics.ttftMs)}
      />
    </section>
  );
}

function MetricCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
