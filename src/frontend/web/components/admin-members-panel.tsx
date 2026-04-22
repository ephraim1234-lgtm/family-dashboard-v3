"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
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

type HouseholdInviteSummary = {
  inviteId: string;
  email: string;
  role: string;
  createdAtUtc: string;
  expiresAtUtc: string;
};

type HouseholdInviteListResponse = {
  items: HouseholdInviteSummary[];
};

type CreateHouseholdInviteResponse = {
  invite: HouseholdInviteSummary;
  acceptUrl: string;
};

export function AdminMembersPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [members, setMembers] = useState<HouseholdMemberSummary[]>([]);
  const [invites, setInvites] = useState<HouseholdInviteSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");

  async function refresh() {
    const [memberResponse, inviteResponse] = await Promise.all([
      fetch("/api/households/members", {
        credentials: "same-origin",
        cache: "no-store"
      }),
      fetch("/api/households/invites", {
        credentials: "same-origin",
        cache: "no-store"
      })
    ]);

    if (!memberResponse.ok || !inviteResponse.ok) {
      const status = !memberResponse.ok ? memberResponse.status : inviteResponse.status;
      if (status === 401 || status === 403) {
        return;
      }

      throw new Error(`Household membership lookup failed with ${status}.`);
    }

    const memberData = (await memberResponse.json()) as HouseholdMemberListResponse;
    const inviteData = (await inviteResponse.json()) as HouseholdInviteListResponse;
    setMembers(memberData.items);
    setInvites(inviteData.items);
  }

  useEffect(() => {
    if (isSessionLoading || !isOwner) {
      return;
    }

    startTransition(() => {
      refresh().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load members.");
      });
    });
  }, [isOwner, isSessionLoading]);

  function handleInviteCreate() {
    setInviteError(null);
    startTransition(() => {
      createInvite().catch((err: unknown) => {
        setInviteError(err instanceof Error ? err.message : "Unable to create invite.");
      });
    });
  }

  async function createInvite() {
    const response = await fetch("/api/households/invites", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Invite failed with ${response.status}.`);
    }

    const data = (await response.json()) as CreateHouseholdInviteResponse;
    setCopiedInviteUrl(data.acceptUrl);
    setEmail("");
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

  function handleRevoke(inviteId: string) {
    startTransition(() => {
      revokeInvite(inviteId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to revoke invite.");
      });
    });
  }

  async function revokeInvite(inviteId: string) {
    const response = await fetch(`/api/households/invites/${inviteId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(text || `Revoke failed with ${response.status}.`);
    }

    await refresh();
  }

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteUrl(url);
    } catch {
      setInviteError("Unable to copy the invite link. You can still copy it manually from the field.");
      setCopiedInviteUrl(url);
    }
  }

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card className="space-y-5">
        <div className="space-y-2">
          <div className="eyebrow">Household</div>
          <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
        </div>
        <p className="muted">
          Household members can sign in and view the app. Owners have full admin access.
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        {members.length === 0 ? (
          <p className="muted">No members loaded.</p>
        ) : (
          <div className="stack-list mt-4">
            {members.map((member) => (
              <div className="stack-card" key={member.membershipId}>
                <div className="stack-card-header">
                  <div>
                    <strong>{member.displayName}</strong>
                    <div className="muted">{member.email}</div>
                  </div>
                  <div className="pill-row">
                    <span className="pill">{member.role}</span>
                    <Button
                      variant="secondary"
                      onClick={() => handleRemove(member.membershipId)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-5">
        <div className="space-y-2">
          <div className="eyebrow">Invites</div>
          <h2 className="text-2xl font-semibold tracking-tight">Invite member</h2>
        </div>
        <p className="muted">
          Invites are email-scoped and create a membership only after the invited account signs in and accepts the tokenized link.
        </p>
        <div className="form-stack">
          <div className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@example.com"
            />
          </div>
          <div className="field">
            <span>Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="Member">Member</option>
              <option value="Owner">Owner</option>
            </select>
          </div>
        </div>
        {inviteError ? <p className="error-text">{inviteError}</p> : null}
        <div className="action-row">
          <Button onClick={handleInviteCreate} disabled={isPending || !email.trim()}>
            Create invite
          </Button>
        </div>

        {copiedInviteUrl ? (
          <div className="stack-card">
            <strong>Latest invite link</strong>
            <input readOnly type="text" value={copiedInviteUrl} />
            <div className="action-row">
              <Button
                variant="secondary"
                onClick={() => {
                  void copyInvite(copiedInviteUrl);
                }}
              >
                Copy link
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight">Pending invites</h3>
          {invites.length === 0 ? (
            <p className="muted">No pending invites.</p>
          ) : (
            <div className="stack-list">
              {invites.map((invite) => (
                <div className="stack-card" key={invite.inviteId}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{invite.email}</strong>
                      <div className="muted">
                        {invite.role} | expires {new Date(invite.expiresAtUtc).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleRevoke(invite.inviteId)}
                      disabled={isPending}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
