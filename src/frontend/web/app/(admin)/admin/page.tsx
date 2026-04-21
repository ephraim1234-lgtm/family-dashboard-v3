"use client";

import { Suspense } from "react";
import { Card, PageContainer, PageHeader, SubTabs, useWorkspaceQueryState } from "@/components/ui";
import { AdminAccessPanel } from "../../../components/admin-access-panel";
import { AdminChoreInsightsPanel } from "../../../components/admin-chore-insights-panel";
import { AdminCalendarIntegrationsPanel } from "../../../components/admin-calendar-integrations-panel";
import { AdminChoresPanel } from "../../../components/admin-chores-panel";
import { AdminDisplayManagementPanel } from "../../../components/admin-display-management-panel";
import { AdminHouseholdSettingsPanel } from "../../../components/admin-household-settings-panel";
import { AdminMembersPanel } from "../../../components/admin-members-panel";
import { AdminNotesPanel } from "../../../components/admin-notes-panel";
import { AdminRemindersPanel } from "../../../components/admin-reminders-panel";
import { AdminSchedulingWorkspace } from "../../../components/admin-scheduling-workspace";
import { AdminStatsPanel } from "../../../components/admin-stats-panel";

type AdminTab = "overview" | "household" | "chores" | "notes" | "scheduling" | "display";

const ADMIN_TABS = [
  { id: "overview", label: "Overview" },
  { id: "household", label: "Household" },
  { id: "chores", label: "Chores" },
  { id: "notes", label: "Notes" },
  { id: "scheduling", label: "Scheduling" },
  { id: "display", label: "Display" }
] as const;

function AdminPageBody() {
  const { workspace: tab, setWorkspace: setTab } = useWorkspaceQueryState(
    ADMIN_TABS.map((item) => item.id),
    "overview"
  );

  return (
    <PageContainer>
      <PageHeader
        className="space-y-5 ui-card-admin"
        description="Owner-gated workflows over core household domains."
        eyebrow="Admin"
        title="Administration"
      >
        <SubTabs
          tabs={[...ADMIN_TABS]}
          activeTab={tab}
          onChange={setTab}
          ariaLabel="Admin tabs"
        />
      </PageHeader>

      <div className="tab-content-enter space-y-6" data-testid="admin-workspace">
        {tab === "overview" ? (
          <>
            <AdminStatsPanel />
            <AdminAccessPanel />
          </>
        ) : null}

        {tab === "household" ? (
          <>
            <AdminHouseholdSettingsPanel />
            <AdminMembersPanel />
          </>
        ) : null}

        {tab === "chores" ? (
          <>
            <AdminChoresPanel />
            <AdminChoreInsightsPanel />
          </>
        ) : null}

        {tab === "notes" ? <AdminNotesPanel /> : null}

        {tab === "scheduling" ? (
          <>
            <AdminCalendarIntegrationsPanel />
            <AdminSchedulingWorkspace />
            <AdminRemindersPanel />
          </>
        ) : null}

        {tab === "display" ? <AdminDisplayManagementPanel /> : null}
      </div>
    </PageContainer>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Card aria-busy="true">Loading admin workspace...</Card>}>
      <AdminPageBody />
    </Suspense>
  );
}
