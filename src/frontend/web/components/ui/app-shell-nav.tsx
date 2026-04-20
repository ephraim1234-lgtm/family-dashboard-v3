"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "./theme-switcher";

const SHELL_TABS = [
  { href: "/app", label: "Overview" },
  { href: "/app/food", label: "Food" },
  { href: "/admin", label: "Admin" },
  { href: "/display", label: "Display" }
] as const;

export function AppShellNav() {
  const pathname = usePathname();

  return (
    <nav className="shell-nav" aria-label="Primary">
      {SHELL_TABS.map((tab) => {
        const isActive = tab.href === "/app"
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive ? "shell-nav-link shell-nav-link-active" : "shell-nav-link"}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
      <ThemeSwitcher />
    </nav>
  );
}
