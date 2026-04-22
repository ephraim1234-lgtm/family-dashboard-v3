"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { HouseholdInvitePreview, SessionState } from "@/lib/server-session";

type InviteAcceptPanelProps = {
  token: string;
  preview: HouseholdInvitePreview;
  session: SessionState;
};

export function InviteAcceptPanel({
  token,
  preview,
  session
}: InviteAcceptPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function acceptInvite() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/household-invites/accept", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const message = await response.text();
        setError(message || `Invite acceptance failed with ${response.status}.`);
        return;
      }

      router.replace("/app");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextPath = `/invite?token=${encodeURIComponent(token)}`;

  return (
    <Card className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <div className="eyebrow">Household Invite</div>
        <h1 className="text-3xl font-semibold tracking-tight">Join {preview.householdName}</h1>
        <p className="muted">
          This invite is for <strong>{preview.email}</strong> as a {preview.role.toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="stack-card">
          <strong>Role</strong>
          <div className="muted">{preview.role}</div>
        </div>
        <div className="stack-card">
          <strong>Expires</strong>
          <div className="muted">{new Date(preview.expiresAtUtc).toLocaleString()}</div>
        </div>
      </div>

      {preview.isExpired ? (
        <p className="error-text">This invite has expired.</p>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {!session.isAuthenticated ? (
        <div className="action-row">
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Log in to accept</Link>
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>Create account to accept</Link>
        </div>
      ) : session.hasActiveHousehold ? (
        <p className="muted">
          This signed-in account already belongs to a household. Multi-household switching is intentionally deferred in this phase.
        </p>
      ) : (
        <div className="action-row">
          <Button
            onClick={() => {
              void acceptInvite();
            }}
            disabled={isSubmitting || preview.isExpired}
          >
            {isSubmitting ? "Joining household..." : "Accept invite"}
          </Button>
        </div>
      )}
    </Card>
  );
}
