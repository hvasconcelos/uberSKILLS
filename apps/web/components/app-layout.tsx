"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@uberskills/ui";
import { AppSidebar } from "@/components/app-sidebar";
import { WelcomeModal } from "@/components/welcome-modal";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Made with ❤️ by Hélder Vasconcelos
        </footer>
        <WelcomeModal />
      </SidebarInset>
    </SidebarProvider>
  );
}
