"use client";

import Link from "next/link";
import { useFoodHubContext } from "../food-hub-context";

export function CookingTab() {
  const { data } = useFoodHubContext();

  return (
    <article className="panel" data-testid="food-cooking-panel">
      <div className="eyebrow">Cooking</div>
      <h2>Active sessions</h2>
      {data.activeCookingSessions.length === 0 ? (
        <p className="muted" style={{ marginTop: "12px" }}>
          Start cooking from a recipe or meal plan to get total ingredients, recipe switching, pantry-aware deductions, and TV mode.
        </p>
      ) : (
        <div className="stack-list" style={{ marginTop: "12px" }}>
          {data.activeCookingSessions.map((session: any) => (
            <div className="stack-card" data-testid={`food-active-session-${session.id}`} key={session.id}>
              <div className="stack-card-header">
                <div style={{ flex: 1 }}>
                  <strong>{session.title}</strong>
                  <div className="muted">
                    {session.focusedRecipeTitle ? `${session.focusedRecipeTitle} • ` : ""}
                    Step {session.currentStepIndex + 1} of {session.totalStepCount} • {session.checkedIngredientCount}/{session.totalIngredientCount} ingredients resolved
                  </div>
                </div>
                <span className="pill">{session.recipeCount} recipes</span>
              </div>
              <div className="action-row">
                <Link
                  className="action-button"
                  data-testid={`food-active-session-open-mobile-${session.id}`}
                  href={`/app/food/cooking/${session.id}`}
                >
                  Open mobile mode
                </Link>
                <Link
                  className="food-secondary-button"
                  data-testid={`food-active-session-open-tv-${session.id}`}
                  href={`/app/food/cooking/${session.id}/tv`}
                >
                  Open TV mode
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
