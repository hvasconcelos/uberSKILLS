import type { SkillStatus } from "@uberskillz/types";
import { Badge, Card, CardContent, cn } from "@uberskillz/ui";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";

/** Maximum characters shown for the description before truncation. */
const DESCRIPTION_MAX_LENGTH = 120;

/** Minimal skill shape accepted by the card — works with both the Skill interface and raw DB rows. */
interface SkillCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: SkillStatus;
  /** Tags as `string[]` (parsed) or JSON string (raw DB row). */
  tags: string[] | string;
  updatedAt: Date;
}

interface SkillCardProps {
  skill: SkillCardData;
  className?: string;
}

/** Normalises tags to an array — handles both parsed arrays and raw JSON strings from the DB. */
function parseTags(tags: string[] | string): string[] {
  if (Array.isArray(tags)) return tags;
  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Displays a skill as a clickable card in the library grid.
 *
 * Shows: name, truncated description, status badge, tags, and last-updated date.
 * Navigates to the skill editor on click.
 */
export function SkillCard({ skill, className }: SkillCardProps) {
  const truncatedDescription =
    skill.description && skill.description.length > DESCRIPTION_MAX_LENGTH
      ? `${skill.description.slice(0, DESCRIPTION_MAX_LENGTH)}...`
      : skill.description;

  const tags = parseTags(skill.tags);

  return (
    <Link href={`/skills/${skill.slug}`} className="block">
      <Card className={cn("h-full transition-colors hover:bg-accent/50", className)}>
        <CardContent className="pt-6">
          {/* Name + status badge */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">{skill.name}</h3>
            <StatusBadge status={skill.status} />
          </div>

          {/* Description (truncated at 120 chars) */}
          {truncatedDescription && (
            <p className="text-sm text-muted-foreground">{truncatedDescription}</p>
          )}

          {/* Tags rendered as small chips */}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-0 text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Last updated date */}
          <p className="mt-3 text-xs text-muted-foreground">
            Updated{" "}
            {new Date(skill.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
