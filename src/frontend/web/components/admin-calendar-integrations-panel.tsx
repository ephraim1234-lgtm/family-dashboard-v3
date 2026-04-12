"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type GoogleCalendarLinkSummary = {
  id: string;
  displayName: string;
  linkMode: string;
  feedUrlHost: string;
  feedUrlPathHint: string;
  googleOAuthAccountLinkId: string | null;
  googleOAuthAccountEmail: string | null;
  googleCalendarId: string | null;
  googleCalendarTimeZone: string | null;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  nextSyncDueAtUtc: string | null;
  lastSyncStatus: string;
  lastSyncError: string | null;
  lastSyncStartedAtUtc: string | null;
  lastSyncCompletedAtUtc: string | null;
  lastSyncFailureCategory: string | null;
  lastSyncRecoveryHint: string | null;
  importedEventCount: number;
  skippedRecurringEventCount: number;
  skippedRecurringOverrideCount: number;
  createdAtUtc: string;
};

type GoogleCalendarLinkListResponse = {
  items: GoogleCalendarLinkSummary[];
};

type GoogleOAuthReadiness = {
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRedirectUri: boolean;
  isReady: boolean;
  configuredRedirectUri: string | null;
};

type GoogleOAuthAccountLinkSummary = {
  id: string;
  email: string;
  displayName: string | null;
  scope: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type GoogleOAuthAccountLinkListResponse = {
  items: GoogleOAuthAccountLinkSummary[];
};

type GoogleOAuthCalendarSummary = {
  accountLinkId: string;
  accountEmail: string;
  calendarId: string;
  displayName: string;
  isPrimary: boolean;
  accessRole: string | null;
  timeZone: string | null;
};

type GoogleOAuthCalendarListResponse = {
  items: GoogleOAuthCalendarSummary[];
};

export function AdminCalendarIntegrationsPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [displayName, setDisplayName] = useState("Family Google Calendar");
  const [feedUrl, setFeedUrl] = useState("");
  const [links, setLinks] = useState<GoogleCalendarLinkSummary[]>([]);
  const [oauthReadiness, setOauthReadiness] = useState<GoogleOAuthReadiness | null>(null);
  const [oauthAccounts, setOauthAccounts] = useState<GoogleOAuthAccountLinkSummary[]>([]);
  const [oauthCalendars, setOauthCalendars] = useState<GoogleOAuthCalendarSummary[]>([]);
  const [recommendedRedirectUri, setRecommendedRedirectUri] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);
  const [calendarLinkingKey, setCalendarLinkingKey] = useState<string | null>(null);
  const [syncSettings, setSyncSettings] = useState<Record<string, {
    autoSyncEnabled: boolean;
    syncIntervalMinutes: number;
  }>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refreshLinks() {
    const response = await fetch("/api/integrations/google-calendar-links", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      setLinks([]);
      throw new Error(`Calendar integration lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as GoogleCalendarLinkListResponse;
    setLinks(data.items);
    setSyncSettings(() => {
      const next: Record<string, { autoSyncEnabled: boolean; syncIntervalMinutes: number }> = {};
      for (const item of data.items) {
        next[item.id] = {
          autoSyncEnabled: item.autoSyncEnabled,
          syncIntervalMinutes: item.syncIntervalMinutes
        };
      }

      return next;
    });
  }

  async function refreshOAuthReadiness() {
    const response = await fetch("/api/integrations/google-oauth/readiness", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google OAuth readiness lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as GoogleOAuthReadiness;
    setOauthReadiness(data);
  }

  async function refreshOAuthAccounts() {
    const response = await fetch("/api/integrations/google-oauth/accounts", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google OAuth account lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as GoogleOAuthAccountLinkListResponse;
    setOauthAccounts(data.items);
  }

  async function refreshOAuthCalendars() {
    const response = await fetch("/api/integrations/google-oauth/calendars", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google OAuth calendar lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as GoogleOAuthCalendarListResponse;
    setOauthCalendars(data.items);
  }

  async function createManagedLink(calendar: GoogleOAuthCalendarSummary) {
    setError(null);
    setCalendarLinkingKey(`${calendar.accountLinkId}:${calendar.calendarId}`);

    const response = await fetch("/api/integrations/google-oauth/calendars/link", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        accountLinkId: calendar.accountLinkId,
        calendarId: calendar.calendarId,
        displayName: calendar.displayName,
        calendarTimeZone: calendar.timeZone
      })
    });

    setCalendarLinkingKey(null);

    if (!response.ok) {
      setError(await response.text());
      return;
    }

    await Promise.all([refreshLinks(), refreshOAuthCalendars()]);
  }

  useEffect(() => {
    setRecommendedRedirectUri(
      typeof window === "undefined"
        ? null
        : `${window.location.origin}/api/integrations/google-oauth/callback`
    );

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthState = params.get("google_oauth");
      if (oauthState === "linked") {
        setOauthMessage("Google account linked successfully.");
      } else if (oauthState === "invalid-state") {
        setOauthMessage("Google OAuth state verification failed. Start the linking flow again.");
      } else if (oauthState === "missing-session") {
        setOauthMessage("Your owner session was missing during the callback. Sign in again and retry linking.");
      } else if (oauthState === "forbidden") {
        setOauthMessage("An owner-scoped household session is required to complete Google account linking.");
      } else if (oauthState === "missing-code") {
        setOauthMessage("Google did not return an authorization code.");
      } else if (oauthState === "error" || oauthState === "failed") {
        setOauthMessage(params.get("reason") ?? "Google account linking failed.");
      }
    }

    if (isSessionLoading) {
      return;
    }

    if (!isOwner) {
      setLinks([]);
      setOauthReadiness(null);
      setOauthAccounts([]);
      setOauthCalendars([]);
      return;
    }

    startTransition(() => {
      Promise.all([
        refreshLinks(),
        refreshOAuthReadiness(),
        refreshOAuthAccounts(),
        refreshOAuthCalendars()
      ]).catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load calendar links."
        );
      });
    });
  }, [isOwner, isSessionLoading]);

  function handleCreate() {
    startTransition(() => {
      createLink().catch((createError: unknown) => {
        setError(
          createError instanceof Error
            ? createError.message
            : "Unable to save the Google Calendar link."
        );
      });
    });
  }

  async function createLink() {
    setError(null);

    const response = await fetch("/api/integrations/google-calendar-links", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName,
        feedUrl
      })
    });

    if (!response.ok) {
      setError(await response.text());
      return;
    }

    setFeedUrl("");
    await refreshLinks();
  }

  function handleSync(linkId: string) {
    startTransition(() => {
      syncLink(linkId).catch((syncError: unknown) => {
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Unable to sync the Google Calendar feed."
        );
      });
    });
  }

  async function syncLink(linkId: string) {
    setError(null);

    const response = await fetch(`/api/integrations/google-calendar-links/${linkId}/sync`, {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      setError(await response.text());
      await refreshLinks();
      return;
    }

    await refreshLinks();
  }

  function handleDelete(linkId: string) {
    startTransition(() => {
      deleteLink(linkId).catch((deleteError: unknown) => {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to remove the linked Google Calendar."
        );
      });
    });
  }

  async function deleteLink(linkId: string) {
    setError(null);

    const response = await fetch(`/api/integrations/google-calendar-links/${linkId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok) {
      setError(`Delete failed with ${response.status}.`);
      return;
    }

    await refreshLinks();
  }

  function handleSyncSettingsChange(
    linkId: string,
    next: Partial<{ autoSyncEnabled: boolean; syncIntervalMinutes: number }>
  ) {
    setSyncSettings((current) => ({
      ...current,
      [linkId]: {
        autoSyncEnabled: next.autoSyncEnabled ?? current[linkId]?.autoSyncEnabled ?? true,
        syncIntervalMinutes: next.syncIntervalMinutes ?? current[linkId]?.syncIntervalMinutes ?? 30
      }
    }));
  }

  function handleSaveSyncSettings(linkId: string) {
    startTransition(() => {
      saveSyncSettings(linkId).catch((settingsError: unknown) => {
        setError(
          settingsError instanceof Error
            ? settingsError.message
            : "Unable to update sync settings."
        );
      });
    });
  }

  async function saveSyncSettings(linkId: string) {
    setError(null);
    const currentSettings = syncSettings[linkId];

    const response = await fetch(`/api/integrations/google-calendar-links/${linkId}/sync-settings`, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(currentSettings)
    });

    if (!response.ok) {
      setError(await response.text());
      return;
    }

    await refreshLinks();
  }

  function handleStartOAuthLink() {
    startTransition(() => {
      startOAuthLink().catch((oauthError: unknown) => {
        setError(
          oauthError instanceof Error
            ? oauthError.message
            : "Unable to begin Google OAuth linking."
        );
      });
    });
  }

  async function startOAuthLink() {
    setError(null);

    const response = await fetch("/api/integrations/google-oauth/start", {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      setError(await response.text());
      return;
    }

    const data = (await response.json()) as { authorizationUrl: string };
    window.location.assign(data.authorizationUrl);
  }

  function handleCreateManagedLink(calendar: GoogleOAuthCalendarSummary) {
    startTransition(() => {
      createManagedLink(calendar).catch((linkError: unknown) => {
        setCalendarLinkingKey(null);
        setError(
          linkError instanceof Error
            ? linkError.message
            : "Unable to link the discovered Google calendar."
        );
      });
    });
  }

  function renderFailureCategory(category: string | null) {
    switch (category) {
      case "invalid_feed":
        return "Invalid feed";
      case "network":
        return "Network issue";
      case "access":
        return "Access problem";
      case "unknown":
        return "Unknown failure";
      default:
        return null;
    }
  }

  function renderSourceSummary(link: GoogleCalendarLinkSummary) {
    if (link.linkMode === "OAuthCalendar") {
      return (
        <>
          {link.googleOAuthAccountEmail ?? "Linked Google account"}
          {" · "}
          {link.googleCalendarId ?? link.feedUrlPathHint}
        </>
      );
    }

    return (
      <>
        {link.feedUrlHost}
        {link.feedUrlPathHint}
      </>
    );
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Calendar integrations</div>
        <h2>Link a Google Calendar iCal feed</h2>
        <p className="muted">
          This first slice is one-way import only. Integrations owns the link and
          sync state, while Scheduling stays the source of local event behavior.
        </p>
        {!isOwner && !isSessionLoading ? (
          <p className="muted">
            Sign in with an owner session to manage Google calendar links.
          </p>
        ) : null}

        <div className="form-stack">
          <label className="field">
            <span>Calendar label</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Google iCal feed URL</span>
            <input
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/..."
            />
          </label>
        </div>

        <div className="action-row">
          <button className="action-button" onClick={handleCreate} disabled={isPending || !isOwner}>
            Save Link
          </button>
          <button
            className="action-button action-button-ghost"
            onClick={() =>
              startTransition(() => {
                refreshLinks().catch((refreshError: unknown) => {
                  setError(
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Unable to load calendar links."
                  );
                });
              })
            }
            disabled={isPending || !isOwner}
          >
            Refresh Links
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </article>

      <article className="panel">
        <div className="eyebrow">Scope note</div>
        <h2>Narrow import boundary</h2>
        <p className="muted">
          This phase now includes Google OAuth account linking, calendar discovery,
          and managed Google calendar links. Import remains one-way into Scheduling,
          recurrence support stays narrow, and bidirectional sync is still out of scope.
        </p>
        <div className="pill-row">
          <span className="pill">Google only</span>
          <span className="pill">OAuth-managed links</span>
          <span className="pill">Manual sync</span>
          <span className="pill">Daily + weekly recurring import</span>
          <span className="pill">Unsupported recurrence skipped</span>
          <span className="pill">Imported events are read-only</span>
        </div>
      </article>

      <article className="panel">
        <div className="eyebrow">OAuth readiness</div>
        <h2>Google account linking setup</h2>
        <p className="muted">
          OAuth linking is still blocked on callback wiring and hosted validation, but the
          config surface is now visible here so you can confirm local readiness without
          exposing secrets in the repo.
        </p>
        <div className="pill-row">
          <span className="pill">
            Client ID {oauthReadiness?.hasClientId ? "ready" : "missing"}
          </span>
          <span className="pill">
            Client secret {oauthReadiness?.hasClientSecret ? "ready" : "missing"}
          </span>
          <span className="pill">
            Redirect URI {oauthReadiness?.hasRedirectUri ? "ready" : "missing"}
          </span>
        </div>
        <div className="form-stack" style={{ marginTop: "1rem" }}>
          <div className="field">
            <span>Configured redirect URI</span>
            <code>{oauthReadiness?.configuredRedirectUri ?? "Not configured yet"}</code>
          </div>
          <div className="field">
            <span>Recommended current local redirect URI</span>
            <code>{recommendedRedirectUri ?? "Unavailable until the page loads"}</code>
          </div>
        </div>
        <p className="muted">
          For your current local `.env`, the correct value should match the web origin plus
          `/api/integrations/google-oauth/callback`. If you keep `WEB_PORT=3000`, that means
          `http://localhost:3000/api/integrations/google-oauth/callback`.
        </p>
        <div className="action-row">
          <button
            className="action-button"
            onClick={handleStartOAuthLink}
            disabled={isPending || !isOwner || !oauthReadiness?.isReady}
          >
            Link Google Account
          </button>
        </div>
        {oauthMessage ? <p className="muted">{oauthMessage}</p> : null}
        {oauthAccounts.length === 0 ? (
          <p className="muted">No Google OAuth accounts have been linked yet.</p>
        ) : (
          <div className="stack-list">
            {oauthAccounts.map((account) => {
              const calendars = oauthCalendars.filter(
                (calendar) => calendar.accountLinkId === account.id
              );

              return (
                <div className="stack-card" key={account.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{account.displayName ?? account.email}</strong>
                      <div className="muted">{account.email}</div>
                    </div>
                    <span className="pill">Linked</span>
                  </div>
                  <div className="muted">Scope: {account.scope}</div>
                  <div className="muted">
                    Updated {new Date(account.updatedAtUtc).toLocaleString()}
                  </div>
                  {calendars.length === 0 ? (
                    <p className="muted">No calendars discovered yet for this account.</p>
                  ) : (
                    <div className="stack-list" style={{ marginTop: "0.75rem" }}>
                      {calendars.map((calendar) => {
                        const existingLink = links.find(
                          (link) =>
                            link.googleOAuthAccountLinkId === calendar.accountLinkId
                            && link.googleCalendarId === calendar.calendarId
                        );

                        return (
                          <div className="stack-card" key={`${account.id}:${calendar.calendarId}`}>
                            <div className="stack-card-header">
                              <div>
                                <strong>{calendar.displayName}</strong>
                                <div className="muted">{calendar.calendarId}</div>
                              </div>
                              <div className="pill-row">
                                {calendar.isPrimary ? <span className="pill">Primary</span> : null}
                                {calendar.accessRole ? (
                                  <span className="pill">{calendar.accessRole}</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="muted">
                              Time zone: {calendar.timeZone ?? "Not provided"}
                            </div>
                            <div className="action-row compact-action-row" style={{ marginTop: "0.75rem" }}>
                              <button
                                className="action-button"
                                onClick={() => handleCreateManagedLink(calendar)}
                                disabled={isPending || !isOwner || existingLink != null || calendarLinkingKey === `${calendar.accountLinkId}:${calendar.calendarId}`}
                              >
                                {existingLink ? "Already Linked" : "Link for Import"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </article>

      <article className="panel">
        <h2>Linked Google calendars</h2>
        {links.length === 0 ? (
          <p className="muted">No Google calendars have been linked yet.</p>
        ) : (
          <div className="stack-list">
            {links.map((link) => (
              <div className="stack-card" key={link.id}>
                {syncSettings[link.id] == null ? null : (
                  <>
                    <div className="stack-card-header">
                      <div>
                        <strong>{link.displayName}</strong>
                        <div className="muted">{renderSourceSummary(link)}</div>
                      </div>
                      <div className="pill-row">
                        <span className="pill">{link.lastSyncStatus}</span>
                        <span className="pill">{link.importedEventCount} imported</span>
                        <span className="pill">
                          {link.linkMode === "OAuthCalendar" ? "OAuth managed" : "iCal feed"}
                        </span>
                        {link.autoSyncEnabled ? (
                          <span className="pill">Auto every {link.syncIntervalMinutes}m</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="muted">
                      Source: {link.linkMode === "OAuthCalendar" ? "OAuth-managed Google calendar" : "Private Google iCal feed"}
                    </div>
                    <div className="muted">
                      Source time zone: {link.googleCalendarTimeZone ?? "Not provided"}
                    </div>
                    <div className="muted">
                      Last completed{" "}
                      {link.lastSyncCompletedAtUtc
                        ? new Date(link.lastSyncCompletedAtUtc).toLocaleString()
                        : "Never"}
                    </div>
                    <div className="muted">
                      Next auto sync{" "}
                      {link.nextSyncDueAtUtc
                        ? new Date(link.nextSyncDueAtUtc).toLocaleString()
                        : "Not scheduled"}
                    </div>
                    <div className="muted">
                      Unsupported recurring events skipped: {link.skippedRecurringEventCount}
                    </div>
                    {link.linkMode === "OAuthCalendar" ? (
                      <div className="muted">
                        Recurring overrides/exceptions skipped: {link.skippedRecurringOverrideCount}
                      </div>
                    ) : null}
                    {link.linkMode === "OAuthCalendar" && link.skippedRecurringOverrideCount > 0 ? (
                      <p className="muted">
                        This managed import keeps the base recurring series when it can, but it does not yet model Google recurring exceptions or one-off overrides in local Scheduling.
                      </p>
                    ) : null}
                    {link.lastSyncError ? (
                      <div className="stack-card" style={{ marginTop: "0.75rem" }}>
                        <div className="stack-card-header">
                          <strong>Sync needs attention</strong>
                          {renderFailureCategory(link.lastSyncFailureCategory) ? (
                            <span className="pill">
                              {renderFailureCategory(link.lastSyncFailureCategory)}
                            </span>
                          ) : null}
                        </div>
                        <div className="error-text">{link.lastSyncError}</div>
                        {link.lastSyncRecoveryHint ? (
                          <p className="muted">{link.lastSyncRecoveryHint}</p>
                        ) : null}
                        <p className="muted">
                          {link.autoSyncEnabled
                            ? `Automatic sync will retry ${
                                link.nextSyncDueAtUtc
                                  ? new Date(link.nextSyncDueAtUtc).toLocaleString()
                                  : "on the next schedule"
                              }.`
                            : "Automatic sync is disabled, so this link will only retry when you run Sync Now."}
                        </p>
                      </div>
                    ) : null}

                    <div className="form-stack">
                      <label className="field checkbox-field">
                        <input
                          type="checkbox"
                          checked={syncSettings[link.id].autoSyncEnabled}
                          onChange={(event) =>
                            handleSyncSettingsChange(link.id, {
                              autoSyncEnabled: event.target.checked
                            })
                          }
                          disabled={!isOwner}
                        />
                        <span>Enable automatic sync</span>
                      </label>

                      <label className="field">
                        <span>Auto sync interval (minutes)</span>
                        <select
                          value={syncSettings[link.id].syncIntervalMinutes}
                          onChange={(event) =>
                            handleSyncSettingsChange(link.id, {
                              syncIntervalMinutes: Number(event.target.value)
                            })
                          }
                          disabled={!isOwner || !syncSettings[link.id].autoSyncEnabled}
                        >
                          {[5, 15, 30, 60, 180, 360, 720, 1440].map((minutes) => (
                            <option key={minutes} value={minutes}>
                              {minutes}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="action-row compact-action-row">
                      <button
                        className="action-button action-button-ghost"
                        onClick={() => handleSaveSyncSettings(link.id)}
                        disabled={isPending || !isOwner}
                      >
                        Save Sync Settings
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleSync(link.id)}
                        disabled={isPending || !isOwner}
                      >
                        Sync Now
                      </button>
                      <button
                        className="action-button action-button-secondary"
                        onClick={() => handleDelete(link.id)}
                        disabled={isPending || !isOwner}
                      >
                        Remove Link
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
