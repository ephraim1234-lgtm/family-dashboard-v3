"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";
import { AppShellNav } from "./app-shell-nav";
import { Button } from "./button";

function shellContext(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return {
      label: "Admin",
      title: "Household Admin",
      description: "Owner-facing control for scheduling, display devices, members, and operations.",
      accentLabel: "Owner tools"
    };
  }

  if (pathname.startsWith("/app/calendar")) {
    return {
      label: "Calendar",
      title: "Calendar",
      description: "Week-first planning for local events, imported schedules, and reminders.",
      accentLabel: "Family planning"
    };
  }

  if (pathname.startsWith("/app/food")) {
    return {
      label: "Food",
      title: "Food hub",
      description: "Recipes, pantry, meal planning, shopping, and cooking sessions.",
      accentLabel: "Family meals"
    };
  }

  return {
    label: "Command Center",
    title: "Family Command Center",
    description: "Triage today, keep the household board close, and spot what needs attention next.",
    accentLabel: "Everyday rhythm"
  };
}

export function AppShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const context = shellContext(pathname);
  const todayLabel = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-0 xl:px-6 xl:py-6">
        <aside className="app-shell-sidebar hidden h-[calc(100vh-3rem)] w-[320px] shrink-0 xl:sticky xl:top-6 xl:flex xl:flex-col">
          <div className="app-shell-sidebar-inner">
            <div className="app-shell-brand-card">
              <div className="app-shell-brand-mark" aria-hidden="true">
                <span>H</span>
              </div>
              <div className="space-y-1">
                <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.32em]">
                  {context.accentLabel}
                </div>
                <div className="text-2xl font-semibold tracking-tight text-[color:var(--text-strong)]">
                  {siteConfig.productName}
                </div>
                <p className="app-shell-copy text-sm leading-6">
                  TailAdmin-inspired structure with a calmer, household-first tone.
                </p>
              </div>
            </div>

            <div className="app-shell-section">
              <div className="app-shell-section-heading">Navigate</div>
              <AppShellNav />
            </div>

            <div className="app-shell-footnote mt-auto">
              <div className="app-shell-section-heading">Current space</div>
              <div className="space-y-2">
                <div className="text-base font-semibold text-[color:var(--text-strong)]">
                  {context.title}
                </div>
                <p className="app-shell-copy text-sm">
                  {context.description}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="app-shell-mobile-header sticky top-0 z-40 xl:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="min-w-0 space-y-1">
                <div className="app-shell-kicker text-[11px] font-semibold uppercase tracking-[0.28em]">
                  {context.label}
                </div>
                <div className="truncate text-lg font-semibold text-[color:var(--text-strong)]">
                  {context.title}
                </div>
                <div className="truncate text-xs text-[color:var(--text-muted)]">
                  {todayLabel}
                </div>
              </div>
              <Button
                aria-label="Open navigation"
                aria-expanded={isDrawerOpen}
                variant="ghost"
                size="sm"
                onClick={() => setIsDrawerOpen(true)}
              >
                Menu
              </Button>
            </div>
          </header>

          {isDrawerOpen ? (
            <div className="fixed inset-0 z-50 xl:hidden">
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-[color:var(--overlay-backdrop)]"
                onClick={() => setIsDrawerOpen(false)}
              />
              <section className="app-shell-drawer relative ml-auto flex h-full w-full max-w-sm flex-col gap-6 p-5 shadow-2xl">
                <div className="app-shell-brand-card">
                  <div className="app-shell-brand-mark" aria-hidden="true">
                    <span>H</span>
                  </div>
                  <div className="min-w-0">
                    <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.28em]">
                      {context.accentLabel}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]">
                      {siteConfig.productName}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {todayLabel}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="app-shell-section-heading">Navigate</div>
                  <AppShellNav onNavigate={() => setIsDrawerOpen(false)} />
                </div>

                <div className="app-shell-footnote mt-auto">
                  <div className="app-shell-section-heading">Current space</div>
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-[color:var(--text-strong)]">
                      {context.title}
                    </div>
                    <div className="text-sm text-[color:var(--text-muted)]">
                      {context.description}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          <main className="flex min-w-0 flex-1 flex-col xl:py-6 xl:pr-6">
            <div className="app-shell-topbar hidden xl:flex">
              <div className="min-w-0 space-y-2">
                <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.32em]">
                  {context.label}
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-balance text-[color:var(--text-strong)] 2xl:text-4xl">
                  {context.title}
                </h1>
                <p className="app-shell-copy max-w-3xl text-sm leading-6 sm:text-base">
                  {context.description}
                </p>
              </div>
              <div className="app-shell-status-group">
                <div className="app-shell-status-card">
                  <div className="app-shell-status-label">Today</div>
                  <div className="app-shell-status-value">{todayLabel}</div>
                </div>
                <div className="app-shell-status-card">
                  <div className="app-shell-status-label">Design direction</div>
                  <div className="app-shell-status-value">Calm family dashboard</div>
                </div>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 xl:px-0 xl:py-0">
              <div className="min-w-0">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export const SharedShell = AppShell;
