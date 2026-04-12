import { AuthStatusPanel } from "../../../components/auth-status-panel";
import { MyChoresPanel } from "../../../components/my-chores-panel";
import { UpcomingAgendaPanel } from "../../../components/upcoming-agenda-panel";

export default function AppHomePage() {
  return (
    <>
      <section className="grid">
        <article className="panel">
          <h2>Welcome</h2>
          <p className="muted">
            Your household schedule for the next two weeks.
          </p>
        </article>
      </section>

      <div className="section-spacer" />
      <AuthStatusPanel />

      <div className="section-spacer" />
      <MyChoresPanel />

      <div className="section-spacer" />
      <UpcomingAgendaPanel />
    </>
  );
}
