import { Badge, Separator } from "@uberskills/ui";
import { GithubIcon } from "lucide-react";
import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Image
              src="/uberSKILLS_wattermark_white.svg"
              alt="uberSKILLS"
              width={100}
              height={31}
              className="block dark:hidden"
            />
            <Image
              src="/uberSKILLS_wattermark_black.svg"
              alt="uberSKILLS"
              width={100}
              height={31}
              className="hidden dark:block"
            />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The visual workbench for Agent Skills.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Resources</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/uberskillsdev/uberskills"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                  data-umami-event="footer-github-click"
                >
                  <GithubIcon className="size-3.5" aria-hidden="true" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@uberskillsdev/uberskills"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                  data-umami-event="footer-npm-click"
                >
                  npm
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/uberskillsdev/uberskills/tree/master/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                  data-umami-event="footer-docs-click"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://agentskills.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                  data-umami-event="footer-agentskills-click"
                >
                  Agent Skills Standard
                </a>
              </li>
            </ul>
          </div>

          {/* License */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">License</h3>
            <Badge variant="secondary">MIT</Badge>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-sm text-muted-foreground">
          Made with &hearts; by Helder Vasconcelos
        </p>
      </div>
    </footer>
  );
}
