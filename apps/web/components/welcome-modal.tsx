"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@uberskills/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const COOKIE_NAME = "uberskills_welcome_seen";
const TEN_YEARS_SECONDS = 10 * 365 * 24 * 60 * 60;

function hasCookie(name: string): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
}

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!hasCookie(COOKIE_NAME)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    setCookie(COOKIE_NAME, "true", TEN_YEARS_SECONDS);
    setOpen(false);
  };

  const goToSettings = () => {
    dismiss();
    router.push("/settings");
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && dismiss()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to uberSKILLS</DialogTitle>
          <DialogDescription>
            To get started, you need to configure your OpenRouter API key in Settings.
          </DialogDescription>
        </DialogHeader>

        <video
          src="/set-openrouter-key.mp4"
          loop
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg"
        />

        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>
            Got it
          </Button>
          <Button onClick={goToSettings}>Go to Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
