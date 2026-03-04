import { listSkills } from "@uberskillz/db";
import type { SkillStatus } from "@uberskillz/types";
import { Badge, Button, Card, CardContent } from "@uberskillz/ui";
import { ArrowRight, Library, Plus, Upload } from "lucide-react";
import Link from "next/link";

// Dashboard shows live data (skill counts, recent skills) so it must not be
// statically generated at build time.
export const dynamic = "force-dynamic";

/**
 * Dashboard home page — server component that fetches skill data
 * and renders an overview with quick actions, stats, and recent skills.
 */
export default function DashboardPage() {
  // Fetch recent skills and total count in one query
  const { data: recentSkills, total: totalSkills } = listSkills({ limit: 5 });

  // Fetch per-status counts (only need the total from each)
  const { total: draftCount } = listSkills({ status: "draft", limit: 1 });
  const { total: readyCount } = listSkills({ status: "ready", limit: 1 });
  const { total: deployedCount } = listSkills({ status: "deployed", limit: 1 });

  const stats = [
    { label: "Total Skills", value: totalSkills },
    { label: "Draft", value: draftCount },
    { label: "Ready", value: readyCount },
    { label: "Deployed", value: deployedCount },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section>
        <h1 className="text-page-title tracking-tight">UberSkillz</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Design, test, and deploy Claude Code Agent Skills.
        </p>
      </section>

      {/* Quick actions */}
      <section className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/skills/new">
            <Plus className="size-4" />
            New Skill
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/skills">
            <Library className="size-4" />
            Browse Library
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/import">
            <Upload className="size-4" />
            Import
          </Link>
        </Button>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Recent skills */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-section-heading">Recent Skills</h2>
          {recentSkills.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/skills">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        {recentSkills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Library className="mb-3 size-10 text-muted-foreground" />
              <h3 className="font-semibold">No skills yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first skill to get started.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/skills/new">
                  <Plus className="size-4" />
                  Create Skill
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentSkills.map((skill) => (
              <Link key={skill.id} href={`/skills/${skill.slug}`}>
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardContent className="pt-6">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{skill.name}</h3>
                      <Badge variant={skill.status as SkillStatus}>{skill.status}</Badge>
                    </div>
                    {skill.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {skill.description}
                      </p>
                    )}
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
