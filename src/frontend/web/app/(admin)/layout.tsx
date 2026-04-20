import { AppProviders } from "../(app)/providers";
import { SharedShell } from "@/components/ui";

export default function AdminShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProviders>
      <SharedShell>{children}</SharedShell>
    </AppProviders>
  );
}
