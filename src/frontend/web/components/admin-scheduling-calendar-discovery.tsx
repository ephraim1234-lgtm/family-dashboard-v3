"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type GoogleCalendarLinkSummary = {
  id: string;
  googleOAuthAccountLinkId: string | null;
  googleCalendarId: string | null;
};

type GoogleCalendarLinkListResponse = {
  items: GoogleCalendarLinkSummary[];
};

type GoogleOAuthReadiness = {
  isReady: boolean;
};

type GoogleOAuthAccountLinkSummary = {
  id: string;
  email: string;
  displayName: string | null;
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

export function AdminSchedulingCalendarDiscovery() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [oauthReadiness, setOauthReadiness] = useState<GoogleOAuthReadiness | null>(null);
  const [oauthAccounts, setOauthAccounts] = useState<GoogleOAuthAccountLinkSummary[]>([]);
  const [oauthCalendars, setOauthCalendars] = useState<GoogleOAuthCalendarSummary[]>([]);
  const [links, setLinks] = useState<GoogleCalendarLinkSummary[]>([]);
  const [calendarLinkingKey, setCalendarLinkingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refreshLinks() {
    const response = await fetch("/api/integrations/google-calendar-links", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Calendar integration lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as GoogleCalendarLinkListResponse;
    setLinks(data.items);
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

  async function refreshDiscovery() {
    setError(null);
    await Promise.all([
      refreshLinks(),
      refreshOAuthReadiness(),
      refreshOAuthAccounts(),
      refreshOAuthCalendars()
    ]);
  }

  async function startOAuthLink() {
    setError(null);

    const response = await fetch("/api/integrations/google-oauth/start", {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(await response.text() || `Google OAuth start failed with ${response.status}.`);
    }

    const data = (await response.json()) as { authorizationUrl: string };
    window.location.assign(data.authorizationUrl);
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
      throw new Error(await response.text() || `Calendar link failed with ${response.status}.`);
    }

    await refreshDiscovery();
  }

  useEffect(() => {
    if (isSessionLoading || !isOwner) {
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
            : "Unable to load Google calendar discovery."
        );
      });
    });
  }, [isOwner, isSessionLoading]);

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  const discoveredCalendars = oauthCalendars.slice(0, 6);

  return (
    <article className="panel">
      <div className="eyebrow">Google calendar discovery</div>
      <h2>Find calendars without leaving Scheduling</h2>
      <p className="muted">
        Link an owner Google account, discover available calendars, and create import links right from the scheduling workspace.
      </p>
      <div className="pill-row">
        <span className="pill">{oauthAccounts.length} linked accounts</span>
        <span className="pill">{oauthCalendars.length} discovered calendars</span>
        <span className="pill">{links.length} linked imports</span>
      </div>
      <div className="action-row compact-action-row">
        <button
          className="action-button"
          onClick={() =>
            startTransition(() => {
              startOAuthLink().catch((oauthError: unknown) => {
                setError(
                  oauthError instanceof Error
                    ? oauthError.message
                    : "Unable to begin Google OAuth linking."
                );
              });
            })
          }
          disabled={isPending || !oauthReadiness?.isReady}
          type="button"
        >
          Link Google account
        </button>
        <button
          className="action-button action-button-ghost"
          onClick={() =>
            startTransition(() => {
              refreshDiscovery().catch((refreshError: unknown) => {
                setError(
                  refreshError instanceof Error
                    ? refreshError.message
                    : "Unable to refresh Google calendar discovery."
                );
              });
            })
          }
          disabled={isPending}
          type="button"
        >
          Refresh discovery
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {discoveredCalendars.length === 0 ? (
        <p className="muted">
          {oauthAccounts.length === 0
            ? "No Google accounts are linked yet."
            : "No calendars have been discovered yet for the linked accounts."}
        </p>
      ) : (
        <div className="stack-list mt-16" data-testid="admin-scheduling-calendar-discovery">
          {discoveredCalendars.map((calendar) => {
            const existingLink = links.find(
              (link) =>
                link.googleOAuthAccountLinkId === calendar.accountLinkId
                && link.googleCalendarId === calendar.calendarId
            );

            return (
              <div className="stack-card" key={`${calendar.accountLinkId}:${calendar.calendarId}`}>
                <div className="stack-card-header">
                  <div>
                    <strong>{calendar.displayName}</strong>
                    <div className="muted">{calendar.accountEmail}</div>
                  </div>
                  <div className="pill-row">
                    {calendar.isPrimary ? <span className="pill">Primary</span> : null}
                    {calendar.accessRole ? <span className="pill">{calendar.accessRole}</span> : null}
                  </div>
                </div>
                <div className="muted">Time zone: {calendar.timeZone ?? "Not provided"}</div>
                <div className="muted">{calendar.calendarId}</div>
                <div className="action-row compact-action-row">
                  <button
                    className="action-button"
                    onClick={() =>
                      startTransition(() => {
                        createManagedLink(calendar).catch((linkError: unknown) => {
                          setCalendarLinkingKey(null);
                          setError(
                            linkError instanceof Error
                              ? linkError.message
                              : "Unable to link the discovered Google calendar."
                          );
                        });
                      })
                    }
                    disabled={isPending || existingLink != null || calendarLinkingKey === `${calendar.accountLinkId}:${calendar.calendarId}`}
                    type="button"
                  >
                    {existingLink ? "Already linked" : "Link for import"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
