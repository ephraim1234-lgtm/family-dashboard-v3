"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SHELL_TABS = [
  {
    href: "/app",
    label: "Command Center",
    description: "Triage today, board context, chores, and agenda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6.75h16M4 12h16M4 17.25h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  {
    href: "/app/calendar",
    label: "Calendar",
    description: "Week-first family planning and reminders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7.5 4.75v3M16.5 4.75v3M5 9.25h14M6.75 6.75h10.5A1.75 1.75 0 0 1 19 8.5v8.75A1.75 1.75 0 0 1 17.25 19H6.75A1.75 1.75 0 0 1 5 17.25V8.5a1.75 1.75 0 0 1 1.75-1.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 12.5h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  },
  {
    href: "/app/food",
    label: "Food",
    description: "Recipes, pantry, shopping, and cooking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7.5 4.75v6.5M10.5 4.75v6.5M9 11.25v8M15.25 4.75c1.8 2.6 1.8 5.9 0 8.5V19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Members, displays, scheduling, and household setup",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.75 5.75 7.5v4.1c0 3.35 2.45 6.44 6.25 7.65 3.8-1.21 6.25-4.3 6.25-7.65V7.5L12 4.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m9.75 12 1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
] as const;

export function AppShellNav({
  onNavigate
}: Readonly<{
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2" aria-label="Primary">
      {SHELL_TABS.map((tab) => {
        const isActive = tab.href === "/app"
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "shell-nav-link",
              isActive ? "shell-nav-link-active" : null
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
          >
            <span className="shell-nav-link-leading">
              <span className="shell-nav-icon">{tab.icon}</span>
              <span className="shell-nav-copy">
                <span className="shell-nav-label">{tab.label}</span>
                <span className="shell-nav-description">{tab.description}</span>
              </span>
            </span>
            <span className={isActive ? "shell-nav-link-mark-active" : "shell-nav-link-mark"} aria-hidden="true">
              /
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
