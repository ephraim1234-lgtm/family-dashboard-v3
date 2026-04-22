import Link from "next/link";
import { Card, PageContainer, PageHeader, SectionHeader } from "@/components/ui";

const surfaces = [
  {
    href: "/app",
    title: "Command Center",
    body: "The member-facing home for daily triage, household context, chores, notes, and agenda."
  },
  {
    href: "/admin",
    title: "Admin",
    body: "Owner/admin workflows for member management, display setup, and household configuration."
  },
  {
    href: "/display",
    title: "Display",
    body: "The ambient household board for passive visibility, driven by explicit projection endpoints and tokenized device access."
  }
];

export default function HomePage() {
  return (
    <PageContainer as="main" className="page">
      <PageHeader
        className="hero"
        copyClassName="max-w-3xl"
        description="This repo starts narrow on household context, scheduling, recurrence-ready foundations, display access, and administration."
        descriptionClassName="lede"
        eyebrow="Bootstrap Foundation"
        surface="plain"
        title="Household operations, built in deliberate stages."
        titleAs="h1"
      />

      <section className="grid">
        {surfaces.map((surface) => (
          <Card as="article" className="h-full" key={surface.href}>
            <Link className="flex h-full flex-col gap-3" href={surface.href}>
              <SectionHeader title={surface.title} />
              <p className="muted">{surface.body}</p>
            </Link>
          </Card>
        ))}
      </section>
    </PageContainer>
  );
}
