"use client";

import { useEffect, useState, useTransition } from "react";

type CadenceKind = "Daily" | "Weekly" | "Monthly";

type HouseholdMember = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
};

type ChoreSummary = {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  assignedToMemberId: string | null;
  assignedToDisplayName: string | null;
  cadenceKind: CadenceKind;
  weeklyDaysMask: number;
  dayOfMonth: number | null;
  isActive: boolean;
  createdAtUtc: string;
};

type ChoreListResponse = {
  items: ChoreSummary[];
};

type ChoreInstanceSummary = {
  id: string;
  choreId: string;
  choreTitle: string;
  assignedToMemberId: string | null;
  assignedToDisplayName: string | null;
  dueDate: string;
  status: string;
  completedAtUtc: string | null;
  completedByDisplayName: string | null;
  createdAtUtc: string;
};

type ChoreInstanceListResponse = {
  items: ChoreInstanceSummary[];
};

type SessionState = {
  isAuthenticated: boolean;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
};

const WEEKDAYS = [
  { label: "Sun", bit: 1 << 0 },
  { label: "Mon", bit: 1 << 1 },
  { label: "Tue", bit: 1 << 2 },
  { label: "Wed", bit: 1 << 3 },
  { label: "Thu", bit: 1 << 4 },
  { label: "Fri", bit: 1 << 5 },
  { label: "Sat", bit: 1 << 6 }
];

function cadenceSummary(chore: ChoreSummary): string {
  if (chore.cadenceKind === "Daily") return "Daily";
  if (chore.cadenceKind === "Weekly") {
    const days = WEEKDAYS.filter(d => (chore.weeklyDaysMask & d.bit) !== 0)
      .map(d => d.label)
      .join(", ");
    return `Weekly — ${days || "no days"}`;
  }
  if (chore.cadenceKind === "Monthly") {
    return `Monthly — day ${chore.dayOfMonth ?? "?"}`;
  }
  return chore.cadenceKind;
}

function instanceStatusPill(status: string) {
  const classes: Record<string, string> = {
    Pending: "pill pill-pending",
    Completed: "pill pill-done",
    Skipped: "pill pill-skipped"
  };
  return <span className={classes[status] ?? "pill"}>{status}</span>;
}

function createDefaultForm() {
  return {
    title: "",
    description: "",
    assignedToMemberId: "" as string,
    cadenceKind: "Daily" as CadenceKind,
    weeklyDaysMask: 1 << 1,
    dayOfMonth: 1,
    isActive: true
  };
}

export function AdminChoresPanel() {
  const [session, setSession] = useState<SessionState>({
    isAuthenticated: false,
    activeHouseholdId: null,
    activeHouseholdRole: null
  });
  const [isOwner, setIsOwner] = useState(false);

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [chores, setChores] = useState<ChoreSummary[]>([]);
  const [instances, setInstances] = useState<ChoreInstanceSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultForm());
  const [error, setError] = useState<string | null>(null);
  const [instanceError, setInstanceError] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isInstancePending, startInstanceTransition] = useTransition();

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const sessionData = (await sessionRes.json()) as SessionState;
      setSession(sessionData);

      const ownerSession =
        sessionData.isAuthenticated &&
        sessionData.activeHouseholdId != null &&
        sessionData.activeHouseholdRole === "Owner";

      setIsOwner(ownerSession);

      if (ownerSession) {
        await Promise.all([refreshMembers(), refreshChores(), refreshInstances()]);
      }
    }

    init().catch(() => {});
  }, []);

  async function refreshMembers() {
    const res = await fetch("/api/households/members", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (res.ok) {
      const data = (await res.json()) as { items: HouseholdMember[] };
      setMembers(data.items);
    }
  }

  async function refreshChores() {
    const res = await fetch("/api/chores/", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (res.ok) {
      const data = (await res.json()) as ChoreListResponse;
      setChores(data.items);
    }
  }

  async function refreshInstances() {
    const res = await fetch("/api/chores/instances?windowDays=14", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (res.ok) {
      const data = (await res.json()) as ChoreInstanceListResponse;
      setInstances(data.items);
    }
  }

  function selectForEditing(chore: ChoreSummary) {
    setEditingId(chore.id);
    setForm({
      title: chore.title,
      description: chore.description ?? "",
      assignedToMemberId: chore.assignedToMemberId ?? "",
      cadenceKind: chore.cadenceKind,
      weeklyDaysMask: chore.weeklyDaysMask,
      dayOfMonth: chore.dayOfMonth ?? 1,
      isActive: chore.isActive
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(createDefaultForm());
    setError(null);
  }

  function toggleWeekday(bit: number) {
    setForm(f => ({ ...f, weeklyDaysMask: f.weeklyDaysMask ^ bit }));
  }

  async function handleSubmit() {
    setError(null);

    const selectedMember = members.find(m => m.userId === form.assignedToMemberId);
    const payload = {
      title: form.title,
      description: form.description || null,
      assignedToMemberId: selectedMember?.userId ?? null,
      assignedToDisplayName: selectedMember?.displayName ?? null,
      cadenceKind: form.cadenceKind,
      weeklyDaysMask: form.cadenceKind === "Weekly" ? form.weeklyDaysMask : 0,
      dayOfMonth: form.cadenceKind === "Monthly" ? form.dayOfMonth : null,
      isActive: form.isActive
    };

    const url = editingId ? `/api/chores/${editingId}` : "/api/chores/";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setError(await res.text());
      return;
    }

    resetForm();
    await refreshChores();
  }

  async function handleDelete(choreId: string) {
    const res = await fetch(`/api/chores/${choreId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    if (res.ok) {
      await Promise.all([refreshChores(), refreshInstances()]);
    }
  }

  async function handleComplete(instanceId: string) {
    setInstanceError(null);
    const res = await fetch(`/api/chores/instances/${instanceId}/complete`, {
      method: "POST",
      credentials: "same-origin"
    });
    if (!res.ok) {
      setInstanceError("Failed to mark chore complete.");
      return;
    }
    await refreshInstances();
  }

  async function handleGenerate() {
    setGenerateMessage(null);
    const res = await fetch("/api/chores/instances/generate", {
      method: "POST",
      credentials: "same-origin"
    });
    if (res.ok) {
      const data = (await res.json()) as { generated: number };
      setGenerateMessage(
        data.generated > 0
          ? `Generated ${data.generated} new instance(s).`
          : "All instances already up to date."
      );
      await refreshInstances();
    }
  }

  if (!isOwner) {
    return (
      <section>
        <div className="eyebrow">Chores</div>
        <p className="muted">Owner session required to manage chores.</p>
      </section>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section>
      <div className="eyebrow">Chores</div>

      <section className="grid">
        {/* Create / Edit form */}
        <article className="panel">
          <h2>{editingId ? "Edit Chore" : "Create Chore"}</h2>
          <p className="muted">
            Define a recurring household chore and assign it to a member.
          </p>

          <div className="form-stack">
            <label className="field">
              <span>Title</span>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Take out trash"
              />
            </label>

            <label className="field">
              <span>Description</span>
              <input
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional details"
              />
            </label>

            <label className="field">
              <span>Assigned to</span>
              <select
                value={form.assignedToMemberId}
                onChange={e =>
                  setForm(f => ({ ...f, assignedToMemberId: e.target.value }))
                }
              >
                <option value="">Anyone</option>
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Cadence</span>
              <select
                value={form.cadenceKind}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    cadenceKind: e.target.value as CadenceKind
                  }))
                }
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </label>

            {form.cadenceKind === "Weekly" && (
              <div className="field">
                <span>Days of week</span>
                <div className="weekday-row">
                  {WEEKDAYS.map(({ label, bit }) => (
                    <button
                      key={label}
                      type="button"
                      className={
                        (form.weeklyDaysMask & bit) !== 0
                          ? "day-chip day-chip-active"
                          : "day-chip"
                      }
                      onClick={() => toggleWeekday(bit)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.cadenceKind === "Monthly" && (
              <label className="field">
                <span>Day of month (1–28)</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dayOfMonth}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      dayOfMonth: parseInt(e.target.value, 10) || 1
                    }))
                  }
                />
              </label>
            )}

            {editingId && (
              <label className="field field-inline">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e =>
                    setForm(f => ({ ...f, isActive: e.target.checked }))
                  }
                />
                <span>Active</span>
              </label>
            )}
          </div>

          <div className="action-row" style={{ marginTop: "16px" }}>
            <button
              className="action-button"
              onClick={() => startTransition(handleSubmit)}
              disabled={isPending}
            >
              {editingId ? "Save Changes" : "Create Chore"}
            </button>
            {editingId && (
              <button
                className="action-button action-button-ghost"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
        </article>

        {/* Chore list */}
        <article className="panel">
          <h2>Managed chores</h2>
          {chores.length === 0 ? (
            <p className="muted">No chores created yet.</p>
          ) : (
            <div className="stack-list">
              {chores.map(chore => (
                <div className="stack-card" key={chore.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{chore.title}</strong>
                      {!chore.isActive && (
                        <span className="pill pill-inactive" style={{ marginLeft: "8px" }}>
                          Inactive
                        </span>
                      )}
                      <div className="muted" style={{ fontSize: "0.85rem", marginTop: "2px" }}>
                        {cadenceSummary(chore)}
                        {chore.assignedToDisplayName
                          ? ` · ${chore.assignedToDisplayName}`
                          : ""}
                      </div>
                    </div>
                    <div className="action-row compact-action-row">
                      <button
                        className="action-button action-button-ghost"
                        onClick={() => selectForEditing(chore)}
                      >
                        Edit
                      </button>
                      <button
                        className="action-button action-button-ghost"
                        onClick={() =>
                          startTransition(() => handleDelete(chore.id))
                        }
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {chore.description && (
                    <p className="muted" style={{ marginTop: "6px", fontSize: "0.85rem" }}>
                      {chore.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* Upcoming instances */}
      <article className="panel" style={{ marginTop: "18px" }}>
        <div className="stack-card-header">
          <h2 style={{ margin: 0 }}>Upcoming instances — next 14 days</h2>
          <div className="action-row compact-action-row">
            <button
              className="action-button action-button-ghost"
              onClick={() => startInstanceTransition(handleGenerate)}
              disabled={isInstancePending}
            >
              Generate instances
            </button>
          </div>
        </div>

        {generateMessage && (
          <p className="muted" style={{ marginTop: "6px" }}>
            {generateMessage}
          </p>
        )}
        {instanceError && <p className="error-text">{instanceError}</p>}

        {instances.length === 0 ? (
          <p className="muted" style={{ marginTop: "12px" }}>
            No instances in the next 14 days. Click &ldquo;Generate
            instances&rdquo; after creating chores.
          </p>
        ) : (
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {instances.map(inst => {
              const isToday = inst.dueDate === today;
              const isPast = inst.dueDate < today;
              return (
                <div
                  className={`stack-card${isToday ? " stack-card-today" : ""}${isPast && inst.status === "Pending" ? " stack-card-overdue" : ""}`}
                  key={inst.id}
                >
                  <div className="stack-card-header">
                    <div>
                      <strong>{inst.choreTitle}</strong>
                      <div
                        className="muted"
                        style={{ fontSize: "0.85rem", marginTop: "2px" }}
                      >
                        Due{" "}
                        {new Date(inst.dueDate + "T00:00:00").toLocaleDateString(
                          undefined,
                          { weekday: "short", month: "short", day: "numeric" }
                        )}
                        {inst.assignedToDisplayName
                          ? ` · ${inst.assignedToDisplayName}`
                          : ""}
                      </div>
                    </div>
                    <div className="action-row compact-action-row">
                      {instanceStatusPill(inst.status)}
                      {inst.status === "Pending" && (
                        <button
                          className="action-button action-button-ghost"
                          onClick={() =>
                            startInstanceTransition(() =>
                              handleComplete(inst.id)
                            )
                          }
                          disabled={isInstancePending}
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                  {inst.completedByDisplayName && (
                    <p
                      className="muted"
                      style={{ marginTop: "4px", fontSize: "0.8rem" }}
                    >
                      Completed by {inst.completedByDisplayName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
