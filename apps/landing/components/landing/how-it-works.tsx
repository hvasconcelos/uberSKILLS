"use client";

import { useInView } from "@/hooks/use-in-view";

const steps = [
  {
    number: 1,
    title: "Describe Your Skill",
    description:
      "Start from scratch or describe what you want and let AI generate the SKILL.md for you.",
  },
  {
    number: 2,
    title: "Test Across Models",
    description:
      "Run in the sandbox with streaming AI responses. Iterate until the output matches your intent.",
  },
  {
    number: 3,
    title: "Deploy Instantly",
    description:
      "One-click deploy to Claude Code, OpenAI Codex, OpenClaw, or OpenCode. Or export a zip to share.",
  },
] as const;

export function HowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.15, umamiEvent: "section-how-it-works-view" });

  return (
    <section className="py-8 md:py-12" ref={ref}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2
          className={`mb-16 text-center text-3xl font-bold tracking-tight ${inView ? "animate-fade-up" : "opacity-0"}`}
          style={{ textWrap: "balance" }}
        >
          From Idea to Deployment in Minutes
        </h2>
        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
          {/* Connecting line (desktop: horizontal, hidden on mobile) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-border md:block"
            aria-hidden="true"
          />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative flex gap-4 md:flex-col md:items-center ${inView ? "animate-fade-up" : "opacity-0"}`}
              style={{ animationDelay: `${(i + 1) * 150}ms` }}
            >
              {/* Mobile connecting line */}
              {i < steps.length - 1 && (
                <div
                  className="absolute left-5 top-12 h-[calc(100%+1rem)] w-px bg-border md:hidden"
                  aria-hidden="true"
                />
              )}

              <div className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background font-mono text-sm font-bold text-primary">
                {step.number}
              </div>
              <div className="md:text-center">
                <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
