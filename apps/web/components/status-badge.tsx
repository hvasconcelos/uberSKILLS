import type { SkillStatus } from "@uberskillz/types";
import { Badge, cn } from "@uberskillz/ui";

/** Human-readable labels for each skill lifecycle status. */
const STATUS_LABELS: Record<SkillStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  deployed: "Deployed",
};

interface StatusBadgeProps {
  /** The skill lifecycle status to display. */
  status: SkillStatus;
  className?: string;
}

/**
 * Renders a pill-shaped badge with status-specific semantic colors.
 *
 * Color mapping (light / dark handled via CSS custom properties):
 * - Draft  → gray bg/text
 * - Ready  → green bg/text
 * - Deployed → blue bg/text
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={status} className={cn("shrink-0", className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
