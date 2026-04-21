"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";
import { AppShellNav } from "./app-shell-nav";

function shellContext(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return {
      label: "Admin",
      title: "Household control center",
      description: "Owner-facing workflows across scheduling, display, members, and operations."
    };
  }

  if (pathname.startsWith("/app/food")) {
    return {
      label: "Food",
      title: "Food hub",
      description: "Recipes, pantry, meal planning, shopping, and cooking sessions."
    };
  }

  return {
    label: "Overview",
    title: "Household workspace",
    description: "A member-friendly home for today, chores, notes, and agenda."
  };
}

export function SharedShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const context = shellContext(pathname);

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="app-shell-sidebar sticky top-0 hidden h-screen w-80 shrink-0 px-6 py-6 xl:flex xl:flex-col">
          <div className="space-y-2">
            <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.32em]">
              {context.label}
            </div>
            <div className="text-2xl font-semibold tracking-tight">
              {siteConfig.productName}
            </div>
            <p className="app-shell-copy text-sm leading-6">
              {context.description}
            </p>
          </div>

          <div className="mt-8">
            <AppShellNav />
          </div>

          <div className="app-shell-footnote mt-auto space-y-3 rounded-[1.5rem] p-4">
            <div>
              <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.28em]">
                Foundation
              </div>
              <p className="app-shell-copy mt-2 text-sm">
                Shared app and admin surfaces now use one neutral base theme for the TailAdmin migration.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="app-shell-mobile-header sticky top-0 z-40 xl:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.28em]">
                  {context.label}
                </div>
                <div className="truncate text-lg font-semibold">
                  {context.title}
                </div>
              </div>
              <button
                type="button"
                className="ui-button ui-button-ghost ui-button-sm"
                aria-label="Open navigation"
                aria-expanded={isDrawerOpen}
                onClick={() => setIsDrawerOpen(true)}
              >
                Menu
              </button>
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
              <section className="app-shell-drawer relative ml-auto flex h-full w-full max-w-xs flex-col gap-6 px-5 py-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.28em]">
                      {context.label}
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {siteConfig.productName}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ui-button ui-button-ghost ui-button-sm"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <AppShellNav onNavigate={() => setIsDrawerOpen(false)} />

                <div className="app-shell-footnote mt-auto space-y-3 rounded-[1.5rem] p-4">
                  <div className="app-shell-copy text-sm">
                    Shared app and admin surfaces use one neutral base theme while the new layout system is introduced.
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 xl:py-10">
            <div className="mb-6 hidden items-start justify-between gap-6 xl:flex">
              <div className="space-y-2">
                <div className="app-shell-kicker text-xs font-semibold uppercase tracking-[0.32em]">
                  {context.label}
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-balance">
                  {context.title}
                </h1>
                <p className="app-shell-copy max-w-3xl text-sm leading-6 sm:text-base">
                  {context.description}
                </p>
              </div>
            </div>

            <div className="min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
