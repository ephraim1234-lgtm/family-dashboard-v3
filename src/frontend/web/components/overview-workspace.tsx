"use client";

import { useState } from "react";
import { AuthStatusPanel } from "./auth-status-panel";
import { FoodSummaryPanel } from "./food-summary-panel";
import { AgendaPanel } from "./overview-tabs/agenda-panel";
import { ChoresPanel } from "./overview-tabs/chores-panel";
import { NotesPanel } from "./overview-tabs/notes-panel";
import { OverviewProvider, useOverviewContext } from "./overview-tabs/overview-context";
import { TodayPanel } from "./overview-tabs/today-panel";
import { LoadingSpinner, SubTabs } from "@/components/ui";

type OverviewTab = "today" | "chores" | "notes" | "agenda";

const OVERVIEW_TABS = [
  { id: "today", label: "Today" },
  { id: "chores", label: "Chores" },
  { id: "notes", label: "Notes" },
  { id: "agenda", label: "Agenda" }
] as const;

function OverviewWorkspaceBody() {
  const [activeTab, setActiveTab] = useState<OverviewTab>("today");
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
    <>
      {error ? (
        <section className="grid" aria-live="polite">
          <article className="panel">
            <p className="error-text" role="alert">{error}</p>
          </article>
        </section>
      ) : null}

      {successMessage ? (
        <section className="grid" aria-live="polite">
          <article className="panel">
            <p className="success-text">{successMessage}</p>
          </article>
        </section>
      ) : null}

      <section className="grid" data-testid="overview-workspace">
        <article className="panel">
          <div className="eyebrow">Overview</div>
          <h2>Household at a glance</h2>
          <p className="muted">
            Today, chores, notes, and agenda stay grouped in one member-facing workspace.
          </p>
          <SubTabs
            tabs={[...OVERVIEW_TABS]}
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Overview tabs"
          />
        </article>
      </section>

      {isLoading ? (
        <>
          <div className="section-spacer" />
          <section className="grid" aria-busy="true">
            <article className="panel">
              <LoadingSpinner label="Loading overview workspace…" />
            </article>
          </section>
        </>
      ) : data ? (
        <div className="tab-content-enter">{content}</div>
      ) : (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <p className="muted">Sign in to see your household home.</p>
            </article>
          </section>
        </>
      )}

      <div className="section-spacer" />
      <FoodSummaryPanel />

      <div className="section-spacer" />
      <AuthStatusPanel />
    </>
  );
}

export function OverviewWorkspace() {
  return (
    <OverviewProvider>
      <OverviewWorkspaceBody />
    </OverviewProvider>
  );
}
