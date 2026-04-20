"use client";

import { useFoodHubContext } from "../food-hub-context";

export function DashboardTab() {
  const { data, isPending, startTransition, handleStartCooking, setError } = useFoodHubContext();

  return (
    <>
      <section className="grid food-hero-grid" data-testid="food-hub-dashboard">
        <article className="panel" data-testid="food-overview-panel">
          <div className="eyebrow">Food hub</div>
          <h2>Household food operating system</h2>
          <p className="muted">
            Pantry, recipes, shopping, meal planning, and cooking stay connected here.
          </p>
          <div className="summary-grid mt-4">
            <div className="stack-card">
              <div className="eyebrow">Recipes</div>
              <div className="summary-stat">{data.summary.recipeCount}</div>
            </div>
            <div className="stack-card">
              <div className="eyebrow">Pantry</div>
              <div className="summary-stat">{data.summary.pantryItemCount}</div>
            </div>
            <div className="stack-card">
              <div className="eyebrow">Shopping</div>
              <div className="summary-stat">{data.summary.shoppingItemCount}</div>
            </div>
            <div className="stack-card">
              <div className="eyebrow">Cooking now</div>
              <div className="summary-stat">{data.summary.activeCookingSessionCount}</div>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="eyebrow">Tonight</div>
          <h2>{data.tonightCookView?.title ?? "No dinner planned yet"}</h2>
          <p className="muted mt-2">
            {data.tonightCookView?.reason ?? "Plan a meal, generate shopping gaps, and jump straight into cooking mode."}
          </p>
          {data.tonightCookView?.plannedRecipeTitles?.length ? (
            <div className="pill-row mt-3">
              {data.tonightCookView.plannedRecipeTitles.map((title: string) => (
                <span className="pill" key={title}>
                  {title}
                </span>
              ))}
            </div>
          ) : null}
          {data.tonightCookView?.missingIngredients.length ? (
            <div className="stack-list mt-3">
              {data.tonightCookView.missingIngredients.map((item: string) => (
                <div className="stack-card" key={item}>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {data.tonightCookView?.mealPlanSlotId ? (
            <div className="action-row">
              <button
                className="action-button"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    handleStartCooking({ mealPlanSlotId: data.tonightCookView.mealPlanSlotId }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to start cooking.");
                    });
                  });
                }}
              >
                Cook tonight
              </button>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
}
