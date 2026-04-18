import { TvCookingDisplay } from "../../../../../../../components/tv-cooking-display";

type TvPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function TvCookingPage({ params }: TvPageProps) {
  const { sessionId } = await params;

  return <TvCookingDisplay sessionId={sessionId} />;
}
