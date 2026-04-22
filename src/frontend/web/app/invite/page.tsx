import { InviteAcceptPanel } from "@/components/auth/invite-accept-panel";
import { Card, PageContainer } from "@/components/ui";
import { getHouseholdInvitePreview, getServerSession } from "@/lib/server-session";

type InvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;
  const inviteToken = typeof params.token === "string" ? params.token : "";
  const session = await getServerSession();

  if (!inviteToken) {
    return (
      <PageContainer className="page">
        <Card>Invite token is missing.</Card>
      </PageContainer>
    );
  }

  const preview = await getHouseholdInvitePreview(inviteToken);

  return (
    <PageContainer className="page">
      {preview ? (
        <InviteAcceptPanel token={inviteToken} preview={preview} session={session} />
      ) : (
        <Card>That invite is invalid or has already been used.</Card>
      )}
    </PageContainer>
  );
}
