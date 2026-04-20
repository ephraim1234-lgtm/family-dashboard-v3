"use client";

import { useState } from "react";
import { useFoodHubContext } from "../food-hub-context";
import { SubTabs } from "@/components/ui";

export function MealPlanningWorkspace() {
  const {
    buildFieldTestId,
    mealDate,
    setMealDate,
    mealSlotName,
    setMealSlotName,
    mealTitle,
    setMealTitle,
    mealNotes,
    setMealNotes,
    mealRows,
    setMealRows,
    recipeLibrary,
    generateShopping,
    setGenerateShopping,
    isPending,
    setError,
    startTransition,
    handlePlanMeal,
    data,
    formatDate,
    setActiveModuleTab,
    setShoppingTab,
    setShoppingMealFilterId,
    handleStartCooking
  } = useFoodHubContext();
  const [planningTab, setPlanningTab] = useState<"composer" | "upcoming">("composer");

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Meal planning</div>
          <h2>Plan meals, then review coverage separately</h2>
          <SubTabs
            tabs={[
              { id: "composer", label: "Plan meal" },
              { id: "upcoming", label: "Upcoming meals" }
            ]}
            activeTab={planningTab}
            onChange={setPlanningTab}
            ariaLabel="Meal planning tabs"
          />
        </article>
      </section>

      <section className="grid food-section-grid">
        {planningTab === "composer" ? (
          <article className="panel" data-testid="food-meal-planning">
            <div className="eyebrow">Meal planning</div>
            <h2>Build a real meal, not just a single recipe slot</h2>
            <div className="grid" style={{ marginTop: "12px" }}>
              <div className="field">
                <span>Date</span>
                <input
                  aria-label="Meal date"
                  data-testid={buildFieldTestId("food-meal", "date")}
                  type="date"
                  value={mealDate}
                  onChange={(event) => setMealDate(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Slot</span>
                <input
                  aria-label="Meal slot"
                  data-testid={buildFieldTestId("food-meal", "slot")}
                  value={mealSlotName}
                  onChange={(event) => setMealSlotName(event.target.value)}
                />
              </div>
              <div className="field">
                <span>Meal title</span>
                <input
                  aria-label="Meal title"
                  data-testid={buildFieldTestId("food-meal", "title")}
                  value={mealTitle}
                  onChange={(event) => setMealTitle(event.target.value)}
                  placeholder="Taco night"
                />
              </div>
            </div>
            <div className="field">
              <span>Notes</span>
              <input
                aria-label="Meal notes"
                data-testid={buildFieldTestId("food-meal", "notes")}
                value={mealNotes}
                onChange={(event) => setMealNotes(event.target.value)}
              />
            </div>
            <div className="stack-list" style={{ marginTop: "12px" }}>
              {mealRows.map((row: any, index: number) => (
                <div className="stack-card" data-testid={`food-meal-row-${index}`} key={`meal-row-${index}`}>
                  <div className="grid">
                    <div className="field">
                      <span>Recipe</span>
                      <select
                        aria-label={`Meal recipe ${index + 1}`}
                        data-testid={`food-meal-recipe-${index}`}
                        value={row.recipeId}
                        onChange={(event) => setMealRows((current: any[]) => current.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, recipeId: event.target.value } : item))}
                      >
                        <option value="">Choose a recipe</option>
                        {recipeLibrary.map((recipe: any) => (
                          <option key={recipe.id} value={recipe.id}>{recipe.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <span>Role</span>
                      <select
                        aria-label={`Meal role ${index + 1}`}
                        data-testid={`food-meal-role-${index}`}
                        value={row.role}
                        onChange={(event) => setMealRows((current: any[]) => current.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, role: event.target.value } : item))}
                      >
                        <option value="Main">Main</option>
                        <option value="Side">Side</option>
                        <option value="Sauce">Sauce</option>
                        <option value="Dessert">Dessert</option>
                        <option value="Drink">Drink</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="action-row">
              <button
                className="pill-button"
                type="button"
                data-testid="food-meal-add-recipe"
                onClick={() => setMealRows((current: any[]) => [...current, {
                  recipeId: recipeLibrary[0]?.id ?? "",
                  role: "Side"
                }])}
              >
                + Add recipe to meal
              </button>
              <label className="checkbox-field">
                <input
                  aria-label="Draft missing shopping items"
                  data-testid={buildFieldTestId("food-meal", "generate-shopping")}
                  type="checkbox"
                  checked={generateShopping}
                  onChange={(event) => setGenerateShopping(event.target.checked)}
                />
                Draft missing shopping items
              </label>
            </div>
            <div className="action-row">
              <button
                className="action-button"
                data-testid="food-meal-save"
                disabled={isPending || !mealDate || mealRows.every((row: any) => !row.recipeId)}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handlePlanMeal().catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to plan meal.");
                    });
                  });
                }}
              >
                Save meal
              </button>
            </div>
          </article>
        ) : null}

        {planningTab === "upcoming" ? (
          <article className="panel" data-testid="food-meal-upcoming">
            <div className="eyebrow">Upcoming meals</div>
            <h2>Track coverage and jump into shopping or cooking</h2>
            {data.upcomingMeals.length > 0 ? (
              <div className="stack-list" style={{ marginTop: "16px" }}>
                {data.upcomingMeals.map((slot: any) => (
                  <div className="stack-card" data-testid={`food-meal-slot-${slot.id}`} key={slot.id}>
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{slot.title}</strong>
                        <div className="muted">{formatDate(slot.date)} - {slot.slotName}</div>
                      </div>
                      <div className="action-row">
                        <button
                          className="pill-button"
                          type="button"
                          onClick={() => {
                            setActiveModuleTab("shopping");
                            setShoppingTab("active");
                            setShoppingMealFilterId(slot.id);
                          }}
                        >
                          Shopping {slot.shoppingOpenIngredientCount}/{slot.shoppingTotalIngredientCount}
                        </button>
                        <button
                          className="pill-button"
                          data-testid={`food-meal-slot-cook-${slot.id}`}
                          onClick={() => {
                            setError(null);
                            startTransition(() => {
                              handleStartCooking({ mealPlanSlotId: slot.id }).catch((err: unknown) => {
                                setError(err instanceof Error ? err.message : "Unable to start meal cooking.");
                              });
                            });
                          }}
                        >
                          Cook meal
                        </button>
                      </div>
                    </div>
                    <div className="pill-row">
                      {slot.recipes.map((recipe: any) => (
                        <span className="pill" key={recipe.id}>{recipe.role}: {recipe.title}</span>
                      ))}
                    </div>
                    {slot.notes ? <div className="muted">{slot.notes}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: "12px" }}>
                Upcoming meals will appear here once you save a plan.
              </p>
            )}
          </article>
        ) : null}
      </section>
    </>
  );
}
