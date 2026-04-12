import { DisplaySurfacePanel } from "../../../../components/display-surface-panel";

type DisplayPageProps = {
  params: Promise<{ token: string }>;
};

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { token } = await params;

  return (
    <main className="display-page">
      <DisplaySurfacePanel token={token} />
    </main>
  );
}
