"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  HouseholdBoardCard,
  HouseholdEmptyState,
  HouseholdMetaBadges
} from "./household";
import { Badge, EmptyState } from "@/components/ui";
import {
  applyDisplayRefreshFailure,
  applyDisplayRefreshSuccess,
  buildDisplayViewModel,
  createInitialDisplaySurfaceState,
  getDisplayRefreshIntervalMs,
  type DisplayAgendaCard,
  type DisplayChoreCard,
  type DisplayNoteCard,
  type DisplayReminderCard,
  type DisplaySnapshot
} from "@/lib/family-display";

type DisplaySurfacePanelProps = {
  token: string;
};

const MAX_CONSECUTIVE_FAILURES = 3;

function DisplayNowCard({ item }: Readonly<{ item: DisplayAgendaCard }>) {
  return (
    <div className="display-now-item">
      <div className="display-now-item-head">
        <strong>{item.title}</strong>
        <span className="display-inline-note">{item.timeLabel}</span>
      </div>
      {item.description ? (
        <p className="display-inline-copy">{item.description}</p>
      ) : null}
      <HouseholdMetaBadges
        kind={item.kind}
        sourceLabel={item.sourceLabel}
        urgencyState={item.urgencyState}
      />
    </div>
  );
}

function DisplayAgendaList({
  items,
  emptyTitle,
  emptyMessage
}: Readonly<{
  items: DisplayAgendaCard[];
  emptyTitle: string;
  emptyMessage: string;
}>) {
  if (items.length === 0) {
    return (
      <EmptyState
        className="display-empty-state"
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <div className="display-agenda-list">
      {items.map((item) => (
        <div className="display-agenda-item" key={item.key}>
          <div className="display-agenda-time">
            <div>{item.timeLabel}</div>
            <div className="display-inline-note">{item.dayLabel}</div>
          </div>
          <div className="display-agenda-copy">
            <strong>{item.title}</strong>
            {item.description ? (
              <div className="display-inline-copy">{item.description}</div>
            ) : null}
            <HouseholdMetaBadges
              kind={item.kind}
              sourceLabel={item.sourceLabel}
              urgencyState={item.urgencyState}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DisplayReminderBoard({ items }: Readonly<{ items: DisplayReminderCard[] }>) {
  if (items.length === 0) {
    return <HouseholdEmptyState className="display-empty-state" variant="quiet-day" />;
  }

  return (
    <div className="display-board-stack">
      {items.map((item) => (
        <HouseholdBoardCard
          className="display-board-card"
          key={item.key}
          tone={item.urgencyState === "overdue" ? "warning" : "accent"}
          title={item.title}
          description={`${item.leadLabel} | ${item.dueLabel}`}
          meta={(
            <div className="display-board-meta">
              <HouseholdMetaBadges
                kind={item.kind}
                sourceLabel={item.sourceLabel}
                urgencyState={item.urgencyState}
              />
              <div className="display-inline-note">{item.triageLabel}</div>
            </div>
          )}
        />
      ))}
    </div>
  );
}

function DisplayChoreBoard({ items }: Readonly<{ items: DisplayChoreCard[] }>) {
  if (items.length === 0) {
    return <HouseholdEmptyState className="display-empty-state" variant="quiet-day" />;
  }

  return (
    <div className="display-board-stack">
      {items.map((item) => (
        <HouseholdBoardCard
          className="display-board-card"
          key={item.key}
          title={item.title}
          description={item.recurrenceLabel}
          meta={(
            <HouseholdMetaBadges
              owner={item.ownerDisplay}
              kind="chore"
              sourceLabel={item.sourceLabel}
              urgencyState={item.urgencyState}
            />
          )}
        />
      ))}
    </div>
  );
}

function DisplayNoteBoard({ items }: Readonly<{ items: DisplayNoteCard[] }>) {
  if (items.length === 0) {
    return <HouseholdEmptyState className="display-empty-state" variant="board-clear" />;
  }

  return (
    <div className="display-board-stack">
      {items.map((item) => (
        <HouseholdBoardCard
          className="display-board-card"
          key={item.key}
          title={item.title}
          description={item.body ?? "Pinned for ambient household context."}
          meta={(
            <div className="display-board-meta">
              <HouseholdMetaBadges
                owner={item.ownerDisplay}
                kind={item.kind}
                sourceLabel={item.sourceLabel}
              />
              <div className="display-inline-note">{item.authorLabel}</div>
            </div>
          )}
        />
      ))}
    </div>
  );
}

export function DisplaySurfacePanel({ token }: DisplaySurfacePanelProps) {
  const [surfaceState, setSurfaceState] = useState(createInitialDisplaySurfaceState);
  const [now, setNow] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const refreshIntervalMs = getDisplayRefreshIntervalMs();

    if (refreshIntervalMs < 60_000) {
      const interval = window.setInterval(() => setNow(new Date()), refreshIntervalMs);
      setNow(new Date());
      return () => window.clearInterval(interval);
    }

    let minuteInterval: number | undefined;
    const tick = () => setNow(new Date());
    const msUntilNextMinute = Math.max(
      250,
      (60 - new Date().getSeconds()) * 1_000 - new Date().getMilliseconds()
    );

    const timeout = window.setTimeout(() => {
      tick();
      minuteInterval = window.setInterval(tick, 60_000);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeout);
      if (minuteInterval) {
        window.clearInterval(minuteInterval);
      }
    };
  }, []);

  useEffect(() => {
    let isDisposed = false;

    async function refreshProjection() {
      try {
        const response = await fetch(`/api/display/projection/${token}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Display projection request failed with ${response.status}.`);
        }

        const snapshot = (await response.json()) as DisplaySnapshot;
        if (isDisposed) {
          return;
        }

        setSurfaceState(() =>
          applyDisplayRefreshSuccess(snapshot, new Date().toISOString())
        );
      } catch {
        if (isDisposed) {
          return;
        }

        let shouldReload = false;
        setSurfaceState((previousState) => {
          const nextState = applyDisplayRefreshFailure(
            previousState,
            new Date().toISOString(),
            MAX_CONSECUTIVE_FAILURES
          );
          shouldReload = nextState.shouldReload;
          return nextState;
        });

        if (shouldReload) {
          window.setTimeout(() => window.location.reload(), 400);
        }
      }
    }

    startTransition(() => {
      void refreshProjection();
    });

    const interval = window.setInterval(() => {
      startTransition(() => {
        void refreshProjection();
      });
    }, getDisplayRefreshIntervalMs());

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [token]);

  const viewModel = useMemo(
    () => (surfaceState.snapshot ? buildDisplayViewModel(surfaceState.snapshot, now) : null),
    [now, surfaceState.snapshot]
  );

  const upcomingDayLimit = viewModel?.agendaDensityMode === "Dense" ? 4 : 3;
  const todayAgendaLimit = viewModel?.agendaDensityMode === "Dense" ? 6 : 4;

  if (!viewModel && surfaceState.status === "loading") {
    return (
      <section className="display-surface display-surface-loading" data-testid="display-surface-page">
        <EmptyState
          className="display-empty-state display-empty-state-screen"
          title="Waking the household display"
          message="Pulling the latest household board for this device."
        />
      </section>
    );
  }

  if (!viewModel) {
    return (
      <section className="display-surface display-surface-loading" data-testid="display-surface-page">
        <EmptyState
          className="display-empty-state display-empty-state-screen"
          title="Display unavailable"
          message={surfaceState.errorMessage ?? "This display token could not load a household board right now."}
        />
      </section>
    );
  }

  return (
    <section className="display-surface" data-testid="display-surface-page">
      <div
        className={`display-status-banner display-status-banner-${surfaceState.status}`}
        data-testid="display-status-banner"
      >
        <div className="display-status-copy">
          <Badge variant={surfaceState.status === "stale" ? "warning" : "default"}>
            {surfaceState.status === "stale" ? "Stale" : "Live"}
          </Badge>
          <span>
            {surfaceState.status === "stale"
              ? surfaceState.errorMessage
              : `Household board updated ${viewModel.generatedLabel}.`}
          </span>
        </div>
        <div className="display-status-copy">
          <span>{viewModel.windowLabel}</span>
          <span>{viewModel.householdTimeZoneId}</span>
        </div>
      </div>

      <section className="display-hero-card">
        <div className="display-kicker">
          <span>{viewModel.householdName}</span>
          <span>{viewModel.deviceName}</span>
          <span>Display</span>
        </div>

        <div className="display-hero-grid">
          <div className="display-clock">
            <div className="display-clock-time">{viewModel.clockTimeLabel}</div>
            <div className="display-clock-date">{viewModel.clockDateLabel}</div>
            <div className="display-hero-summary">
              <span>{viewModel.todayEventCount} events on deck</span>
              <span>{viewModel.boardCount} board items visible</span>
            </div>
          </div>

          <article className="display-focus-card" data-testid="display-now-section">
            <div className="display-section-kicker">Now</div>
            <h2 className="display-section-title">What is already in motion</h2>
            {viewModel.nowItems.length > 0 ? (
              <div className="display-now-stack">
                {viewModel.nowItems.map((item) => (
                  <DisplayNowCard item={item} key={item.key} />
                ))}
              </div>
            ) : (
              <EmptyState
                className="display-empty-state"
                title="Calm right now"
                message="Nothing active is pulling attention at this moment."
              />
            )}
          </article>

          <article className="display-focus-card display-focus-card-next" data-testid="display-next-section">
            <div className="display-section-kicker">Next</div>
            <h2 className="display-section-title">What the household should expect next</h2>
            {viewModel.nextItem ? (
              <div className="display-next-block">
                <div className="display-next-time">{viewModel.nextItem.timeLabel}</div>
                <div className="display-next-title">{viewModel.nextItem.title}</div>
                <div className="display-next-meta">
                  {viewModel.nextItem.relativeLabel ? (
                    <span className="display-inline-note">{viewModel.nextItem.relativeLabel}</span>
                  ) : null}
                  <span className="display-inline-note">{viewModel.nextItem.dayLabel}</span>
                </div>
                {viewModel.nextItem.description ? (
                  <p className="display-next-description">{viewModel.nextItem.description}</p>
                ) : null}
                <HouseholdMetaBadges
                  kind={viewModel.nextItem.kind}
                  sourceLabel={viewModel.nextItem.sourceLabel}
                  urgencyState={viewModel.nextItem.urgencyState}
                />
              </div>
            ) : (
              <EmptyState
                className="display-empty-state"
                title="Open runway"
                message="No timed blocks are queued next in the current display window."
              />
            )}
          </article>
        </div>
      </section>

      <section className="display-main-grid">
        <article className="display-panel" data-testid="display-today-section">
          <div className="display-panel-header">
            <div>
              <div className="display-section-kicker">Today</div>
              <h2 className="display-section-title">The rest of today at a glance</h2>
            </div>
            <div className="display-chip-list">
              <span className="display-chip">{viewModel.todayLabel}</span>
              <span className="display-chip">{viewModel.presentationMode}</span>
              <span className="display-chip">{viewModel.agendaDensityMode}</span>
            </div>
          </div>

          {viewModel.allDayItems.length > 0 ? (
            <div className="display-anchor-strip">
              <div className="display-anchor-label">All day</div>
              <div className="display-chip-list">
                {viewModel.allDayItems.map((item) => (
                  <span className="display-chip" key={item.key}>
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <DisplayAgendaList
            emptyMessage="Nothing else is scheduled for the rest of today."
            emptyTitle="The day opens up after this"
            items={viewModel.todayAgenda.slice(0, todayAgendaLimit)}
          />
        </article>

        <article className="display-panel" data-testid="display-board-section">
          <div className="display-panel-header">
            <div>
              <div className="display-section-kicker">Board</div>
              <h2 className="display-section-title">Household board</h2>
            </div>
            <span className="display-inline-note">Reminders, chores, and pinned notes</span>
          </div>

          <div className="display-board-grid">
            <section className="display-board-column">
              <h3>Reminders</h3>
              <DisplayReminderBoard items={viewModel.reminders} />
            </section>

            <section className="display-board-column">
              <h3>Chores</h3>
              <DisplayChoreBoard items={viewModel.chores} />
            </section>

            <section className="display-board-column">
              <h3>Pinned notes</h3>
              <DisplayNoteBoard items={viewModel.notes} />
            </section>
          </div>
        </article>
      </section>

      <article className="display-panel">
        <div className="display-panel-header">
          <div>
            <div className="display-section-kicker">Coming next</div>
            <h2 className="display-section-title">How the next few days are shaping up</h2>
          </div>
          <span className="display-inline-note">Ambient rhythm across the upcoming window</span>
        </div>

        {viewModel.upcomingDays.length > 0 ? (
          <div className="display-upcoming-grid">
            {viewModel.upcomingDays.slice(0, upcomingDayLimit).map((day) => (
              <div className="display-upcoming-card" key={day.date}>
                <div className="display-upcoming-card-head">
                  <strong>{day.label}</strong>
                  <span className="display-chip">{day.items.length}</span>
                </div>
                <DisplayAgendaList
                  emptyMessage="Nothing scheduled here yet."
                  emptyTitle="Open day"
                  items={day.items}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="display-empty-state"
            title="A quieter week"
            message="No upcoming day groups are visible beyond today in this display window."
          />
        )}
      </article>

      <footer className="display-footer">
        <span>{surfaceState.status === "stale" ? "Showing last good household board" : "Live household board"}</span>
        <span>Token {viewModel.accessTokenHint ?? token.slice(0, 8)}</span>
        <span>{surfaceState.lastRefreshedAtUtc ? `Refreshed ${viewModel.generatedLabel}` : "Refreshing"}</span>
        {isPending ? <span>Syncing</span> : null}
      </footer>
    </section>
  );
}
