"use client";

import { Suspense } from "react";
import { Card, SubTabs, useWorkspaceQueryState } from "@/components/ui";
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
    <section className="space-y-6">
      <Card className="space-y-5">
        <div className="space-y-3">
          <div className="eyebrow">Admin</div>
          <h2 className="text-3xl font-semibold tracking-tight">Administration</h2>
          <p className="muted max-w-3xl">
            Owner-gated workflows over core household domains.
          </p>
        </div>
        <SubTabs
          tabs={[...ADMIN_TABS]}
          activeTab={tab}
          onChange={setTab}
          ariaLabel="Admin tabs"
        />
      </Card>

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
    </section>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Card aria-busy="true">Loading admin workspace...</Card>}>
      <AdminPageBody />
    </Suspense>
  );
}
