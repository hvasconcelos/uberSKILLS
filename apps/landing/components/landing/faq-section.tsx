"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useInView } from "@/hooks/use-in-view";

const faqs = [
  {
    question: "What is uberSKILLS?",
    answer:
      "uberSKILLS is an open-source web application for designing, testing, and deploying Agent Skills. It provides a visual editor with AI-assisted creation, a multi-model testing sandbox, and one-click deployment to your agent of choice.",
  },
  {
    question: "What are Agent Skills?",
    answer:
      "Agent Skills are reusable instruction sets (SKILL.md files) that teach code agents how to perform specific tasks. They contain metadata, structured instructions, and optional file templates that agents can follow to complete complex workflows consistently.",
  },
  {
    question: "Which code agents does uberSKILLS support?",
    answer:
      "uberSKILLS supports deploying skills to Claude Code, OpenAI Codex, OpenClaw, and OpenCode. Skills are exported in standard SKILL.md format, so they can also be adapted for other agents that support markdown-based instructions.",
  },
  {
    question: "Do I need an API key to use uberSKILLS?",
    answer:
      "You need an OpenRouter API key to use AI-assisted skill creation and the testing sandbox. The visual editor and manual skill creation work without an API key. Your key is encrypted with AES-256-GCM and never leaves your machine.",
  },
  {
    question: "Is uberSKILLS free?",
    answer:
      "Yes, uberSKILLS is completely free and open-source under the MIT license. You only pay for the AI model usage through your own OpenRouter API key when using AI-assisted features.",
  },
  {
    question: "How does the AI-assisted skill creation work?",
    answer:
      "Describe what you want your skill to do in natural language, and the AI generates a complete SKILL.md file with metadata, instructions, and file templates. You can iterate on the output through a chat interface until the skill matches your intent.",
  },
  {
    question: "Can I test skills against different AI models?",
    answer:
      "Yes. The testing sandbox lets you run your skill against any model available on OpenRouter, including Claude, GPT-4, Gemini, Llama, and more. You get streaming responses with token usage metrics so you can compare results across models.",
  },
  {
    question: "How does deployment work?",
    answer:
      "One-click deployment copies your skill to the appropriate directory for your chosen agent (e.g., ~/.claude/skills/ for Claude Code). You can also export skills as a zip file to share with others or back up your work.",
  },
  {
    question: "Can I import existing skills?",
    answer:
      "Yes. You can import skills from zip files or directly from a directory on your filesystem. uberSKILLS parses the SKILL.md format and loads the skill into the editor for further editing, testing, and deployment.",
  },
  {
    question: "Is my data stored locally?",
    answer:
      "All data is stored in a local SQLite database on your machine. Nothing is sent to external servers except AI model requests through OpenRouter when you use AI-assisted features. You have full control over your data.",
  },
] as const;

export function FaqSection() {
  const { ref, inView } = useInView({ threshold: 0.1, umamiEvent: "section-faq-view" });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-16 md:py-24" ref={ref}>
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <h2
          className={`mb-12 text-center text-3xl font-bold tracking-tight ${inView ? "animate-fade-up" : "opacity-0"}`}
          style={{ textWrap: "balance" }}
        >
          Frequently Asked Questions
        </h2>
        <div className="divide-y divide-border">
          {faqs.map((faq, i) => (
            <div
              key={faq.question}
              className={`${inView ? "animate-fade-up" : "opacity-0"}`}
              style={{ animationDelay: `${(i + 1) * 75}ms` }}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between py-4 text-left font-medium transition-colors hover:text-primary"
                aria-expanded={openIndex === i}
                data-umami-event={`faq-toggle-${i}`}
              >
                {faq.question}
                <ChevronDown
                  className={`ml-2 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${openIndex === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
