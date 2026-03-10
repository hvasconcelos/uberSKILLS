"use client";

import { Button } from "@uberskills/ui";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

const COMMAND = "npx uberskills";

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-3 rounded-lg border bg-foreground/[0.03] px-5 py-3 dark:bg-foreground/[0.06]">
      <span className="select-none font-mono text-sm text-muted-foreground" aria-hidden="true">
        $
      </span>
      <code className="font-mono text-sm font-medium">{COMMAND}</code>
      <span
        className="animate-blink inline-block h-4 w-[2px] bg-foreground/60"
        aria-hidden="true"
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy install command"}
        data-umami-event="copy-install-command"
      >
        {copied ? (
          <CheckIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <CopyIcon className="size-3.5" aria-hidden="true" />
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
