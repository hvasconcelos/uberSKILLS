"use client";

import { Card, CardContent } from "@uberskills/ui";
import { useInView } from "@/hooks/use-in-view";

const features = [
  {
    emoji: "\u2728",
    title: "Visual Editor with AI",
    description:
      "Design skills visually or let AI generate them from natural language. Edit metadata, instructions, and file patterns.",
  },
  {
    emoji: "\uD83E\uDDEA",
    title: "Multi-Model Sandbox",
    description:
      "Test skills against multiple models with streaming responses. Compare outputs and track test history.",
  },
  {
    emoji: "\uD83D\uDE80",
    title: "One-Click Deploy",
    description:
      "Deploy to Claude Code, OpenAI Codex, OpenClaw, or OpenCode with one click, or export as a zip to share with your team.",
  },
  {
    emoji: "\uD83D\uDD00",
    title: "Import & Share",
    description:
      "Import skills from zip files or directories. Export and share with your team or the community.",
  },
  {
    emoji: "\uD83D\uDD04",
    title: "Version History",
    description:
      "Every edit is tracked. Browse previous versions of your skills and restore any revision.",
  },
  {
    emoji: "\uD83D\uDCDD",
    title: "SKILL.md Standard",
    description:
      "Built on the SKILL.md format with YAML frontmatter and markdown body. Validated, parsed, and generated automatically.",
  },
  {
    emoji: "\uD83D\uDCDA",
    title: "Skills Library",
    description: "Browse, search, filter, and manage all your skills in one place.",
  },
  {
    emoji: "\u270F\uFE0F",
    title: "Structured Editor",
    description: "Edit metadata, instructions, and files with real-time validation and auto-save.",
  },
] as const;

export function FeatureCards() {
  const { ref, inView } = useInView({ threshold: 0.15, umamiEvent: "section-features-view" });

  return (
    <section className="border-t py-16 md:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2
          className={`mb-12 text-center text-3xl font-bold tracking-tight ${inView ? "animate-fade-up" : "opacity-0"}`}
          style={{ textWrap: "balance" }}
        >
          Everything You Need to Build Skills
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className={`card-hover ${inView ? "animate-fade-up" : "opacity-0"}`}
              style={{ animationDelay: `${(i + 1) * 120}ms` }}
            >
              <CardContent className="pt-6">
                <span className="mb-4 block text-2xl" role="img" aria-hidden="true">
                  {feature.emoji}
                </span>
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
