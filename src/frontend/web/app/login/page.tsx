import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { PageContainer } from "@/components/ui";
import { getServerSession, normalizeNextPath } from "@/lib/server-session";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession();
  const nextPath = normalizeNextPath((await searchParams).next);

  if (session.isAuthenticated) {
    redirect(nextPath ?? (session.hasActiveHousehold ? "/app" : "/onboarding"));
  }

  return (
    <PageContainer className="page">
      <LoginForm nextPath={nextPath} />
    </PageContainer>
  );
}
