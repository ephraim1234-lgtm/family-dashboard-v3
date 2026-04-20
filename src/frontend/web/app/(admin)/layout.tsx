import { AppProviders } from "../(app)/providers";
import { AppShellNav } from "@/components/ui";

export default function AdminShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <div className="shell">
        <header className="shell-header">
          <div className="shell-header-inner">
            <span className="shell-wordmark">HouseholdOps</span>
            <AppShellNav />
          </div>
        </header>
        <main className="page shell-main">{children}</main>
      </div>
    </AppProviders>
  );
}
