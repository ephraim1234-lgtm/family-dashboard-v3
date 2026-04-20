"use client";

import { useState } from "react";
import { OverflowMenu } from "@/components/ui";
import { useFoodHubContext } from "../food-hub-context";

export function RecipeLibraryWorkspace({ hideHeader = false }: { hideHeader?: boolean }) {
  const {
    recipeLibrary,
    buildFieldTestId,
    recipeQuery,
    setRecipeQuery,
    formatTimestamp,
    setSelectedRecipeId,
    setRecipeWorkspaceTab,
    isPending,
    setError,
    startTransition,
    handleStartCooking,
    handlePlanMealFromRecipe,
    startEditingRecipeById,
    handleRecipeAddToShoppingList,
    setDeleteTarget
  } = useFoodHubContext();
  const [plannerOpenId, setPlannerOpenId] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedSlot, setPlannedSlot] = useState("Dinner");

  return (
    <article className={hideHeader ? "" : "panel"} data-testid="food-recipe-library">
      {!hideHeader ? (
        <>
          <div className="eyebrow">Recipe library</div>
          <div className="stack-card-header">
            <h2 style={{ margin: 0 }}>Shared household recipes</h2>
            <span className="pill">{recipeLibrary.length} shown</span>
          </div>
        </>
      ) : null}
      <div className="field" style={{ marginTop: hideHeader ? 0 : "12px" }}>
        <span>Search</span>
        <input
          aria-label="Recipe search"
          data-testid={buildFieldTestId("food-recipe-library", "search")}
          value={recipeQuery}
          onChange={(event) => setRecipeQuery(event.target.value)}
          placeholder="weeknight, chicken, lunch"
        />
      </div>
      {recipeLibrary.length > 0 ? (
        <div className="stack-list" style={{ marginTop: "14px" }}>
          {recipeLibrary.map((recipe: any) => {
            const plannerOpen = plannerOpenId === recipe.id;

            return (
              <div className="stack-card" data-testid={`food-recipe-library-item-${recipe.id}`} key={recipe.id}>
                <div className="stack-card-header">
                  <div style={{ flex: 1 }}>
                    <button
                      className="text-left"
                      data-testid={`food-recipe-library-view-${recipe.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedRecipeId(recipe.id);
                        setRecipeWorkspaceTab("detail");
                      }}
                    >
                      <strong>{recipe.title}</strong>
                    </button>
                    <div className="muted">
                      {recipe.ingredientCount} ingredients · {recipe.stepCount} steps · updated {formatTimestamp(recipe.updatedAtUtc)}
                    </div>
                  </div>
                  <OverflowMenu
                    items={[
                      {
                        label: "Edit",
                        onClick: () => {
                          setError(null);
                          startTransition(() => {
                            startEditingRecipeById(recipe.id).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : "Unable to open recipe editor.");
                            });
                          });
                        }
                      },
                      {
                        label: "Share",
                        onClick: () => {
                          void navigator.clipboard?.writeText(`${window.location.origin}/app/food`);
                        }
                      },
                      {
                        label: "Add ingredients to shopping list",
                        onClick: () => {
                          setError(null);
                          startTransition(() => {
                            handleRecipeAddToShoppingList(recipe.id).catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : "Unable to add recipe ingredients.");
                            });
                          });
                        }
                      },
                      {
                        label: "Delete",
                        danger: true,
                        onClick: () => setDeleteTarget({ kind: "recipe", id: recipe.id, title: recipe.title })
                      }
                    ]}
                  />
                </div>
                <div className="pill-row">
                  {recipe.tags ? <span className="pill">{recipe.tags}</span> : null}
                  {recipe.yieldText ? <span className="pill">{recipe.yieldText}</span> : null}
                  {recipe.sourceLabel ? <span className="pill">{recipe.sourceLabel}</span> : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    className="btn min-h-[44px]"
                    type="button"
                    onClick={() => setPlannerOpenId((current) => current === recipe.id ? null : recipe.id)}
                  >
                    Add to Meal Plan
                  </button>
                  <button
                    className="btn btn-primary min-h-[44px]"
                    data-testid={`food-recipe-library-cook-${recipe.id}`}
                    disabled={isPending}
                    type="button"
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleStartCooking({ recipeId: recipe.id }).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to start cooking.");
                        });
                      });
                    }}
                  >
                    Cook Now
                  </button>
                </div>
                {plannerOpen ? (
                  <div className="mt-3 grid gap-3 rounded-box border border-base-300 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input className="input input-bordered min-h-[44px]" type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
                      <select className="select select-bordered min-h-[44px]" value={plannedSlot} onChange={(event) => setPlannedSlot(event.target.value)}>
                        <option>Breakfast</option>
                        <option>Lunch</option>
                        <option>Dinner</option>
                        <option>Snack</option>
                      </select>
                    </div>
                    <button
                      className="btn btn-primary min-h-[44px]"
                      disabled={isPending || !plannedDate}
                      type="button"
                      onClick={() => {
                        setError(null);
                        startTransition(() => {
                          handlePlanMealFromRecipe(recipe.id, plannedDate, plannedSlot)
                            .then(() => setPlannerOpenId(null))
                            .catch((err: unknown) => {
                              setError(err instanceof Error ? err.message : "Unable to add to meal plan.");
                            });
                        });
                      }}
                    >
                      Save to Meal Plan
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
