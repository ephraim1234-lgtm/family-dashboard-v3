import Link from "next/link";

export default function DisplayIndexPage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="eyebrow">Display Surface</div>
        <h1>Token-required display access</h1>
        <p className="lede" style={{ color: "rgba(247, 239, 224, 0.72)" }}>
          Display routes stay separate from normal user sessions. Provision a
          display device from the admin surface to obtain a usable display path.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Provision first</h2>
          <p>
            Owners can create a display device from the admin shell. That flow
            returns a tokenized display path such as <code>/display/&lt;token&gt;</code>.
          </p>
        </article>

        <article className="panel">
          <h2>Admin surface</h2>
          <p>
            Display provisioning lives in the normal admin workflow, while
            display viewing stays token-only.
          </p>
          <p>
            <Link href="/admin">Go to admin</Link>
          </p>
        </article>
      </section>
    </main>
  );
}
