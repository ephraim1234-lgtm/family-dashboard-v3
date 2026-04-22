import { redirect } from "next/navigation";
import { OnboardingHouseholdForm } from "@/components/auth/onboarding-household-form";
import { PageContainer } from "@/components/ui";
import { getServerSession } from "@/lib/server-session";

export default async function OnboardingPage() {
  const session = await getServerSession();

  if (!session.isAuthenticated) {
    redirect("/login?next=/onboarding");
  }

  if (session.hasActiveHousehold) {
    redirect("/app");
  }

  return (
    <PageContainer className="page">
      <OnboardingHouseholdForm />
    </PageContainer>
  );
}
