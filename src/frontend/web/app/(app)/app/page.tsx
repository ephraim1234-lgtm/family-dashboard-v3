import { AuthStatusPanel } from "../../../components/auth-status-panel";

export default function AppHomePage() {
  return (
    <>
      <section className="grid">
        <article className="panel">
          <h2>Current scope</h2>
          <div className="pill-row">
            <span className="pill">Households</span>
            <span className="pill">Scheduling</span>
            <span className="pill">Recurrence-ready</span>
            <span className="pill">Display-aware</span>
          </div>
        </article>

        <article className="panel">
          <h2>App shell intent</h2>
          <p className="muted">
            This route group is reserved for normal authenticated member flows.
            It is intentionally separate from admin workflows and kiosk display
            access.
          </p>
        </article>
      </section>

      <div className="section-spacer" />
      <AuthStatusPanel />
    </>
  );
}
