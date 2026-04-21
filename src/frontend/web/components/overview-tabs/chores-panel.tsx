"use client";

import {
  ActionButton,
  Badge,
  Card,
  EmptyState,
  ListCard,
  SectionHeader,
  StatCard
} from "@/components/ui";
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
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Chores"
            title="Today's chores"
            description="Stay focused on what is still open, who it belongs to, and the next quick action."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Open" tone={incompleteChores.length > 0 ? "warning" : "default"} value={incompleteChores.length} />
            <StatCard label="Completed" value={doneChores.length} />
            <StatCard label="Members active" value={data.memberChoreProgress.length} />
          </div>

          {incompleteChores.length === 0 ? (
            <EmptyState message="No open chores right now." />
          ) : (
            <div className="grid gap-3">
              {incompleteChores.map((chore) => (
                <ListCard
                  key={chore.id}
                  tone="warning"
                  title={chore.title}
                  description={chore.assignedMemberName ?? "Unassigned"}
                  action={
                    <ActionButton
                      size="sm"
                      onClick={() => handleComplete(chore.id)}
                      disabled={isPending}
                    >
                      Complete
                    </ActionButton>
                  }
                >
                  {isOwner && members.length > 0 ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[color:var(--text-strong)]">Assign to</span>
                      <select
                        value={chore.assignedMembershipId ?? ""}
                        onChange={(event) => handleReassign(
                          chore.id,
                          event.target.value === "" ? null : event.target.value
                        )}
                        disabled={isPending}
                        aria-label={`Reassign ${chore.title}`}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.membershipId} value={member.membershipId}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </ListCard>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <SectionHeader
            eyebrow="Progress"
            title="Completed today"
            titleAs="h3"
            description="A quick read on what is already done."
          />

          {doneChores.length === 0 ? (
            <EmptyState message="Nothing marked complete yet." />
          ) : (
            <div className="grid gap-3">
              {doneChores.map((chore) => (
                <ListCard
                  key={chore.id}
                  title={chore.title}
                  description={chore.assignedMemberName ?? "Completed"}
                  action={<Badge>Done</Badge>}
                />
              ))}
            </div>
          )}
        </Card>
      </section>

      {data.memberChoreProgress.length > 0 ? (
        <Card className="space-y-4">
          <SectionHeader
            eyebrow="Chores"
            title="Member progress"
            description="Streaks reflect consecutive days with at least one completion."
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {data.memberChoreProgress.map((member) => (
              <ListCard
                key={member.memberDisplayName}
                title={member.memberDisplayName}
                meta={`${member.currentStreakDays} day${member.currentStreakDays !== 1 ? "s" : ""} streak`}
                action={<Badge>{member.completionsThisWeek} this week</Badge>}
              />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
