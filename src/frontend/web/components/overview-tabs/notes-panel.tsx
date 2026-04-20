"use client";

import { EmptyState } from "@/components/ui";
import { useOverviewContext } from "./overview-context";

export function NotesPanel() {
  const {
    data,
    isPending,
    showNoteForm,
    setShowNoteForm,
    noteTitle,
    setNoteTitle,
    noteBody,
    setNoteBody,
    handleAddNote,
    handleTogglePin
  } = useOverviewContext();

  if (!data) {
    return null;
  }

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Pinboard</div>
          <h2>Pinned notes</h2>

          {data.pinnedNotes.length === 0 ? (
            <EmptyState className="mt-12" message="No pinned notes yet." />
          ) : (
            <div className="stack-list mt-12">
              {data.pinnedNotes.map((note) => (
                <div className="stack-card" key={note.id}>
                  <div className="stack-card-header">
                    <div className="flex-1">
                      <strong>{note.title}</strong>
                      {note.body ? <div className="muted">{note.body}</div> : null}
                      <div className="muted text-sm">{note.authorDisplayName}</div>
                    </div>
                    <button
                      className="action-button-secondary text-xs"
                      onClick={() => handleTogglePin(note.id)}
                      disabled={isPending}
                    >
                      Unpin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <div className="section-spacer" />
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Quick actions</div>
          <h2>Add a note</h2>

          {showNoteForm ? (
            <div className="stack-list mt-12">
              <div className="stack-card">
                <div className="form-row">
                  <label className="form-label">Note title *</label>
                  <input
                    className="form-input"
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="Note title"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Body</label>
                  <textarea
                    className="form-input"
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Optional body"
                    rows={3}
                  />
                </div>
                <div className="pill-row mt-8">
                  <button
                    className="action-button"
                    onClick={handleAddNote}
                    disabled={isPending || !noteTitle.trim()}
                  >
                    Add note
                  </button>
                  <button
                    className="action-button-secondary"
                    onClick={() => {
                      setShowNoteForm(false);
                      setNoteTitle("");
                      setNoteBody("");
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="action-row">
              <button className="action-button-secondary" onClick={() => setShowNoteForm(true)}>
                + Note
              </button>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
