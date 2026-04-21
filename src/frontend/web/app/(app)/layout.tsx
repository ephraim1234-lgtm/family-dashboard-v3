import { AppProviders } from "./providers";
import { AppShell } from "@/components/ui";

export default function AppShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
