"use client";

import { useEffect, useState, useTransition } from "react";

type ChoreItem = {
  id: string;
  title: string;
  description: string | null;
  assignedMemberName: string | null;
  recurrenceKind: string;
};

export function MyChoresPanel() {
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/chores/my", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setLoaded(true);
        return;
      }
      throw new Error(`Failed to load chores: ${res.status}`);
    }

    const data = await res.json();
    setChores(data.chores ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load chores.");
        setLoaded(true);
      });
    });
  }, []);

  function handleDone(choreId: string) {
    startTransition(() => {
      completeChore(choreId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to complete chore.");
      });
    });
  }

  async function completeChore(choreId: string) {
    const res = await fetch(`/api/chores/${choreId}/complete`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: null })
    });

    if (!res.ok) {
      throw new Error(`Complete failed with ${res.status}.`);
    }

    setDoneIds((prev) => new Set([...prev, choreId]));
  }

  if (!loaded || chores.length === 0) {
    return null;
  }

  const visible = chores.filter((c) => !doneIds.has(c.id));

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Today</div>
        <h2>My chores</h2>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="stack-list" style={{ marginTop: "16px" }}>
          {visible.map((c) => (
            <div className="stack-card" key={c.id}>
              <div className="stack-card-header">
                <div>
                  <strong>{c.title}</strong>
                  {c.description ? (
                    <div className="muted">{c.description}</div>
                  ) : null}
                  {c.assignedMemberName ? (
                    <div className="muted" style={{ fontSize: "0.82rem" }}>
                      Assigned to {c.assignedMemberName}
                    </div>
                  ) : null}
                </div>
                <button
                  className="action-button"
                  onClick={() => handleDone(c.id)}
                  disabled={isPending}
                >
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
