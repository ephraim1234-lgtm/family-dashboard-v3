import { AddEventPanel } from "../../../components/add-event-panel";
import { AuthStatusPanel } from "../../../components/auth-status-panel";
import { HouseholdHome } from "../../../components/household-home";
import { NotesPanel } from "../../../components/notes-panel";

export default function AppHomePage() {
  return (
    <>
      <section className="grid">
        <article className="panel">
          <h2>Home</h2>
          <p className="muted">
            Your household at a glance.
          </p>
        </article>
      </section>

      <div className="section-spacer" />
      <HouseholdHome />

      <div className="section-spacer" />
      <NotesPanel />

      <div className="section-spacer" />
      <AddEventPanel />

      <div className="section-spacer" />
      <AuthStatusPanel />
    </>
  );
}
