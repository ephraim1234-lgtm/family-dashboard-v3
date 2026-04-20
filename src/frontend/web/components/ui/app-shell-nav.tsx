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
              "flex min-h-[52px] items-center justify-between rounded-[1.4rem] border px-4 py-3 text-sm font-medium transition",
              isActive
                ? "border-primary/25 bg-primary text-primary-content shadow-lg shadow-primary/15"
                : "border-base-300/70 bg-base-100/65 text-base-content/72 hover:border-base-300 hover:bg-base-100 hover:text-base-content"
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
          >
            <span>{tab.label}</span>
            <span className={isActive ? "text-primary-content/80" : "text-base-content/45"}>
              /
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
