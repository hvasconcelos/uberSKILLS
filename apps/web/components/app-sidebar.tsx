"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@uberskills/ui";
import {
  BookOpenIcon,
  BugIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ExternalLinkIcon,
  GithubIcon,
  LibraryIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/skills", label: "Skills", icon: LibraryIcon },
  { href: "/import", label: "Import", icon: UploadIcon },
  { href: "/documentation", label: "Documentation", icon: BookOpenIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

const linkItems = [
  {
    href: "https://github.com/uberskillsdev/uberskills",
    label: "GitHub",
    icon: GithubIcon,
  },
  {
    href: "https://github.com/uberskillsdev/uberskills/issues/new",
    label: "Open an Issue",
    icon: BugIcon,
  },
  {
    href: "https://docs.anthropic.com/en/docs/claude-code/skills",
    label: "Skills Docs",
    icon: BookOpenIcon,
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [skillCount, setSkillCount] = useState<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-fetch skill count on navigation
  useEffect(() => {
    fetch("/api/skills?limit=1")
      .then((res) => res.json())
      .then((data) => setSkillCount(data.total ?? null))
      .catch(() => setSkillCount(null));
  }, [pathname]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center px-2 py-3">
          <Image
            src="/uberSKILLS_logo_white.svg"
            alt="uberSKILLS"
            width={24}
            height={24}
            className="block group-data-[state=expanded]:hidden dark:hidden"
          />
          <Image
            src="/uberSKILLS_icon_dark.svg"
            alt="uberSKILLS"
            width={24}
            height={24}
            className="hidden dark:block dark:group-data-[state=expanded]:hidden"
          />
          <Image
            src="/uberSKILLS_wattermark_white.svg"
            alt="uberSKILLS"
            width={120}
            height={37}
            className="hidden group-data-[state=expanded]:block dark:!hidden"
          />
          <Image
            src="/uberSKILLS_wattermark_black.svg"
            alt="uberSKILLS"
            width={120}
            height={37}
            className="hidden dark:group-data-[state=expanded]:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSeparator className="mx-0" />
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {href === "/skills" && skillCount !== null && (
                      <SidebarMenuBadge className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {skillCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {linkItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild tooltip={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Icon />
                      <span className="flex flex-1 items-center justify-between">
                        {label}
                        <ExternalLinkIcon className="size-3 text-muted-foreground" />
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} tooltip="Collapse sidebar">
              {isCollapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
