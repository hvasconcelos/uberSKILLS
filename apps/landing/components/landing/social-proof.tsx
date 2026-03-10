"use client";

import { Button } from "@uberskills/ui";
import { GithubIcon, StarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "@/hooks/use-in-view";
import { InstallCommand } from "./install-command";

export function SocialProof() {
  const [stars, setStars] = useState<number | null>(null);
  const { ref, inView } = useInView({ threshold: 0.2, umamiEvent: "section-social-proof-view" });

  useEffect(() => {
    fetch("https://api.github.com/repos/uberskillsdev/uberskills")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="border-t py-16 md:py-24" ref={ref}>
      <div
        className={`mx-auto flex max-w-2xl flex-col items-center px-4 text-center md:px-6 ${inView ? "animate-fade-up" : "opacity-0"}`}
      >
        <h2
          className="text-2xl font-bold tracking-tight md:text-3xl"
          style={{ textWrap: "balance" }}
        >
          Start Building Skills Today
        </h2>

        <p className="mt-3 text-muted-foreground" style={{ textWrap: "balance" }}>
          Open source, free forever. Join the community shaping the future of Agent Skills.
        </p>

        <div className="mt-8">
          <InstallCommand />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/uberskillsdev/uberskills"
              target="_blank"
              rel="noopener noreferrer"
              data-umami-event="social-github-click"
            >
              <GithubIcon className="size-4" aria-hidden="true" />
              {stars !== null ? (
                <>
                  <StarIcon
                    className="size-3.5 fill-yellow-400 text-yellow-400"
                    aria-hidden="true"
                  />
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{stars}</span>
                </>
              ) : (
                "Star on GitHub"
              )}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
