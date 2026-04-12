"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type HouseholdContextResponse = {
  householdId: string;
  householdName: string;
  activeRole: string;
  membershipStatus: string;
};

export function AdminHouseholdSettingsPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [householdName, setHouseholdName] = useState("");
  const [draftName, setDraftName] = useState("");
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
        <div className="form-stack" style={{ marginTop: "16px" }}>
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
      </article>
    </section>
  );
}
