import { redirect } from "next/navigation";
import { AppProviders } from "./providers";
import { AppShell } from "@/components/ui";
import { getServerSession } from "@/lib/server-session";

export default async function AppShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    redirect("/login?next=/app");
  }

  if (!session.hasActiveHousehold) {
    redirect("/onboarding");
  }

  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
