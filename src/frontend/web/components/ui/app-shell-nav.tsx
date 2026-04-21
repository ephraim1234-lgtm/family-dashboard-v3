"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SHELL_TABS = [
  { href: "/app", label: "Overview" },
  { href: "/app/food", label: "Food" },
  { href: "/admin", label: "Admin" }
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
            <span>{tab.label}</span>
            <span className={isActive ? "shell-nav-link-mark-active" : "shell-nav-link-mark"}>
              /
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
