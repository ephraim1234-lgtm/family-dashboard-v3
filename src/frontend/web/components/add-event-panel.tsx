"use client";

import { useState, useTransition } from "react";

export function AddEventPanel() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(() => {
      submit().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to add event.");
      });
    });
  }

  async function submit() {
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      isAllDay,
      startsAtUtc: startsAt ? new Date(startsAt).toISOString() : null,
      endsAtUtc: endsAt ? new Date(endsAt).toISOString() : null
    };

    const res = await fetch("/api/scheduling/events/member", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with ${res.status}.`);
    }

    setTitle("");
    setDescription("");
    setIsAllDay(false);
    setStartsAt("");
    setEndsAt("");
    setShowForm(false);
    setError(null);
    setSuccessMsg("Event added.");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Calendar</div>
        <h2>Add event</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {successMsg ? <p className="success-text">{successMsg}</p> : null}

        {!showForm ? (
          <div style={{ marginTop: "8px" }}>
            <button
              className="action-button-secondary"
              onClick={() => setShowForm(true)}
            >
              + Add event
            </button>
          </div>
        ) : (
          <div className="stack-list" style={{ marginTop: "12px" }}>
            <div className="stack-card">
              <div className="form-row">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="form-row">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    style={{ marginRight: "6px" }}
                  />
                  All day
                </label>
              </div>
              {!isAllDay ? (
                <>
                  <div className="form-row">
                    <label className="form-label">Starts</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Ends</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
              <div className="pill-row" style={{ marginTop: "8px" }}>
                <button
                  className="action-button"
                  onClick={handleSubmit}
                  disabled={isPending || !title.trim()}
                >
                  Save
                </button>
                <button
                  className="action-button-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
