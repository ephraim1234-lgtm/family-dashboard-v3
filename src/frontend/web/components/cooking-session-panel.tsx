"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RecipeChangeSuggestion = {
  hasMeaningfulChanges: boolean;
  changedIngredientCount: number;
  changedIngredients: string[];
};

type CookingSessionIngredient = {
  id: string;
  cookingSessionRecipeId: string | null;
  position: number;
  ingredientName: string;
  plannedQuantity: number | null;
  plannedUnit: string | null;
  actualQuantity: number | null;
  actualUnit: string | null;
  notes: string | null;
  isChecked: boolean;
  isSkipped: boolean;
  pantryDeductedQuantity: number | null;
  pantryDeductionStatus: string;
};

type CookingSessionStep = {
  id: string;
  cookingSessionRecipeId: string | null;
  position: number;
  instruction: string;
  notes: string | null;
  isCompleted: boolean;
};

type TotalIngredient = {
  groupKey: string;
  ingredientName: string;
  plannedQuantity: number | null;
  plannedUnit: string | null;
  actualQuantity: number | null;
  actualUnit: string | null;
  pantryDeductedQuantity: number | null;
  checkedCount: number;
  totalCount: number;
  isChecked: boolean;
  sessionIngredientIds: string[];
};

type CookingSessionRecipe = {
  id: string;
  recipeId: string;
  recipeRevisionId: string;
  role: string;
  title: string;
  currentStepIndex: number;
  currentStepInstruction: string | null;
  nextStepInstruction: string | null;
  recipeChangeSuggestion: RecipeChangeSuggestion;
  ingredients: CookingSessionIngredient[];
  steps: CookingSessionStep[];
};

type CookingSession = {
  id: string;
  mealPlanSlotId: string | null;
  title: string;
  status: string;
  pantryUpdateMode: string;
  focusedCookingSessionRecipeId: string | null;
  focusedRecipeTitle: string | null;
  recipeCount: number;
  currentStepInstruction: string | null;
  nextStepInstruction: string | null;
  recipeChangeSuggestion: RecipeChangeSuggestion;
  pantryImpactPreview: {
    mode: string;
    appliedCount: number;
    needsReviewCount: number;
    items: Array<{
      sessionIngredientId: string;
      ingredientName: string;
      plannedQuantity: number | null;
      plannedUnit: string | null;
      actualQuantity: number | null;
      actualUnit: string | null;
      pantryDeductedQuantity: number | null;
      pantryDeductionStatus: string;
    }>;
  };
  totalIngredients: TotalIngredient[];
  recipes: CookingSessionRecipe[];
};

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity == null && !unit) return "No amount set";
  if (quantity == null) return unit ?? "";
  return `${quantity}${unit ? ` ${unit}` : ""}`;
}

export function CookingSessionPanel({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<CookingSession | null>(null);
  const [dismissedRecipeIds, setDismissedRecipeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<"step" | "scroll">("step");
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingIngredientName, setEditingIngredientName] = useState("");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepInstruction, setEditingStepInstruction] = useState("");

  const focusedRecipe = useMemo(() => {
    if (!session) return null;
    return session.recipes.find((recipe) => recipe.id === session.focusedCookingSessionRecipeId) ?? session.recipes[0] ?? null;
  }, [session]);

  async function loadSession() {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Unable to load cooking session: ${response.status}`);
    }
    setSession((await response.json()) as CookingSession);
  }

  useEffect(() => {
    startTransition(() => {
      loadSession()
        .then(() => setLoading(false))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to load cooking mode.");
          setLoading(false);
        });
    });
  }, [sessionId]);

  useEffect(() => {
    const savedView = window.localStorage.getItem("householdops:cooking-view");
    if (savedView === "step" || savedView === "scroll") {
      setViewMode(savedView);
      return;
    }

    setViewMode(window.innerWidth < 768 ? "step" : "scroll");
  }, []);

  function showSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  function updateViewMode(nextViewMode: "step" | "scroll") {
    setViewMode(nextViewMode);
    window.localStorage.setItem("householdops:cooking-view", nextViewMode);
  }

  function handleBackToFood() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/app/food");
  }

  function beginIngredientEdit(ingredientId: string, ingredientName: string) {
    setEditingIngredientId(ingredientId);
    setEditingIngredientName(ingredientName);
  }

  function beginStepEdit(stepId: string, instruction: string) {
    setEditingStepId(stepId);
    setEditingStepInstruction(instruction);
  }

  async function patchSession(body: Record<string, unknown>) {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to update cooking session (${response.status}).`);
    }
    setSession((await response.json()) as CookingSession);
  }

  async function patchIngredient(
    ingredientId: string,
    body: Record<string, unknown>
  ) {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}/ingredients/${ingredientId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to update ingredient (${response.status}).`);
    }
    setSession((await response.json()) as CookingSession);
  }

  async function patchStep(stepId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}/steps/${stepId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to update step (${response.status}).`);
    }
    setSession((await response.json()) as CookingSession);
  }

  async function completeSession() {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}/complete`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyPendingPantryDeductions: true })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to complete session (${response.status}).`);
    }
    setSession((await response.json()) as CookingSession);
  }

  async function promoteRecipeChanges(cookingSessionRecipeId: string) {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}/promote`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookingSessionRecipeId })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to promote recipe changes (${response.status}).`);
    }
    showSuccess("Household default recipe updated from this cooking session.");
  }

  async function toggleTotalIngredient(totalIngredient: TotalIngredient, nextChecked: boolean) {
    await Promise.all(totalIngredient.sessionIngredientIds.map((ingredientId) =>
      patchIngredient(ingredientId, { isChecked: nextChecked, isSkipped: false })
    ));
    await loadSession();
  }

  if (loading) {
    return (
      <section className="grid" data-testid="cooking-session-loading">
        <article className="panel">
          <p className="muted">Loading mobile cooking mode...</p>
        </article>
      </section>
    );
  }

  if (!session || !focusedRecipe) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="error-text" role="alert" data-testid="cooking-alert-error">
            {error ?? "Cooking session not found."}
          </p>
        </article>
      </section>
    );
  }

  const recipeSuggestionDismissed = dismissedRecipeIds.includes(focusedRecipe.id);

  return (
    <>
      {error ? (
        <section className="grid">
          <article className="panel">
            <p className="error-text" role="alert" data-testid="cooking-alert-error">
              {error}
            </p>
          </article>
        </section>
      ) : null}
      {success ? (
        <section className="grid">
          <article className="panel">
            <p className="success-text" role="status" data-testid="cooking-alert-success">
              {success}
            </p>
          </article>
        </section>
      ) : null}

      <section className="grid food-cooking-grid" data-testid="cooking-session-page">
        <article className="panel" data-testid="cooking-session-summary">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button className="btn btn-ghost min-h-[44px]" type="button" onClick={handleBackToFood}>
              Back
            </button>
            <button
              className="btn btn-outline min-h-[44px]"
              type="button"
              onClick={() => updateViewMode(viewMode === "step" ? "scroll" : "step")}
            >
              {viewMode === "step" ? "Scroll View" : "Step-by-Step"}
            </button>
          </div>
          <div className="eyebrow">Mobile cooking</div>
          <h2 data-testid="cooking-session-title">{session.title}</h2>
          <p className="muted mt-2">
            Pantry mode: {session.pantryUpdateMode}. Actual usage drives pantry deductions, and recipe updates stay explicit.
          </p>
          <div className="pill-row mt-3">
            <span className="pill">{session.recipeCount} recipes in this cook</span>
            <span className="pill">{focusedRecipe.role}</span>
            <span className="pill">{session.status}</span>
          </div>
          <div className="pill-row mt-3.5">
            {session.recipes.map((recipe) => (
              <button
                className="pill-button"
                data-testid={`cooking-switch-recipe-${recipe.recipeId}`}
                key={recipe.id}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    patchSession({ focusedCookingSessionRecipeId: recipe.id }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to switch recipe.");
                    });
                  });
                }}
              >
                {recipe.title}
              </button>
            ))}
          </div>
          <div className="stack-card mt-4">
            <div className="eyebrow">Focused recipe</div>
            <strong>{focusedRecipe.title}</strong>
            <div className="muted mt-2">
              Current step {focusedRecipe.currentStepIndex + 1}/{focusedRecipe.steps.length}
            </div>
            <div className="mt-2">
              {focusedRecipe.currentStepInstruction ?? "Start prepping the ingredients."}
            </div>
            {focusedRecipe.nextStepInstruction ? (
              <div className="muted">Next: {focusedRecipe.nextStepInstruction}</div>
            ) : null}
          </div>
          <div className="action-row">
            <Link
              className="action-button-secondary"
              data-testid="cooking-open-tv-mode"
              href={`/app/food/cooking/${session.id}/tv`}
            >
              Open TV mode
            </Link>
            <button
              className="action-button"
              data-testid="cooking-complete-session"
              disabled={isPending || session.status === "Completed"}
              onClick={() => {
                setShowCompleteConfirm(true);
              }}
            >
              Complete Meal
            </button>
          </div>
        </article>

        <article className="panel" data-testid="cooking-pantry-impact">
          <div className="eyebrow">Pantry impact</div>
          <h2>Actual usage and deduction</h2>
          <p className="muted mt-2">
            {session.pantryImpactPreview.appliedCount} ingredients applied to pantry, {session.pantryImpactPreview.needsReviewCount} still need review.
          </p>
          <div className="stack-list mt-3.5">
            {session.pantryImpactPreview.items.map((item) => (
              <div className="stack-card" key={item.sessionIngredientId}>
                <div className="stack-card-header">
                  <strong>{item.ingredientName}</strong>
                  <span className="pill">{item.pantryDeductionStatus}</span>
                </div>
                <div className="muted">
                  Planned {formatQuantity(item.plannedQuantity, item.plannedUnit)} • Actual {formatQuantity(item.actualQuantity, item.actualUnit)}
                </div>
                <div className="muted">
                  Deducted {formatQuantity(item.pantryDeductedQuantity, item.actualUnit ?? item.plannedUnit)}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-cooking-grid">
        <article className="panel" data-testid="cooking-total-ingredients">
          <div className="eyebrow">Total ingredients</div>
          <h2>Whole-meal ingredient checklist</h2>
          <div className="stack-list mt-3">
            {session.totalIngredients.map((ingredient) => (
              <div className="stack-card" data-testid="cooking-total-ingredient" key={ingredient.groupKey}>
                <div className="stack-card-header">
                  <label className="checkbox-field flex-1 items-start">
                    <input
                      data-testid={`cooking-total-ingredient-toggle-${ingredient.groupKey}`}
                      type="checkbox"
                      checked={ingredient.isChecked}
                      onChange={(event) => {
                        setError(null);
                        startTransition(() => {
                          toggleTotalIngredient(ingredient, event.target.checked).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to update total ingredient.");
                          });
                        });
                      }}
                    />
                    <div>
                      <strong>{ingredient.ingredientName}</strong>
                      <div className="muted">
                        Planned {formatQuantity(ingredient.plannedQuantity, ingredient.plannedUnit)} • Actual {formatQuantity(ingredient.actualQuantity, ingredient.actualUnit)}
                      </div>
                    </div>
                  </label>
                  <span className="pill">{ingredient.checkedCount}/{ingredient.totalCount}</span>
                </div>
                <div className="muted">
                  Pantry deducted {formatQuantity(ingredient.pantryDeductedQuantity, ingredient.actualUnit ?? ingredient.plannedUnit)}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel" data-testid="cooking-recipe-memory">
          <div className="eyebrow">Recipe memory</div>
          <h2>What should this cook teach the household?</h2>
          {focusedRecipe.recipeChangeSuggestion.hasMeaningfulChanges && !recipeSuggestionDismissed ? (
            <div className="stack-card mt-3">
              <p className="muted">
                {focusedRecipe.recipeChangeSuggestion.changedIngredientCount} ingredient amounts differ from the saved household default for {focusedRecipe.title}.
              </p>
              <div className="pill-row mt-2.5">
                {focusedRecipe.recipeChangeSuggestion.changedIngredients.map((item) => (
                  <span className="pill" key={item}>{item}</span>
                ))}
              </div>
              <div className="action-row">
                <button
                  className="action-button-secondary"
                  data-testid="cooking-keep-session-only"
                  disabled={isPending}
                  onClick={() => {
                    setDismissedRecipeIds((current) => current.includes(focusedRecipe.id) ? current : [...current, focusedRecipe.id]);
                    showSuccess("Session adjustments will stay with this cook only.");
                  }}
                >
                  Keep this session only
                </button>
                <button
                  className="action-button-secondary"
                  data-testid="cooking-apply-pantry-only"
                  disabled={isPending}
                  onClick={() => showSuccess("Pantry changes are already being tracked from actual usage.")}
                >
                  Apply pantry only
                </button>
                <button
                  className="action-button"
                  data-testid="cooking-save-household-default"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(() => {
                      promoteRecipeChanges(focusedRecipe.id).catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to update household recipe.");
                      });
                    });
                  }}
                >
                  Save as household default
                </button>
              </div>
            </div>
          ) : (
            <p className="muted mt-3">
              Session-only changes stay isolated unless you deliberately promote them into the household recipe.
            </p>
          )}
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-cooking-grid">
        <article className="panel" data-testid="cooking-ingredients-panel">
          <div className="collapse collapse-arrow rounded-box border border-base-300 bg-base-100">
            <input checked={ingredientsExpanded} onChange={() => setIngredientsExpanded((current) => !current)} type="checkbox" />
            <div className="collapse-title p-0">
              <div className="eyebrow">Ingredients</div>
              <h2>{focusedRecipe.title}</h2>
            </div>
            <div className="collapse-content px-0">
              <div className="stack-list mt-3">
                {focusedRecipe.ingredients.map((ingredient) => (
              <div className="stack-card" data-testid={`cooking-ingredient-${ingredient.id}`} key={ingredient.id}>
                <div className="stack-card-header">
                  <label className="checkbox-field flex-1 items-start">
                    <input
                      data-testid={`cooking-ingredient-toggle-${ingredient.id}`}
                      type="checkbox"
                      checked={ingredient.isChecked}
                      onChange={(event) => {
                        setError(null);
                        startTransition(() => {
                          patchIngredient(ingredient.id, { isChecked: event.target.checked }).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to update ingredient.");
                          });
                        });
                      }}
                    />
                    <div>
                      {editingIngredientId === ingredient.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="input input-bordered input-sm min-h-[44px]"
                            value={editingIngredientName}
                            onChange={(event) => setEditingIngredientName(event.target.value)}
                          />
                          <button
                            className="btn btn-sm min-h-[44px]"
                            type="button"
                            onClick={() => {
                              setError(null);
                              startTransition(() => {
                                patchIngredient(ingredient.id, { ingredientName: editingIngredientName })
                                  .then(() => setEditingIngredientId(null))
                                  .catch((err: unknown) => {
                                    setError(err instanceof Error ? err.message : "Unable to update ingredient name.");
                                  });
                              });
                            }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <strong>{ingredient.ingredientName}</strong>
                          <button
                            className="btn btn-ghost btn-xs min-h-[32px] min-w-[32px]"
                            type="button"
                            onClick={() => beginIngredientEdit(ingredient.id, ingredient.ingredientName)}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                      <div className="muted">Planned {formatQuantity(ingredient.plannedQuantity, ingredient.plannedUnit)}</div>
                    </div>
                  </label>
                  <span className="pill">{ingredient.pantryDeductionStatus}</span>
                </div>
                <div className="grid">
                  <div className="field">
                    <span>Actual amount used</span>
                    <input
                      data-testid={`cooking-ingredient-actual-quantity-${ingredient.id}`}
                      type="number"
                      step="0.25"
                      defaultValue={ingredient.actualQuantity ?? ingredient.plannedQuantity ?? ""}
                      onBlur={(event) => {
                        const raw = event.target.value.trim();
                        setError(null);
                        startTransition(() => {
                          patchIngredient(ingredient.id, { actualQuantity: raw ? Number(raw) : null }).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to update usage.");
                          });
                        });
                      }}
                    />
                  </div>
                  <div className="field">
                    <span>Unit</span>
                    <input
                      data-testid={`cooking-ingredient-actual-unit-${ingredient.id}`}
                      defaultValue={ingredient.actualUnit ?? ingredient.plannedUnit ?? ""}
                      onBlur={(event) => {
                        setError(null);
                        startTransition(() => {
                          patchIngredient(ingredient.id, { actualUnit: event.target.value || null }).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to update unit.");
                          });
                        });
                      }}
                    />
                  </div>
                  <div className="field">
                    <span>Notes or substitution</span>
                    <input
                      data-testid={`cooking-ingredient-notes-${ingredient.id}`}
                      defaultValue={ingredient.notes ?? ""}
                      onBlur={(event) => {
                        setError(null);
                        startTransition(() => {
                          patchIngredient(ingredient.id, { notes: event.target.value || null }).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to update note.");
                          });
                        });
                      }}
                    />
                  </div>
                </div>
                <label className="checkbox-field mt-2">
                  <input
                    data-testid={`cooking-ingredient-skipped-${ingredient.id}`}
                    type="checkbox"
                    checked={ingredient.isSkipped}
                    onChange={(event) => {
                      setError(null);
                      startTransition(() => {
                        patchIngredient(ingredient.id, { isSkipped: event.target.checked }).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to mark ingredient.");
                        });
                      });
                    }}
                  />
                  Mark skipped
                </label>
              </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="panel" data-testid="cooking-steps-panel">
          <div className="eyebrow">Steps</div>
          <h2>{focusedRecipe.title}</h2>
          <div className="stack-list mt-3">
            {(viewMode === "step"
              ? focusedRecipe.steps.filter((step) => step.position === focusedRecipe.currentStepIndex + 1)
              : focusedRecipe.steps).map((step) => (
              <div
                className={`stack-card ${step.position === focusedRecipe.currentStepIndex + 1 ? "food-current-step-card" : ""} ${step.isCompleted ? "opacity-70" : ""} ${viewMode === "scroll" ? "cursor-pointer" : ""}`}
                data-testid={`cooking-step-${step.id}`}
                key={step.id}
                onClick={() => {
                  if (viewMode !== "scroll" || editingStepId === step.id) {
                    return;
                  }

                  setError(null);
                  startTransition(() => {
                    patchStep(step.id, { isCompleted: !step.isCompleted }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to update step.");
                    });
                  });
                }}
              >
                <div className="stack-card-header">
                  <div className="flex-1">
                    <strong>Step {step.position}</strong>
                    {editingStepId === step.id ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <input
                          className="input input-bordered min-h-[44px]"
                          value={editingStepInstruction}
                          onChange={(event) => setEditingStepInstruction(event.target.value)}
                        />
                        <button
                          className="btn btn-sm min-h-[44px] self-start"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setError(null);
                            startTransition(() => {
                              patchStep(step.id, { instruction: editingStepInstruction })
                                .then(() => setEditingStepId(null))
                                .catch((err: unknown) => {
                                  setError(err instanceof Error ? err.message : "Unable to update step.");
                                });
                            });
                          }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className={`muted ${step.isCompleted ? "line-through" : ""}`}>{step.instruction}</div>
                    )}
                  </div>
                  <input
                    data-testid={`cooking-step-toggle-${step.id}`}
                    type="checkbox"
                    checked={step.isCompleted}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      setError(null);
                      startTransition(() => {
                        patchStep(step.id, { isCompleted: event.target.checked }).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to update step.");
                        });
                      });
                    }}
                  />
                </div>
                <div className="action-row">
                  <button
                    className="pill-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      beginStepEdit(step.id, step.instruction);
                    }}
                  >
                    Edit text
                  </button>
                  <button
                    className="pill-button"
                    data-testid={`cooking-step-focus-${step.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setError(null);
                      startTransition(() => {
                        patchStep(step.id, { makeCurrent: true }).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to move current step.");
                        });
                      });
                    }}
                  >
                    Focus this step
                  </button>
                  {viewMode === "step" ? (
                    <button
                      className="pill-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setError(null);
                        startTransition(() => {
                          patchStep(step.id, { isCompleted: true, makeCurrent: true }).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to advance step.");
                          });
                        });
                      }}
                    >
                      Next
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {viewMode === "scroll" || focusedRecipe.currentStepIndex + 1 >= focusedRecipe.steps.length ? (
            <div className="action-row mt-4">
              <button className="action-button" type="button" disabled={isPending} onClick={() => setShowCompleteConfirm(true)}>
                Complete Meal
              </button>
            </div>
          ) : null}
        </article>
      </section>
      {showCompleteConfirm ? (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Complete meal?</h3>
            <p className="py-4 text-sm opacity-80">This will finish the cooking session and return to Food Home.</p>
            <div className="modal-action">
              <button className="btn btn-ghost min-h-[44px]" type="button" onClick={() => setShowCompleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary min-h-[44px]"
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    completeSession().then(() => {
                      showSuccess("Cooking session completed.");
                      router.push("/app/food");
                    }).catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to complete cooking.");
                    }).finally(() => setShowCompleteConfirm(false));
                  });
                }}
              >
                Complete Meal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
