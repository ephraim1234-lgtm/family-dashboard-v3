"use client";

import { useState } from "react";
import { SubTabs } from "@/components/ui";
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

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Admin</div>
          <h2>Administration</h2>
          <p className="muted">
            Owner-gated workflows over core household domains.
          </p>
          <SubTabs
            tabs={[...ADMIN_TABS]}
            activeTab={tab}
            onChange={setTab}
            ariaLabel="Admin tabs"
          />
        </article>
      </section>

      <div className="section-spacer" />
      <div className="tab-content-enter" data-testid="admin-workspace">
        {tab === "overview" ? (
          <>
            <AdminStatsPanel />
            <div className="section-spacer" />
            <AdminAccessPanel />
          </>
        ) : null}

        {tab === "household" ? (
          <>
            <AdminHouseholdSettingsPanel />
            <div className="section-spacer" />
            <AdminMembersPanel />
          </>
        ) : null}

        {tab === "chores" ? (
          <>
            <AdminChoresPanel />
            <div className="section-spacer" />
            <AdminChoreInsightsPanel />
          </>
        ) : null}

        {tab === "notes" ? <AdminNotesPanel /> : null}

        {tab === "scheduling" ? (
          <>
            <AdminCalendarIntegrationsPanel />
            <div className="section-spacer" />
            <AdminSchedulingWorkspace />
            <div className="section-spacer" />
            <AdminRemindersPanel />
          </>
        ) : null}

        {tab === "display" ? <AdminDisplayManagementPanel /> : null}
      </div>
    </>
  );
}
