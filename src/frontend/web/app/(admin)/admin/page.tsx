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

export default function AdminPage() {
  return (
    <>
      <section className="grid">
        <article className="panel">
          <h2>Admin responsibilities</h2>
          <div className="pill-row">
            <span className="pill">Members</span>
            <span className="pill">Household settings</span>
            <span className="pill">Display devices</span>
            <span className="pill">Coarse roles</span>
          </div>
        </article>

        <article className="panel">
          <h2>Boundary note</h2>
          <p className="muted">
            Administration is a workflow surface over core domains, not a separate
            business engine.
          </p>
        </article>
      </section>

      <div className="section-spacer" />
      <AdminStatsPanel />

      <div className="section-spacer" />
      <AdminAccessPanel />

      <div className="section-spacer" />
      <AdminHouseholdSettingsPanel />

      <div className="section-spacer" />
      <AdminMembersPanel />

      <div className="section-spacer" />
      <AdminChoresPanel />

      <div className="section-spacer" />
      <AdminChoreInsightsPanel />

      <div className="section-spacer" />
      <AdminNotesPanel />

      <div className="section-spacer" />
      <AdminCalendarIntegrationsPanel />

      <div className="section-spacer" />
      <AdminSchedulingWorkspace />

      <div className="section-spacer" />
      <AdminRemindersPanel />

      <div className="section-spacer" />
      <AdminDisplayManagementPanel />
    </>
  );
}
