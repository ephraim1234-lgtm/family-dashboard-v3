"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export function OnboardingHouseholdForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timeZoneId, setTimeZoneId] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone) {
      setTimeZoneId(browserTimeZone);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/households/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          timeZoneId
        })
      });

      if (!response.ok) {
        const message = await response.text();
        setError(message || `Household creation failed with ${response.status}.`);
        return;
      }

      router.replace("/app");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <div className="eyebrow">Onboarding</div>
        <h1 className="text-3xl font-semibold tracking-tight">Create your household</h1>
        <p className="muted">
          Your account exists now. Create the household that the rest of the app should scope to.
        </p>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="field">
          <span>Household name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="The Rivera household"
            required
          />
        </div>

        <div className="field">
          <span>Time zone</span>
          <input
            type="text"
            value={timeZoneId}
            onChange={(event) => setTimeZoneId(event.target.value)}
            placeholder="America/Chicago"
            required
          />
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="action-row">
          <Button type="submit" disabled={isSubmitting || !name.trim() || !timeZoneId.trim()}>
            {isSubmitting ? "Creating household..." : "Create household"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
