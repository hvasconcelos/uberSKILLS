"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@uberskillz/ui";
import { AppSidebar } from "@/components/app-sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
