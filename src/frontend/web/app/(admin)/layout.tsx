import { AppProviders } from "../(app)/providers";
import { AppShell } from "@/components/ui";

export default function AdminShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
