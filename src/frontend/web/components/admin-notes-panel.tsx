"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type NoteItem = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
  isPinned: boolean;
  createdAtUtc: string;
};

export function AdminNotesPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    const res = await fetch("/api/notes", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return;
      throw new Error(`Failed to load notes: ${res.status}`);
    }

    const data = await res.json();
    setNotes(data.notes ?? []);
  }

  useEffect(() => {
    if (!isOwner) return;
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load notes.");
      });
    });
  }, [isOwner]);

  function handlePin(noteId: string) {
    startTransition(() => {
      togglePin(noteId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to toggle pin.");
      });
    });
  }

  async function togglePin(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}/pin`, {
      method: "PATCH",
      credentials: "same-origin"
    });

    if (!res.ok) {
      throw new Error(`Pin toggle failed with ${res.status}.`);
    }

    await load();
  }

  function handleDelete(noteId: string) {
    startTransition(() => {
      deleteNote(noteId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to delete note.");
      });
    });
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!res.ok) {
      throw new Error(`Delete failed with ${res.status}.`);
    }

    await load();
  }

  if (isSessionLoading || !isOwner) return null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Admin</div>
        <h2>Notes</h2>
        {error ? <p className="error-text">{error}</p> : null}

        {notes.length === 0 ? (
          <p className="muted">No notes.</p>
        ) : (
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {notes.map((n) => (
              <div className="stack-card" key={n.id}>
                <div className="stack-card-header">
                  <div>
                    <strong>{n.title}</strong>
                    {n.body ? <div className="muted">{n.body}</div> : null}
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      by {n.authorDisplayName}
                      {n.isPinned ? " · Pinned" : ""}
                    </div>
                  </div>
                  <div className="pill-row">
                    <button
                      className="action-button-secondary"
                      onClick={() => handlePin(n.id)}
                      disabled={isPending}
                    >
                      {n.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      className="action-button-danger"
                      onClick={() => handleDelete(n.id)}
                      disabled={isPending}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
