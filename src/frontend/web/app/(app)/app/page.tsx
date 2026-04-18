import { AuthStatusPanel } from "../../../components/auth-status-panel";
import { FoodSummaryPanel } from "../../../components/food-summary-panel";
import { HouseholdHome } from "../../../components/household-home";

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
      <FoodSummaryPanel />

      <div className="section-spacer" />
      <AuthStatusPanel />
    </>
  );
}
