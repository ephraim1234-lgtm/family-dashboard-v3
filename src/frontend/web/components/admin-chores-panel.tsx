"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type Member = { membershipId: string; displayName: string };

type ChoreItem = {
  id: string;
  title: string;
  description: string | null;
  assignedMembershipId: string | null;
  assignedMemberName: string | null;
  recurrenceKind: string;
  weeklyDaysMask: number;
  isActive: boolean;
  createdAtUtc: string;
};

type ChoreCompletionItem = {
  id: string;
  choreId: string;
  choreTitle: string;
  completedByDisplayName: string;
  completedAtUtc: string;
  notes: string | null;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayBit(i: number) {
  return 1 << i;
}

export function AdminChoresPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [completions, setCompletions] = useState<ChoreCompletionItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedMembershipId, setAssignedMembershipId] = useState("");
  const [recurrenceKind, setRecurrenceKind] = useState("None");
  const [weeklyDaysMask, setWeeklyDaysMask] = useState(0);
  const [isActive, setIsActive] = useState(true);

  async function refreshChores() {
    const [choresRes, completionsRes] = await Promise.all([
      fetch("/api/chores", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/chores/completions/recent", {
        credentials: "same-origin",
        cache: "no-store"
      })
    ]);

    if (choresRes.ok) {
      const data = await choresRes.json();
      setChores(data.chores ?? []);
    }

    if (completionsRes.ok) {
      const data = await completionsRes.json();
      setCompletions((data.completions ?? []).slice(0, 10));
    }
  }

  async function refreshMembers() {
    const res = await fetch("/api/households/members", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (res.ok) {
      const data = await res.json();
      setMembers(data.items ?? []);
    }
  }

  useEffect(() => {
    if (isSessionLoading || !isOwner) return;

    startTransition(() => {
      Promise.all([refreshChores(), refreshMembers()]).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load chores.");
      });
    });
  }, [isOwner, isSessionLoading]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssignedMembershipId("");
    setRecurrenceKind("None");
    setWeeklyDaysMask(0);
    setIsActive(true);
    setEditingId(null);
    setFormError(null);
  }

  function beginEdit(chore: ChoreItem) {
    setEditingId(chore.id);
    setTitle(chore.title);
    setDescription(chore.description ?? "");
    setAssignedMembershipId(chore.assignedMembershipId ?? "");
    setRecurrenceKind(chore.recurrenceKind);
    setWeeklyDaysMask(chore.weeklyDaysMask);
    setIsActive(chore.isActive);
    setFormError(null);
  }

  function toggleDay(bit: number) {
    setWeeklyDaysMask((prev) => (prev & bit ? prev & ~bit : prev | bit));
  }

  function handleSave() {
    setFormError(null);
    startTransition(() => {
      saveChore().catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : "Unable to save chore.");
      });
    });
  }

  async function saveChore() {
    const payload = {
      title,
      description: description.trim() || null,
      assignedMembershipId: assignedMembershipId || null,
      recurrenceKind,
      weeklyDaysMask,
      ...(editingId ? { isActive } : {})
    };

    const url = editingId ? `/api/chores/${editingId}` : "/api/chores";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Save failed with ${res.status}.`);
    }

    resetForm();
    await refreshChores();
  }

  function handleDelete(choreId: string) {
    startTransition(() => {
      deleteChore(choreId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to delete chore.");
      });
    });
  }

  async function deleteChore(choreId: string) {
    const res = await fetch(`/api/chores/${choreId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Delete failed with ${res.status}.`);
    }

    if (editingId === choreId) resetForm();
    await refreshChores();
  }

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  const isEditing = editingId !== null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Chores</div>
        <h2>Chore list</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {chores.length === 0 ? (
          <p className="muted">No chores yet.</p>
        ) : (
          <div className="stack-list mt-4">
            {chores.map((c) => (
              <div className="stack-card" key={c.id}>
                <div className="stack-card-header">
                  <div>
                    <strong className={c.isActive ? "" : "opacity-[0.55]"}>
                      {c.title}
                    </strong>
                    {c.assignedMemberName ? (
                      <div className="muted">{c.assignedMemberName}</div>
                    ) : null}
                    <div className="muted text-[0.82rem]">
                      {c.recurrenceKind}
                      {c.recurrenceKind === "Weekly" && c.weeklyDaysMask
                        ? " · " +
                          DAY_LABELS.filter(
                            (_, i) => c.weeklyDaysMask & dayBit(i)
                          ).join(", ")
                        : null}
                      {!c.isActive ? " · inactive" : null}
                    </div>
                  </div>
                  <div className="action-row compact-action-row">
                    <button
                      className="action-button action-button-ghost"
                      onClick={() => beginEdit(c)}
                      disabled={isPending}
                    >
                      Edit
                    </button>
                    <button
                      className="action-button action-button-secondary"
                      onClick={() => handleDelete(c.id)}
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

        {completions.length > 0 ? (
          <div className="mt-6">
            <div className="eyebrow">Recent completions</div>
            <div className="stack-list mt-2.5">
              {completions.map((c) => (
                <div className="stack-card" key={c.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{c.choreTitle}</strong>
                      <div className="muted">{c.completedByDisplayName}</div>
                    </div>
                    <div className="muted text-[0.82rem]">
                      {new Date(c.completedAtUtc).toLocaleString()}
                    </div>
                  </div>
                  {c.notes ? (
                    <div className="muted text-[0.88rem]">
                      {c.notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <article className="panel">
        <div className="eyebrow">Chores</div>
        <h2>{isEditing ? "Edit chore" : "Add chore"}</h2>
        <div className="form-stack mt-4">
          <div className="field">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Take out trash"
            />
          </div>
          <div className="field">
            <span>Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <span>Assign to member (optional)</span>
            <select
              value={assignedMembershipId}
              onChange={(e) => setAssignedMembershipId(e.target.value)}
            >
              <option value="">Anyone</option>
              {members.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>Recurrence</span>
            <select
              value={recurrenceKind}
              onChange={(e) => {
                setRecurrenceKind(e.target.value);
                if (e.target.value !== "Weekly") setWeeklyDaysMask(0);
              }}
            >
              <option value="None">None (one-off)</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>
          {recurrenceKind === "Weekly" ? (
            <div className="field">
              <span>Days</span>
              <div className="pill-row">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className={
                      weeklyDaysMask & dayBit(i)
                        ? "pill-button pill-button-active"
                        : "pill-button"
                    }
                    onClick={() => toggleDay(dayBit(i))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {isEditing ? (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Active</span>
            </label>
          ) : null}
        </div>
        {formError ? <p className="error-text">{formError}</p> : null}
        <div className="action-row">
          <button
            className="action-button"
            onClick={handleSave}
            disabled={isPending || !title.trim()}
          >
            {isEditing ? "Save changes" : "Add chore"}
          </button>
          {isEditing ? (
            <button
              className="action-button action-button-ghost"
              onClick={resetForm}
              disabled={isPending}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </article>
    </section>
  );
}
