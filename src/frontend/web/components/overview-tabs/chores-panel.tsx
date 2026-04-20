"use client";

import { EmptyState } from "@/components/ui";
import { useOverviewContext } from "./overview-context";

export function ChoresPanel() {
  const {
    data,
    incompleteChores,
    doneChores,
    isOwner,
    members,
    isPending,
    handleComplete,
    handleReassign
  } = useOverviewContext();

  if (!data) {
    return null;
  }

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Chores</div>
          <h2>Today&apos;s chores</h2>

          {incompleteChores.length === 0 ? (
            <EmptyState className="mt-8" message="No open chores right now." />
          ) : (
            <div className="stack-list mt-12">
              {incompleteChores.map((chore) => (
                <div className="stack-card home-attention-card" key={chore.id}>
                  <div className="stack-card-header">
                    <div className="flex-1">
                      <strong>{chore.title}</strong>
                      {isOwner && members.length > 0 ? (
                        <div className="mt-8">
                          <select
                            value={chore.assignedMembershipId ?? ""}
                            onChange={(event) => handleReassign(
                              chore.id,
                              event.target.value === "" ? null : event.target.value
                            )}
                            disabled={isPending}
                            className="text-sm"
                            aria-label={`Reassign ${chore.title}`}
                          >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                              <option key={member.membershipId} value={member.membershipId}>
                                {member.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : chore.assignedMemberName ? (
                        <div className="muted text-sm mt-8">{chore.assignedMemberName}</div>
                      ) : null}
                    </div>
                    <button
                      className="action-button"
                      onClick={() => handleComplete(chore.id)}
                      disabled={isPending}
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="eyebrow">Progress</div>
          <h2>Completed today</h2>

          {doneChores.length === 0 ? (
            <EmptyState className="mt-8" message="Nothing marked complete yet." />
          ) : (
            <div className="stack-list mt-12">
              {doneChores.map((chore) => (
                <div className="stack-card" key={chore.id}>
                  <div className="stack-card-header">
                    <div className="flex-1">
                      <strong>{chore.title}</strong>
                      {chore.assignedMemberName ? (
                        <div className="muted text-sm mt-8">{chore.assignedMemberName}</div>
                      ) : null}
                    </div>
                    <span className="pill">Done</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {data.memberChoreProgress.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Chores</div>
              <h2>Member progress</h2>
              <p className="muted mt-8">
                Streaks reflect consecutive days with at least one completion.
              </p>
              <div className="stack-list mt-12">
                {data.memberChoreProgress.map((member) => (
                  <div className="stack-card" key={member.memberDisplayName}>
                    <div className="stack-card-header">
                      <div className="flex-1">
                        <strong>{member.memberDisplayName}</strong>
                      </div>
                      <div className="pill-row flex-shrink-0">
                        <span className="pill text-xs">
                          {member.currentStreakDays} day
                          {member.currentStreakDays !== 1 ? "s" : ""} streak
                        </span>
                        <span className="pill text-xs">
                          {member.completionsThisWeek} this week
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </>
  );
}
