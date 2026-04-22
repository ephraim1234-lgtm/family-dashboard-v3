"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { SessionState } from "@/lib/server-session";

type SignupFormProps = {
  nextPath: string | null;
};

export function SignupForm({ nextPath }: SignupFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ displayName, email, password })
      });

      if (!response.ok) {
        const message = await response.text();
        setError(message || `Signup failed with ${response.status}.`);
        return;
      }

      const session = (await response.json()) as SessionState;
      router.replace(
        nextPath ?? (session.hasActiveHousehold ? "/app" : "/onboarding")
      );
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";

  return (
    <Card className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <div className="eyebrow">Account Access</div>
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="muted">
          This starts a real persisted session. You will create or join a household in the next step.
        </p>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="field">
          <span>Display name</span>
          <input
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Name shown in the app"
            required
          />
        </div>

        <div className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="action-row">
          <Button
            type="submit"
            disabled={isSubmitting || !displayName.trim() || !email.trim() || password.length < 8}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <Link href={loginHref}>Already have an account?</Link>
        </div>
      </form>
    </Card>
  );
}
