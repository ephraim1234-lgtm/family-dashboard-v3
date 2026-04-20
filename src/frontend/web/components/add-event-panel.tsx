"use client";

import { useState, useTransition } from "react";
import {
  applySuggestedEnd,
  buildMemberEventRequest,
  createDefaultMemberEventDraft,
  getMemberEventValidationIssues
} from "./member-event-draft";

export function AddEventPanel() {
  const initialDraft = createDefaultMemberEventDraft();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState("");
  const [isAllDay, setIsAllDay] = useState(initialDraft.isAllDay);
  const [allDayDate, setAllDayDate] = useState(initialDraft.allDayDate);
  const [startsAt, setStartsAt] = useState(initialDraft.startsAtLocal);
  const [endsAt, setEndsAt] = useState(initialDraft.endsAtLocal);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const validationIssues = getMemberEventValidationIssues({
    title,
    isAllDay,
    allDayDate,
    startsAtLocal: startsAt,
    endsAtLocal: endsAt
  });

  function handleSubmit() {
    if (validationIssues.length > 0) return;
    startTransition(() => {
      submit().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to add event.");
      });
    });
  }

  async function submit() {
    const body = buildMemberEventRequest({
      title,
      description,
      isAllDay,
      allDayDate,
      startsAtLocal: startsAt,
      endsAtLocal: endsAt
    });

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

    const nextDraft = createDefaultMemberEventDraft();
    setTitle(nextDraft.title);
    setDescription("");
    setIsAllDay(nextDraft.isAllDay);
    setAllDayDate(nextDraft.allDayDate);
    setStartsAt(nextDraft.startsAtLocal);
    setEndsAt(nextDraft.endsAtLocal);
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
          <div className="mt-2">
            <button
              className="action-button-secondary"
              onClick={() => {
                const nextDraft = createDefaultMemberEventDraft();
                setTitle(nextDraft.title);
                setDescription("");
                setIsAllDay(nextDraft.isAllDay);
                setAllDayDate(nextDraft.allDayDate);
                setStartsAt(nextDraft.startsAtLocal);
                setEndsAt(nextDraft.endsAtLocal);
                setError(null);
                setShowForm(true);
              }}
            >
              + Add event
            </button>
          </div>
        ) : (
          <div className="stack-list mt-3">
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
                    onChange={(e) => {
                      const nextIsAllDay = e.target.checked;
                      setIsAllDay(nextIsAllDay);
                      if (nextIsAllDay) {
                        setEndsAt("");
                      } else if (!endsAt && startsAt) {
                        setEndsAt(applySuggestedEnd(startsAt, 60));
                      }
                    }}
                    className="mr-1.5"
                  />
                  All day
                </label>
              </div>
              {isAllDay ? (
                <div className="form-row">
                  <label className="form-label">Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={allDayDate}
                    onChange={(e) => setAllDayDate(e.target.value)}
                  />
                </div>
              ) : (
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
                  <div className="pill-row scheduling-helper-row">
                    <button
                      className="pill-button"
                      onClick={() => setEndsAt(applySuggestedEnd(startsAt, 30))}
                      disabled={isPending || !startsAt}
                      type="button"
                    >
                      End +30m
                    </button>
                    <button
                      className="pill-button"
                      onClick={() => setEndsAt(applySuggestedEnd(startsAt, 60))}
                      disabled={isPending || !startsAt}
                      type="button"
                    >
                      End +1h
                    </button>
                    <button
                      className="pill-button"
                      onClick={() => setEndsAt(applySuggestedEnd(startsAt, 120))}
                      disabled={isPending || !startsAt}
                      type="button"
                    >
                      End +2h
                    </button>
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
              )}
              <p className="muted mt-1">
                {isAllDay
                  ? "All-day events use the selected local date and store it in UTC."
                  : "Times use your current browser locale and are stored in UTC."}
              </p>
              {validationIssues.length > 0 ? (
                <div className="scheduling-validation-list">
                  {validationIssues.map((issue) => (
                    <div className="error-text" key={issue}>{issue}</div>
                  ))}
                </div>
              ) : null}
              <div className="pill-row mt-2">
                <button
                  className="action-button"
                  onClick={handleSubmit}
                  disabled={isPending || validationIssues.length > 0}
                >
                  Save
                </button>
                <button
                  className="action-button-secondary"
                  onClick={() => {
                    const nextDraft = createDefaultMemberEventDraft();
                    setShowForm(false);
                    setError(null);
                    setTitle(nextDraft.title);
                    setDescription("");
                    setIsAllDay(nextDraft.isAllDay);
                    setAllDayDate(nextDraft.allDayDate);
                    setStartsAt(nextDraft.startsAtLocal);
                    setEndsAt(nextDraft.endsAtLocal);
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
