import Link from "next/link";

const surfaces = [
  {
    href: "/app",
    title: "Household App",
    body: "Primary member-facing web surface for household context, schedule views, and day-to-day planning."
  },
  {
    href: "/admin",
    title: "Admin",
    body: "Owner/admin workflows for member management, display setup, and household configuration."
  },
  {
    href: "/display",
    title: "Display",
    body: "Kiosk-oriented ambient visibility surface backed by explicit display projection endpoints and tokenized device access."
  }
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="eyebrow">Bootstrap Foundation</div>
        <h1>Household operations, built in deliberate stages.</h1>
        <p className="lede">
          This repo starts narrow on household context, scheduling,
          recurrence-ready foundations, display access, and administration.
        </p>
      </section>

      <section className="grid">
        {surfaces.map((surface) => (
          <Link key={surface.href} href={surface.href} className="panel">
            <h2>{surface.title}</h2>
            <p className="muted">{surface.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
