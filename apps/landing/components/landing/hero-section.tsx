import { Badge, Button } from "@uberskills/ui";
import { GithubIcon } from "lucide-react";
import { InstallCommand } from "./install-command";
import { SectionTracker } from "./section-tracker";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <SectionTracker event="section-hero-view" />
      {/* Dot grid background */}
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />

      {/* Radial fade so dots don't dominate */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_80%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 text-center md:px-6">
        <Badge variant="outline" className="animate-fade-up stagger-1 mb-6">
          Open Source &mdash; MIT License
        </Badge>

        <h1
          className="animate-fade-up stagger-2 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          style={{ textWrap: "balance" }}
        >
          Design, Test, and Deploy
          <br />
          Agent Skills
        </h1>

        <p
          className="animate-fade-up stagger-3 mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          style={{ textWrap: "balance" }}
        >
          The visual workbench for building Agent Skills. Create with AI assistance, test across
          models, deploy with one click.
        </p>

        <div className="animate-fade-up stagger-4 mt-10">
          <InstallCommand />
        </div>

        <div className="animate-fade-up stagger-5 mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/uberskillsdev/uberskills"
              target="_blank"
              rel="noopener noreferrer"
              data-umami-event="hero-github-click"
            >
              <GithubIcon className="size-4" aria-hidden="true" />
              View on GitHub
            </a>
          </Button>
        </div>

        <div
          className="animate-fade-up relative mt-16 w-full max-w-4xl overflow-hidden rounded-xl border shadow-lg"
          style={{ animationDelay: "500ms" }}
        >
          <video
            className="w-full"
            autoPlay
            loop
            muted
            playsInline
            poster="/demo-poster.jpg"
            preload="auto"
          >
            <source src="/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
