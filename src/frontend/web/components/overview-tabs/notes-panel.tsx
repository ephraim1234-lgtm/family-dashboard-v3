"use client";

import {
  ActionButton,
  Card,
  EmptyState,
  ListCard,
  QuickActions,
  SectionHeader
} from "@/components/ui";
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
      <Card className="space-y-5">
        <SectionHeader
          eyebrow="Pinboard"
          title="Pinned notes"
          description="Shared household context stays easy to scan when the most useful notes stay pinned up top."
        />

        {data.pinnedNotes.length === 0 ? (
          <EmptyState message="No pinned notes yet." />
        ) : (
          <div className="grid gap-3">
            {data.pinnedNotes.map((note) => (
              <ListCard
                key={note.id}
                title={note.title}
                description={note.body ?? "No details yet"}
                meta={note.authorDisplayName}
                action={
                  <ActionButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTogglePin(note.id)}
                    disabled={isPending}
                  >
                    Unpin
                  </ActionButton>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-5">
        <SectionHeader
          eyebrow="Quick actions"
          title="Add a note"
          description="Capture something useful for the household without leaving the overview workspace."
        />

        {showNoteForm ? (
          <ListCard title="New note" description="Keep titles short and make the body optional for quick captures.">
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[color:var(--text-strong)]">Note title *</span>
                <input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="Note title"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[color:var(--text-strong)]">Body</span>
                <textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Optional body"
                  rows={3}
                />
              </label>
              <QuickActions label="Save or cancel">
                <ActionButton
                  onClick={handleAddNote}
                  disabled={isPending || !noteTitle.trim()}
                >
                  Add note
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  onClick={() => {
                    setShowNoteForm(false);
                    setNoteTitle("");
                    setNoteBody("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </ActionButton>
              </QuickActions>
            </div>
          </ListCard>
        ) : (
          <QuickActions label="Start with">
            <ActionButton variant="ghost" onClick={() => setShowNoteForm(true)}>
              Add note
            </ActionButton>
          </QuickActions>
        )}
      </Card>
    </div>
  );
}
