import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { PageContainer } from "@/components/ui";
import { getServerSession, normalizeNextPath } from "@/lib/server-session";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await getServerSession();
  const nextPath = normalizeNextPath((await searchParams).next);

  if (session.isAuthenticated) {
    redirect(nextPath ?? (session.hasActiveHousehold ? "/app" : "/onboarding"));
  }

  return (
    <PageContainer className="page">
      <SignupForm nextPath={nextPath} />
    </PageContainer>
  );
}
