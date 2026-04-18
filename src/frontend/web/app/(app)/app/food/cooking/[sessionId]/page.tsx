import { CookingSessionPanel } from "../../../../../../components/cooking-session-panel";

type CookingPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function CookingPage({ params }: CookingPageProps) {
  const { sessionId } = await params;

  return <CookingSessionPanel sessionId={sessionId} />;
}
