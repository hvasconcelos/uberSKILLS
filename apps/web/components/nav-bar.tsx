"use client";

import { cn } from "@uberskillz/ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/skills", label: "Skills" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
] as const;

/**
 * Top navigation bar displayed on every page.
 * Full-width with centered content (max-w-6xl), 64px tall.
 * Active route detected via usePathname() and highlighted with foreground color.
 */
export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="h-16 w-full border-b bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="UberSkills"
            width={160}
            height={40}
            priority
            className="dark:invert"
          />
        </Link>

        <div className="flex items-center gap-6">
          {navLinks.map(({ href, label }) => {
            // Match active route: exact match or starts with the href (for nested routes)
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
