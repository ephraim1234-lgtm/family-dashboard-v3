import { AdminAccessPanel } from "../../../components/admin-access-panel";
import { AdminDisplayManagementPanel } from "../../../components/admin-display-management-panel";

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
      <AdminAccessPanel />

      <div className="section-spacer" />
      <AdminDisplayManagementPanel />
    </>
  );
}
