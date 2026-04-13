"use client";

import { useEffect, useState, useTransition } from "react";

type NoteItem = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
  isPinned: boolean;
  createdAtUtc: string;
};

export function NotesPanel() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [bodyInput, setBodyInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  async function load() {
    const res = await fetch("/api/notes", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setLoaded(true);
        return;
      }
      throw new Error(`Failed to load notes: ${res.status}`);
    }

    const data = await res.json();
    setNotes(data.notes ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load notes.");
        setLoaded(true);
      });
    });
  }, []);

  function handleAdd() {
    if (!titleInput.trim()) return;
    startTransition(() => {
      addNote().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to add note.");
      });
    });
  }

  async function addNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleInput.trim(), body: bodyInput.trim() || null })
    });

    if (!res.ok) {
      throw new Error(`Add note failed with ${res.status}.`);
    }

    setTitleInput("");
    setBodyInput("");
    setShowForm(false);
    await load();
  }

  function startEdit(note: NoteItem) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  }

  function handleSaveEdit(noteId: string) {
    if (!editTitle.trim()) return;
    startTransition(() => {
      saveEdit(noteId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to update note.");
      });
    });
  }

  async function saveEdit(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() || null })
    });

    if (!res.ok) {
      if (res.status === 403) throw new Error("You can only edit your own notes.");
      throw new Error(`Update note failed with ${res.status}.`);
    }

    cancelEdit();
    await load();
  }

  if (!loaded) return null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Pinboard</div>
        <h2>Notes</h2>
        {error ? <p className="error-text">{error}</p> : null}

        {notes.length === 0 && !showForm ? (
          <p className="muted">No notes yet.</p>
        ) : null}

        {notes.length > 0 ? (
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {notes.map((n) =>
              editingId === n.id ? (
                <div className="stack-card" key={n.id}>
                  <div className="form-row">
                    <label className="form-label">Title</label>
                    <input
                      className="form-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Body</label>
                    <textarea
                      className="form-input"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="pill-row" style={{ marginTop: "8px" }}>
                    <button
                      className="action-button"
                      onClick={() => handleSaveEdit(n.id)}
                      disabled={isPending || !editTitle.trim()}
                    >
                      Save
                    </button>
                    <button
                      className="action-button-secondary"
                      onClick={cancelEdit}
                      disabled={isPending}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="stack-card" key={n.id}>
                  <div className="stack-card-header">
                    <div style={{ flex: 1 }}>
                      <strong>
                        {n.isPinned ? "📌 " : ""}
                        {n.title}
                      </strong>
                      {n.body ? <div className="muted">{n.body}</div> : null}
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {n.authorDisplayName}
                      </div>
                    </div>
                    <button
                      className="action-button-secondary"
                      style={{ alignSelf: "flex-start", fontSize: "0.8rem" }}
                      onClick={() => startEdit(n)}
                      disabled={isPending}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : null}

        {showForm ? (
          <div className="stack-list" style={{ marginTop: "12px" }}>
            <div className="stack-card">
              <div className="form-row">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Note title"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Body</label>
                <textarea
                  className="form-input"
                  value={bodyInput}
                  onChange={(e) => setBodyInput(e.target.value)}
                  placeholder="Optional body"
                  rows={3}
                />
              </div>
              <div className="pill-row" style={{ marginTop: "8px" }}>
                <button
                  className="action-button"
                  onClick={handleAdd}
                  disabled={isPending || !titleInput.trim()}
                >
                  Add
                </button>
                <button
                  className="action-button-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setTitleInput("");
                    setBodyInput("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "12px" }}>
            <button
              className="action-button-secondary"
              onClick={() => setShowForm(true)}
            >
              + Add note
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
