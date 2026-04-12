"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type HouseholdMemberSummary = {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joinedAtUtc: string;
};

type HouseholdMemberListResponse = {
  items: HouseholdMemberSummary[];
};

export function AdminMembersPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [members, setMembers] = useState<HouseholdMemberSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("Member");

  async function refresh() {
    const response = await fetch("/api/households/members", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return;
      throw new Error(`Member lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as HouseholdMemberListResponse;
    setMembers(data.items);
  }

  useEffect(() => {
    if (isSessionLoading || !isOwner) return;

    startTransition(() => {
      refresh().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load members.");
      });
    });
  }, [isOwner, isSessionLoading]);

  function handleAdd() {
    setAddError(null);
    startTransition(() => {
      addMember().catch((err: unknown) => {
        setAddError(err instanceof Error ? err.message : "Unable to add member.");
      });
    });
  }

  async function addMember() {
    const response = await fetch("/api/households/members", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, role })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Add failed with ${response.status}.`);
    }

    setEmail("");
    setDisplayName("");
    setRole("Member");
    await refresh();
  }

  function handleRemove(membershipId: string) {
    startTransition(() => {
      removeMember(membershipId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to remove member.");
      });
    });
  }

  async function removeMember(membershipId: string) {
    const response = await fetch(`/api/households/members/${membershipId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(text || `Remove failed with ${response.status}.`);
    }

    await refresh();
  }

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Household</div>
        <h2>Members</h2>
        <p className="muted">
          Household members can sign in and view the app. Owners have full admin access.
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        {members.length === 0 ? (
          <p className="muted">No members loaded.</p>
        ) : (
          <div className="stack-list" style={{ marginTop: "16px" }}>
            {members.map((m) => (
              <div className="stack-card" key={m.membershipId}>
                <div className="stack-card-header">
                  <div>
                    <strong>{m.displayName}</strong>
                    <div className="muted">{m.email}</div>
                  </div>
                  <div className="pill-row">
                    <span className="pill">{m.role}</span>
                    <button
                      className="action-button action-button-secondary"
                      onClick={() => handleRemove(m.membershipId)}
                      disabled={isPending}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel">
        <div className="eyebrow">Household</div>
        <h2>Add member</h2>
        <p className="muted">
          If the email is not yet registered, a stub account will be created. The
          member can sign in once their auth is configured.
        </p>
        <div className="form-stack" style={{ marginTop: "16px" }}>
          <div className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
            />
          </div>
          <div className="field">
            <span>Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Name shown in the app"
            />
          </div>
          <div className="field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Member">Member</option>
              <option value="Owner">Owner</option>
            </select>
          </div>
        </div>
        {addError ? <p className="error-text">{addError}</p> : null}
        <div className="action-row">
          <button
            className="action-button"
            onClick={handleAdd}
            disabled={isPending || !email.trim() || !displayName.trim()}
          >
            Add member
          </button>
        </div>
      </article>
    </section>
  );
}
