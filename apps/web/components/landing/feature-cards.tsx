"use client";

import { Card, CardContent } from "@uberskills/ui";
import { FileCode2, FlaskConical, GitCompare, Rocket, Share2, Wand2 } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";

const features = [
  {
    icon: Wand2,
    title: "Visual Editor with AI",
    description:
      "Design skills visually or let AI generate them from natural language. Edit metadata, instructions, and file patterns.",
  },
  {
    icon: FlaskConical,
    title: "Multi-Model Sandbox",
    description:
      "Test skills against multiple models with streaming responses. Compare outputs and track test history.",
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description:
      "Deploy directly to ~/.claude/skills/ with one click, or export as a zip to share with your team.",
  },
  {
    icon: Share2,
    title: "Import & Share",
    description:
      "Import skills from zip files or directories. Export and share with your team or the community.",
  },
  {
    icon: GitCompare,
    title: "Version History",
    description:
      "Every edit is tracked. Browse previous versions of your skills and restore any revision.",
  },
  {
    icon: FileCode2,
    title: "SKILL.md Standard",
    description:
      "Built on the SKILL.md format with YAML frontmatter and markdown body. Validated, parsed, and generated automatically.",
  },
] as const;

export function FeatureCards() {
  const { ref, inView } = useInView({ threshold: 0.15 });

  return (
    <section className="border-t py-16 md:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2
          className={`mb-12 text-center text-3xl font-bold tracking-tight ${inView ? "animate-fade-up" : "opacity-0"}`}
          style={{ textWrap: "balance" }}
        >
          Everything You Need to Build Skills
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className={`card-hover ${inView ? "animate-fade-up" : "opacity-0"}`}
              style={{ animationDelay: `${(i + 1) * 120}ms` }}
            >
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-muted p-2.5">
                  <feature.icon className="size-5 text-foreground" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
