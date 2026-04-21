"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type HouseholdContextResponse = {
  householdId: string;
  householdName: string;
  timeZoneId: string;
  activeRole: string;
  membershipStatus: string;
};

// Common household-friendly IANA time zones. Not exhaustive — users can also
// type a custom id if they prefer.
const COMMON_TIME_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Africa/Johannesburg",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland"
];

export function AdminHouseholdSettingsPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [householdName, setHouseholdName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [timeZoneId, setTimeZoneId] = useState("UTC");
  const [draftTimeZoneId, setDraftTimeZoneId] = useState("UTC");
  const [tzMessage, setTzMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isSessionLoading || !isOwner) return;

    startTransition(() => {
      loadCurrent().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load household.");
      });
    });
  }, [isOwner, isSessionLoading]);

  async function loadCurrent() {
    const response = await fetch("/api/households/current", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return;
      throw new Error(`Household lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as HouseholdContextResponse;
    setHouseholdName(data.householdName);
    setDraftName(data.householdName);
    setTimeZoneId(data.timeZoneId);
    setDraftTimeZoneId(data.timeZoneId);
  }

  function handleSaveTimeZone() {
    setError(null);
    setTzMessage(null);
    startTransition(() => {
      saveTimeZone().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to update time zone.");
      });
    });
  }

  async function saveTimeZone() {
    const response = await fetch("/api/households/current/time-zone", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZoneId: draftTimeZoneId })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Time zone update failed with ${response.status}.`);
    }

    const data = (await response.json()) as HouseholdContextResponse;
    setTimeZoneId(data.timeZoneId);
    setDraftTimeZoneId(data.timeZoneId);
    setTzMessage("Time zone saved. Home agenda will reflect the new local day.");
  }

  function handleRename() {
    setError(null);
    startTransition(() => {
      rename().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to rename household.");
      });
    });
  }

  async function rename() {
    const response = await fetch("/api/households/current/name", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draftName })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Rename failed with ${response.status}.`);
    }

    const data = (await response.json()) as HouseholdContextResponse;
    setHouseholdName(data.householdName);
    setDraftName(data.householdName);
  }

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Household</div>
        <h2>Settings</h2>
        <p className="muted">
          Rename your household. This name appears across the app and on kiosk
          displays.
        </p>
        <div className="form-stack mt-4">
          <div className="field">
            <span>Household name</span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. The Smith Family"
            />
          </div>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="action-row">
          <button
            className="action-button"
            onClick={handleRename}
            disabled={isPending || !draftName.trim() || draftName === householdName}
          >
            Save name
          </button>
        </div>

        <div className="section-spacer" />

        <div className="eyebrow mt-3">Time zone</div>
        <p className="muted mt-1">
          Sets the household&apos;s local day boundary. Home agenda grouping, today
          windows, and chore streaks use this zone.
        </p>
        <div className="form-stack mt-3">
          <div className="field">
            <span>IANA time zone id</span>
            <input
              type="text"
              value={draftTimeZoneId}
              onChange={(e) => setDraftTimeZoneId(e.target.value)}
              list="household-tz-suggestions"
              placeholder="e.g. America/New_York"
            />
            <datalist id="household-tz-suggestions">
              {COMMON_TIME_ZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
        </div>
        {tzMessage ? <p className="success-text">{tzMessage}</p> : null}
        <div className="action-row">
          <button
            className="action-button"
            onClick={handleSaveTimeZone}
            disabled={
              isPending
              || !draftTimeZoneId.trim()
              || draftTimeZoneId === timeZoneId
            }
          >
            Save time zone
          </button>
        </div>
      </article>
    </section>
  );
}
