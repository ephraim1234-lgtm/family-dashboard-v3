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
      {/* ── Overview & access ── */}
      <section className="grid">
        <article className="panel">
          <h2>Administration</h2>
          <p className="muted">
            Owner-gated workflows over core household domains.
          </p>
          <nav className="admin-section-nav" style={{ marginTop: "14px" }}>
            <a href="#overview" className="pill pill-link">Overview</a>
            <a href="#household" className="pill pill-link">Household</a>
            <a href="#chores" className="pill pill-link">Chores</a>
            <a href="#notes" className="pill pill-link">Notes</a>
            <a href="#scheduling" className="pill pill-link">Scheduling</a>
            <a href="#display" className="pill pill-link">Display</a>
          </nav>
        </article>
      </section>

      <div className="section-spacer" />
      <div id="overview" />
      <AdminStatsPanel />

      <div className="section-spacer" />
      <AdminAccessPanel />

      {/* ── Household ── */}
      <div className="section-spacer" />
      <div id="household" />
      <section className="grid">
        <article className="panel admin-section-header">
          <div className="eyebrow">Admin</div>
          <h2>Household</h2>
          <p className="muted">Settings and members</p>
        </article>
      </section>

      <div className="section-spacer" />
      <AdminHouseholdSettingsPanel />

      <div className="section-spacer" />
      <AdminMembersPanel />

      {/* ── Chores & Routines ── */}
      <div className="section-spacer" />
      <div id="chores" />
      <section className="grid">
        <article className="panel admin-section-header">
          <div className="eyebrow">Admin</div>
          <h2>Chores &amp; routines</h2>
          <p className="muted">Manage chores, view completion insights</p>
        </article>
      </section>

      <div className="section-spacer" />
      <AdminChoresPanel />

      <div className="section-spacer" />
      <AdminChoreInsightsPanel />

      {/* ── Notes ── */}
      <div className="section-spacer" />
      <div id="notes" />
      <section className="grid">
        <article className="panel admin-section-header">
          <div className="eyebrow">Admin</div>
          <h2>Notes</h2>
          <p className="muted">Pin, edit, and manage household notes</p>
        </article>
      </section>

      <div className="section-spacer" />
      <AdminNotesPanel />

      {/* ── Scheduling ── */}
      <div className="section-spacer" />
      <div id="scheduling" />
      <section className="grid">
        <article className="panel admin-section-header">
          <div className="eyebrow">Admin</div>
          <h2>Scheduling</h2>
          <p className="muted">Calendar integrations, events, and reminders</p>
        </article>
      </section>

      <div className="section-spacer" />
      <AdminCalendarIntegrationsPanel />

      <div className="section-spacer" />
      <AdminSchedulingWorkspace />

      <div className="section-spacer" />
      <AdminRemindersPanel />

      {/* ── Display ── */}
      <div className="section-spacer" />
      <div id="display" />
      <section className="grid">
        <article className="panel admin-section-header">
          <div className="eyebrow">Admin</div>
          <h2>Display</h2>
          <p className="muted">Kiosk device management and projection settings</p>
        </article>
      </section>

      <div className="section-spacer" />
      <AdminDisplayManagementPanel />
    </>
  );
}
