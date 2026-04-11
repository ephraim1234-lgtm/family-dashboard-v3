import { DisplayAccessPanel } from "../../../../components/display-access-panel";

type DisplayPageProps = {
  params: Promise<{ token: string }>;
};

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { token } = await params;

  return (
    <main className="page">
      <section className="hero">
        <div className="eyebrow">Display Surface</div>
        <h1>Ambient household view</h1>
        <p className="lede" style={{ color: "rgba(247, 239, 224, 0.72)" }}>
          Tokenized display routes are intentionally separate from normal user
          sessions. This shell is reserved for display-safe projections.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Display token</h2>
          <p>{token}</p>
        </article>

        <article className="panel">
          <h2>Projection contract</h2>
          <p>
            Frontend display routes should call explicit display projection
            endpoints, not raw scheduling queries.
          </p>
        </article>
      </section>

      <DisplayAccessPanel token={token} />
    </main>
  );
}
