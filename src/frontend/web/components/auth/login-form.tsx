"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { SessionState } from "@/lib/server-session";

type LoginFormProps = {
  nextPath: string | null;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (response.status === 401) {
        setError("Invalid email or password.");
        return;
      }

      if (!response.ok) {
        setError(`Login failed with ${response.status}.`);
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

  const signupHref = nextPath
    ? `/signup?next=${encodeURIComponent(nextPath)}`
    : "/signup";

  return (
    <Card className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <div className="eyebrow">Account Access</div>
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="muted">
          Sign in with your household account. Shared development identities are no longer used for normal app access.
        </p>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            required
          />
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="action-row">
          <Button type="submit" disabled={isSubmitting || !email.trim() || !password}>
            {isSubmitting ? "Signing in..." : "Log in"}
          </Button>
          <Link href={signupHref}>Create an account</Link>
        </div>
      </form>
    </Card>
  );
}
