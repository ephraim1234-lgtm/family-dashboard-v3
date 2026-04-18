"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type CookingSessionIngredient = {
  id: string;
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
  position: number;
  instruction: string;
  notes: string | null;
  isCompleted: boolean;
};

type CookingSession = {
  id: string;
  recipeId: string;
  recipeRevisionId: string;
  mealPlanSlotId: string | null;
  title: string;
  status: string;
  pantryUpdateMode: string;
  currentStepIndex: number;
  currentStepInstruction: string | null;
  nextStepInstruction: string | null;
  recipeChangeSuggestion: {
    hasMeaningfulChanges: boolean;
    changedIngredientCount: number;
    changedIngredients: string[];
  };
  pantryImpactPreview: {
    mode: string;
    appliedCount: number;
    needsReviewCount: number;
    items: Array<{
      ingredientId: string;
      ingredientName: string;
      plannedQuantity: number | null;
      plannedUnit: string | null;
      actualQuantity: number | null;
      actualUnit: string | null;
      pantryDeductedQuantity: number | null;
      pantryDeductionStatus: string;
    }>;
  };
  ingredients: CookingSessionIngredient[];
  steps: CookingSessionStep[];
};

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity == null && !unit) return "No amount set";
  if (quantity == null) return unit ?? "";
  return `${quantity}${unit ? ` ${unit}` : ""}`;
}

export function CookingSessionPanel({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<CookingSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

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

  function showSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
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

  async function promoteRecipeChanges() {
    const response = await fetch(`/api/food/cooking-sessions/${sessionId}/promote`, {
      method: "POST",
      credentials: "same-origin"
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Unable to promote recipe changes (${response.status}).`);
    }
    showSuccess("Household default recipe updated from this cooking session.");
  }

  if (loading) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="muted">Loading mobile cooking mode...</p>
        </article>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="error-text">{error ?? "Cooking session not found."}</p>
        </article>
      </section>
    );
  }

  return (
    <>
      {error ? (
        <section className="grid">
          <article className="panel">
            <p className="error-text">{error}</p>
          </article>
        </section>
      ) : null}
      {success ? (
        <section className="grid">
          <article className="panel">
            <p className="success-text">{success}</p>
          </article>
        </section>
      ) : null}

      <section className="grid food-cooking-grid">
        <article className="panel">
          <div className="eyebrow">Mobile cooking</div>
          <h2>{session.title}</h2>
          <p className="muted" style={{ marginTop: "8px" }}>
            Pantry mode: {session.pantryUpdateMode}. Checking ingredients records what was actually used, not just the planned recipe amount.
          </p>
          <div className="pill-row" style={{ marginTop: "12px" }}>
            <span className="pill">Current step {session.currentStepIndex + 1}/{session.steps.length}</span>
            <span className="pill">{session.status}</span>
          </div>
          <div className="stack-card" style={{ marginTop: "16px" }}>
            <div className="eyebrow">Current step</div>
            <strong>{session.currentStepInstruction ?? "Start prepping the ingredients."}</strong>
            {session.nextStepInstruction ? (
              <div className="muted">Next: {session.nextStepInstruction}</div>
            ) : null}
          </div>
          <div className="action-row">
            <Link className="action-button-secondary" href={`/app/food/cooking/${session.id}/tv`}>
              Open TV mode
            </Link>
            <button
              className="action-button"
              disabled={isPending || session.status === "Completed"}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  completeSession().then(() => {
                    showSuccess("Cooking session completed.");
                  }).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to complete cooking.");
                  });
                });
              }}
            >
              Complete cooking
            </button>
          </div>
        </article>

        <article className="panel">
          <div className="eyebrow">Pantry impact</div>
          <h2>Actual usage and deduction</h2>
          <p className="muted" style={{ marginTop: "8px" }}>
            {session.pantryImpactPreview.appliedCount} ingredients applied to pantry, {session.pantryImpactPreview.needsReviewCount} still need review.
          </p>
          <div className="stack-list" style={{ marginTop: "14px" }}>
            {session.pantryImpactPreview.items.map((item) => (
              <div className="stack-card" key={item.ingredientId}>
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
          {session.recipeChangeSuggestion.hasMeaningfulChanges ? (
            <div className="stack-card" style={{ marginTop: "16px" }}>
              <div className="eyebrow">Recipe changes detected</div>
              <p className="muted">
                {session.recipeChangeSuggestion.changedIngredientCount} ingredient amounts differ from the saved household default.
              </p>
              <div className="pill-row" style={{ marginTop: "10px" }}>
                {session.recipeChangeSuggestion.changedIngredients.map((item) => (
                  <span className="pill" key={item}>{item}</span>
                ))}
              </div>
              <div className="action-row">
                <button
                  className="action-button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(() => {
                      promoteRecipeChanges().catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to update household recipe.");
                      });
                    });
                  }}
                >
                  Save as household default
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-cooking-grid">
        <article className="panel">
          <div className="eyebrow">Ingredients</div>
          <h2>Check off what was actually used</h2>
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {session.ingredients.map((ingredient) => (
              <div className="stack-card" key={ingredient.id}>
                <div className="stack-card-header">
                  <label className="checkbox-field" style={{ alignItems: "flex-start", flex: 1 }}>
                    <input
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
                      <strong>{ingredient.ingredientName}</strong>
                      <div className="muted">Planned {formatQuantity(ingredient.plannedQuantity, ingredient.plannedUnit)}</div>
                    </div>
                  </label>
                  <span className="pill">{ingredient.pantryDeductionStatus}</span>
                </div>
                <div className="grid">
                  <div className="field">
                    <span>Actual amount used</span>
                    <input
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
                <label className="checkbox-field" style={{ marginTop: "8px" }}>
                  <input
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
        </article>

        <article className="panel">
          <div className="eyebrow">Steps</div>
          <h2>Advance through the cook</h2>
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {session.steps.map((step) => (
              <div
                className={`stack-card ${step.position === session.currentStepIndex + 1 ? "food-current-step-card" : ""}`}
                key={step.id}
              >
                <div className="stack-card-header">
                  <div style={{ flex: 1 }}>
                    <strong>Step {step.position}</strong>
                    <div className="muted">{step.instruction}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={step.isCompleted}
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
                    onClick={() => {
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
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
