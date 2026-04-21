"use client";

import { Suspense } from "react";
import { AuthStatusPanel } from "./auth-status-panel";
import { FoodSummaryPanel } from "./food-summary-panel";
import { AgendaPanel } from "./overview-tabs/agenda-panel";
import { ChoresPanel } from "./overview-tabs/chores-panel";
import { NotesPanel } from "./overview-tabs/notes-panel";
import { OverviewProvider, useOverviewContext } from "./overview-tabs/overview-context";
import { TodayPanel } from "./overview-tabs/today-panel";
import {
  Card,
  EmptyState,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  StatusMessage,
  SubTabs,
  useWorkspaceQueryState
} from "@/components/ui";

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
    <PageContainer>
      {error ? (
        <StatusMessage aria-live="polite" message={error} variant="danger" />
      ) : null}

      {successMessage ? (
        <StatusMessage aria-live="polite" message={successMessage} variant="success" />
      ) : null}

      <PageHeader
        className="space-y-5"
        data-testid="overview-workspace"
        description="Today, chores, notes, and agenda stay grouped in one member-facing workspace."
        eyebrow="Overview"
        title="Household at a glance"
      >
        <SubTabs
          tabs={[...OVERVIEW_TABS]}
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Overview tabs"
        />
      </PageHeader>

      {isLoading ? (
        <Card aria-busy="true">
          <LoadingSpinner label="Loading overview workspace..." />
        </Card>
      ) : data ? (
        <div className="tab-content-enter space-y-6">{content}</div>
      ) : (
        <Card>
          <EmptyState message="Sign in to see your household home." />
        </Card>
      )}

      <section className="space-y-4">
        <FoodSummaryPanel />
        <AuthStatusPanel />
      </section>
    </PageContainer>
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
