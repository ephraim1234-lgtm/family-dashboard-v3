import { redirect } from "next/navigation";
import { AppProviders } from "../(app)/providers";
import { AppShell } from "@/components/ui";
import { getServerSession } from "@/lib/server-session";

export default async function AdminShellLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    redirect("/login?next=/admin");
  }

  if (!session.hasActiveHousehold) {
    redirect("/onboarding");
  }

  if (session.activeHouseholdRole !== "Owner") {
    redirect("/app");
  }

  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
