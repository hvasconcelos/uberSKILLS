"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@uberskillz/ui";
import {
  ChevronsLeftIcon,
  ChevronsRightIcon,
  LibraryIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/skills", label: "Skills", icon: LibraryIcon },
  { href: "/import", label: "Import", icon: UploadIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex flex-col items-center gap-0.5 px-2 py-1">
          <span className="truncate text-xl font-bold tracking-tight">
            {isCollapsed ? "U" : "UberSkillz"}
          </span>
          {!isCollapsed && <span className="text-sm text-muted-foreground">v0.0.0</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
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
                  </SidebarMenuItem>
                );
              })}
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
