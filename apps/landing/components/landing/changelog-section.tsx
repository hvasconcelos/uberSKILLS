"use client";

import { useInView } from "@/hooks/use-in-view";

const releases = [
  {
    version: "0.9.9",
    date: "2026-03-17",
    changes: [
      "Switched AI output to structured JSON for more reliable skill generation",
      "Enforced stricter metadata constraints (name and description limits)",
      "Fixed missing skill name in AI-generated output",
    ],
  },
  {
    version: "0.9.8",
    date: "2026-03-13",
    changes: [
      "Deploy targets for Antigravity, Cursor, Gemini CLI, GitHub Copilot, and Windsurf",
      "Inline import results card and agent selector for directory scanning",
      "Tilde expansion and symlink support in the skill importer",
    ],
  },
  {
    version: "0.9.7",
    date: "2026-03-13",
    changes: [
      "OpenGraph meta tags, sitemap, and robots.txt for landing page SEO",
      "JSON-LD structured data for improved search engine visibility",
      "Umami analytics integration for privacy-friendly usage tracking",
    ],
  },
] as const;

export function ChangelogSection() {
  const { ref, inView } = useInView({ threshold: 0.15, umamiEvent: "section-changelog-view" });

  return (
    <section className="border-t py-16 md:py-24" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2
          className={`mb-4 text-center text-3xl font-bold tracking-tight ${inView ? "animate-fade-up" : "opacity-0"}`}
          style={{ textWrap: "balance" }}
        >
          What&apos;s New
        </h2>
        <p
          className={`mx-auto mb-12 max-w-xl text-center text-sm text-muted-foreground ${inView ? "animate-fade-up" : "opacity-0"}`}
          style={{ animationDelay: "100ms" }}
        >
          Latest updates and improvements.{" "}
          <a
            href="https://github.com/uberskillsdev/uberskills/blob/master/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
            data-umami-event="changelog-full-link-click"
          >
            Full changelog
          </a>
        </p>

        <div className="relative mx-auto max-w-2xl">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

          <div className="space-y-10">
            {releases.map((release, i) => (
              <div
                key={release.version}
                className={`relative pl-8 ${inView ? "animate-fade-up" : "opacity-0"}`}
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                {/* Timeline dot */}
                <div
                  className="absolute left-0 top-1.5 size-[15px] rounded-full border-2 border-primary bg-background"
                  aria-hidden="true"
                />

                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm font-bold">v{release.version}</span>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>

                <ul className="mt-2 space-y-1.5">
                  {release.changes.map((change) => (
                    <li key={change} className="text-sm leading-relaxed text-muted-foreground">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
