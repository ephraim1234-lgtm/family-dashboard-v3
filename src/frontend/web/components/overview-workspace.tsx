"use client";

import { Suspense } from "react";
import { AuthStatusPanel } from "./auth-status-panel";
import { FoodSummaryPanel } from "./food-summary-panel";
import { AgendaPanel } from "./overview-tabs/agenda-panel";
import { ChoresPanel } from "./overview-tabs/chores-panel";
import { NotesPanel } from "./overview-tabs/notes-panel";
import { OverviewProvider, useOverviewContext } from "./overview-tabs/overview-context";
import { TodayPanel } from "./overview-tabs/today-panel";
import { Card, LoadingSpinner, SubTabs, useWorkspaceQueryState } from "@/components/ui";

type OverviewTab = "today" | "chores" | "notes" | "agenda";

const OVERVIEW_TABS = [
  { id: "today", label: "Today" },
  { id: "chores", label: "Chores" },
  { id: "notes", label: "Notes" },
  { id: "agenda", label: "Agenda" }
] as const;

function OverviewWorkspaceBody() {
  const { workspace: activeTab, setWorkspace: setActiveTab } = useWorkspaceQueryState(
    OVERVIEW_TABS.map((tab) => tab.id),
    "today"
  );
  const { data, isLoading, error, successMessage } = useOverviewContext();

  const content = (() => {
    switch (activeTab) {
      case "chores":
        return <ChoresPanel />;
      case "notes":
        return <NotesPanel />;
      case "agenda":
        return <AgendaPanel />;
      case "today":
      default:
        return <TodayPanel />;
    }
  })();

  return (
    <section className="space-y-6">
      {error ? (
        <div className="ui-alert ui-alert-danger shadow-sm" aria-live="polite" role="alert">
          <span>{error}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div className="ui-alert ui-alert-success shadow-sm" aria-live="polite">
          <span>{successMessage}</span>
        </div>
      ) : null}

      <Card className="space-y-5" data-testid="overview-workspace">
        <div className="space-y-3">
          <div className="eyebrow">Overview</div>
          <h2 className="text-3xl font-semibold tracking-tight">Household at a glance</h2>
          <p className="muted max-w-3xl">
            Today, chores, notes, and agenda stay grouped in one member-facing workspace.
          </p>
        </div>
        <SubTabs
          tabs={[...OVERVIEW_TABS]}
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Overview tabs"
        />
      </Card>

      {isLoading ? (
        <Card aria-busy="true">
          <LoadingSpinner label="Loading overview workspace..." />
        </Card>
      ) : data ? (
        <div className="tab-content-enter space-y-6">{content}</div>
      ) : (
        <Card>
          <p className="muted">Sign in to see your household home.</p>
        </Card>
      )}

      <section className="space-y-4">
        <FoodSummaryPanel />
        <AuthStatusPanel />
      </section>
    </section>
  );
}

export function OverviewWorkspace() {
  return (
    <OverviewProvider>
      <Suspense
        fallback={
          <Card aria-busy="true">
            <LoadingSpinner label="Loading overview workspace..." />
          </Card>
        }
      >
        <OverviewWorkspaceBody />
      </Suspense>
    </OverviewProvider>
  );
}
