import { AppProviders } from "./providers";
import { SharedShell } from "@/components/ui";

export default function AppShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <SharedShell>{children}</SharedShell>
    </AppProviders>
  );
}
