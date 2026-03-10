"use client";

import { Button } from "@uberskills/ui";
import { GithubIcon, MoonIcon, SunIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

export function LandingNav() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/uberSKILLS_wattermark_white.svg"
            alt="uberSKILLS"
            width={120}
            height={37}
            className="block dark:hidden"
            priority
          />
          <Image
            src="/uberSKILLS_wattermark_black.svg"
            alt="uberSKILLS"
            width={120}
            height={37}
            className="hidden dark:block"
            priority
          />
        </Link>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/uberskillsdev/uberskills"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              data-umami-event="nav-github-click"
            >
              <GithubIcon className="size-5" aria-hidden="true" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            data-umami-event="nav-theme-toggle"
          >
            <SunIcon className="size-5 dark:hidden" aria-hidden="true" />
            <MoonIcon className="hidden size-5 dark:block" aria-hidden="true" />
          </Button>
        </div>
      </nav>
    </header>
  );
}
