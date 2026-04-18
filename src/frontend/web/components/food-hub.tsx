"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

type FoodSummary = {
  recipeCount: number;
  pantryItemCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  upcomingMealCount: number;
  shoppingItemCount: number;
  activeCookingSessionCount: number;
};

type TonightCookView = {
  mealPlanSlotId: string | null;
  recipeId: string | null;
  title: string;
  reason: string;
  missingIngredientCount: number;
  missingIngredients: string[];
};

type RecipeSummary = {
  id: string;
  title: string;
  summary: string | null;
  tags: string | null;
  yieldText: string | null;
  sourceLabel: string | null;
  hasImportedSource: boolean;
  ingredientCount: number;
  stepCount: number;
  updatedAtUtc: string;
};

type PantryLocation = {
  id: string;
  name: string;
  sortOrder: number;
};

type PantryItem = {
  id: string;
  ingredientId: string | null;
  pantryLocationId: string | null;
  ingredientName: string;
  locationName: string | null;
  quantity: number | null;
  unit: string | null;
  lowThreshold: number | null;
  status: string;
  purchasedAtUtc: string | null;
  expiresAtUtc: string | null;
  updatedAtUtc: string;
};

type MealPlanSlot = {
  id: string;
  date: string;
  slotName: string;
  recipeId: string | null;
  recipeTitle: string | null;
  notes: string | null;
};

type ShoppingListItem = {
  id: string;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  sourceRecipeTitle: string | null;
  isCompleted: boolean;
  createdAtUtc: string;
  completedAtUtc: string | null;
};

type ShoppingList = {
  id: string;
  name: string;
  storeName: string | null;
  items: ShoppingListItem[];
};

type CookingSessionSummary = {
  id: string;
  recipeId: string;
  title: string;
  status: string;
  pantryUpdateMode: string;
  currentStepIndex: number;
  totalStepCount: number;
  checkedIngredientCount: number;
  totalIngredientCount: number;
  startedAtUtc: string;
};

type FoodDashboard = {
  summary: FoodSummary;
  tonightCookView: TonightCookView | null;
  recipes: RecipeSummary[];
  pantryItems: PantryItem[];
  pantryLocations: PantryLocation[];
  upcomingMeals: MealPlanSlot[];
  shoppingList: ShoppingList;
  activeCookingSessions: CookingSessionSummary[];
};

type RecipeIngredient = {
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  isOptional: boolean;
};

type RecipeStep = {
  position: number;
  instruction: string;
};

type RecipeRevision = {
  id: string;
  kind: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  yieldText: string | null;
  notes: string | null;
  tags: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

type RecipeDetail = {
  id: string;
  title: string;
  summary: string | null;
  tags: string | null;
  yieldText: string | null;
  notes: string | null;
  source: {
    id: string;
    kind: string;
    sourceUrl: string | null;
    sourceTitle: string | null;
    sourceSiteName: string | null;
    attribution: string | null;
  } | null;
  importedSourceRevision: RecipeRevision;
  householdDefaultRevision: RecipeRevision;
  revisionCount: number;
  updatedAtUtc: string;
};

type ImportReview = {
  importJobId: string;
  status: string;
  parserConfidence: number;
  sourceUrl: string;
  sourceSiteName: string | null;
  title: string | null;
  summary: string | null;
  yieldText: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  warnings: string[];
};

function formatDate(date: string) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatQuantity(quantity: number | null, unit: string | null) {
  if (quantity == null && !unit) return "";
  if (quantity == null) return unit ?? "";
  return `${quantity}${unit ? ` ${unit}` : ""}`;
}

function emptyIngredient(): RecipeIngredient {
  return {
    ingredientName: "",
    quantity: null,
    unit: null,
    preparation: null,
    isOptional: false
  };
}

function emptyStep(position: number): RecipeStep {
  return { position, instruction: "" };
}

export function FoodHub() {
  const [data, setData] = useState<FoodDashboard | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [importUrl, setImportUrl] = useState("");
  const [importReview, setImportReview] = useState<ImportReview | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importYieldText, setImportYieldText] = useState("");
  const [importTags, setImportTags] = useState("");
  const [importNotes, setImportNotes] = useState("");
  const [importIngredients, setImportIngredients] = useState<RecipeIngredient[]>([]);
  const [importSteps, setImportSteps] = useState<RecipeStep[]>([]);

  const [pantryName, setPantryName] = useState("");
  const [pantryLocationId, setPantryLocationId] = useState<string>("");
  const [pantryQuantity, setPantryQuantity] = useState("");
  const [pantryUnit, setPantryUnit] = useState("");
  const [pantryLowThreshold, setPantryLowThreshold] = useState("");
  const [pantryExpiresAt, setPantryExpiresAt] = useState("");

  const [shoppingName, setShoppingName] = useState("");
  const [shoppingQuantity, setShoppingQuantity] = useState("");
  const [shoppingUnit, setShoppingUnit] = useState("");
  const [shoppingNotes, setShoppingNotes] = useState("");

  const [mealRecipeId, setMealRecipeId] = useState("");
  const [mealDate, setMealDate] = useState("");
  const [mealSlotName, setMealSlotName] = useState("Dinner");
  const [mealNotes, setMealNotes] = useState("");
  const [generateShopping, setGenerateShopping] = useState(true);

  async function loadDashboard() {
    const response = await fetch("/api/food/dashboard", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to load food dashboard: ${response.status}`);
    }

    const body = (await response.json()) as FoodDashboard;
    setData(body);
    if (!pantryLocationId && body.pantryLocations.length > 0) {
      setPantryLocationId(body.pantryLocations[0].id);
    }
    if (!mealRecipeId && body.recipes.length > 0) {
      setMealRecipeId(body.recipes[0].id);
    }
    if (!selectedRecipeId && body.recipes.length > 0) {
      setSelectedRecipeId(body.recipes[0].id);
    }
  }

  async function loadRecipe(recipeId: string) {
    const response = await fetch(`/api/food/recipes/${recipeId}`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load recipe: ${response.status}`);
    }
    const body = (await response.json()) as RecipeDetail;
    setSelectedRecipe(body);
  }

  useEffect(() => {
    startTransition(() => {
      loadDashboard()
        .then(() => setLoading(false))
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to load food.");
          setLoading(false);
        });
    });
  }, []);

  useEffect(() => {
    if (!selectedRecipeId) return;
    startTransition(() => {
      loadRecipe(selectedRecipeId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load recipe detail.");
      });
    });
  }, [selectedRecipeId]);

  function showSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function refreshAll() {
    await loadDashboard();
    if (selectedRecipeId) {
      await loadRecipe(selectedRecipeId);
    }
  }

  function beginImportReview(review: ImportReview) {
    setImportReview(review);
    setImportTitle(review.title ?? "");
    setImportSummary(review.summary ?? "");
    setImportYieldText(review.yieldText ?? "");
    setImportTags("");
    setImportNotes("");
    setImportIngredients(review.ingredients.length > 0 ? review.ingredients : [emptyIngredient()]);
    setImportSteps(review.steps.length > 0 ? review.steps : [emptyStep(1)]);
  }

  async function handleImportRecipe() {
    const response = await fetch("/api/food/recipe-imports", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl.trim() })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Import failed with ${response.status}.`);
    }

    const body = (await response.json()) as ImportReview;
    beginImportReview(body);
  }

  async function handleSaveImportedRecipe() {
    if (!importReview) return;

    const response = await fetch("/api/food/recipes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        importJobId: importReview.importJobId,
        title: importTitle.trim(),
        summary: importSummary.trim() || null,
        yieldText: importYieldText.trim() || null,
        tags: importTags.trim() || null,
        notes: importNotes.trim() || null,
        ingredients: importIngredients.map((item) => ({
          ingredientName: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          preparation: item.preparation,
          isOptional: item.isOptional
        })),
        steps: importSteps.map((step, index) => ({
          position: index + 1,
          instruction: step.instruction
        }))
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Save failed with ${response.status}.`);
    }

    const recipe = (await response.json()) as RecipeDetail;
    setImportUrl("");
    setImportReview(null);
    setImportIngredients([]);
    setImportSteps([]);
    setSelectedRecipe(recipe);
    setSelectedRecipeId(recipe.id);
    await refreshAll();
    showSuccess("Recipe saved to the household library.");
  }

  async function handleAddPantryItem() {
    const response = await fetch("/api/food/pantry-items", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientName: pantryName.trim(),
        pantryLocationId,
        quantity: pantryQuantity ? Number(pantryQuantity) : null,
        unit: pantryUnit.trim() || null,
        lowThreshold: pantryLowThreshold ? Number(pantryLowThreshold) : null,
        expiresAtUtc: pantryExpiresAt
          ? new Date(`${pantryExpiresAt}T12:00:00`).toISOString()
          : null
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Pantry add failed with ${response.status}.`);
    }

    setPantryName("");
    setPantryQuantity("");
    setPantryUnit("");
    setPantryLowThreshold("");
    setPantryExpiresAt("");
    await refreshAll();
    showSuccess("Pantry item added.");
  }

  async function handleAddShoppingItem() {
    const response = await fetch("/api/food/shopping-list/items", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientName: shoppingName.trim(),
        quantity: shoppingQuantity ? Number(shoppingQuantity) : null,
        unit: shoppingUnit.trim() || null,
        notes: shoppingNotes.trim() || null
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Shopping add failed with ${response.status}.`);
    }

    setShoppingName("");
    setShoppingQuantity("");
    setShoppingUnit("");
    setShoppingNotes("");
    await refreshAll();
    showSuccess("Shopping item added.");
  }

  async function handleToggleShoppingItem(item: ShoppingListItem, nextCompleted: boolean) {
    const response = await fetch(`/api/food/shopping-list/items/${item.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCompleted: nextCompleted,
        moveToPantry: nextCompleted
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Shopping update failed with ${response.status}.`);
    }

    await refreshAll();
    showSuccess(nextCompleted ? "Marked purchased and moved into pantry." : "Returned item to the shopping list.");
  }

  async function handlePlanMeal() {
    const response = await fetch("/api/food/meal-plan", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: mealRecipeId,
        date: mealDate,
        slotName: mealSlotName.trim() || "Dinner",
        notes: mealNotes.trim() || null,
        generateShoppingList: generateShopping
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Meal planning failed with ${response.status}.`);
    }

    setMealNotes("");
    await refreshAll();
    showSuccess(generateShopping ? "Meal planned and missing ingredients drafted to shopping." : "Meal planned.");
  }

  async function handleStartCooking(recipeId: string, pantryUpdateMode: "Progressive" | "ConfirmOnComplete" = "Progressive") {
    const response = await fetch("/api/food/cooking-sessions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId,
        pantryUpdateMode
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Could not start cooking session (${response.status}).`);
    }

    const session = (await response.json()) as { id: string };
    window.location.href = `/app/food/cooking/${session.id}`;
  }

  const lowStockItems = useMemo(
    () => data?.pantryItems.filter((item) => item.status !== "InStock") ?? [],
    [data]
  );

  if (loading) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="muted">Loading the household food system...</p>
        </article>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="error-text">{error ?? "Food could not be loaded."}</p>
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

      <section className="grid food-hero-grid">
        <article className="panel">
          <div className="eyebrow">Food hub</div>
          <h2>Household food operating system</h2>
          <p className="muted">
            Pantry, recipes, shopping, meal planning, and cooking stay tied together here.
          </p>
          <div className="summary-grid" style={{ marginTop: "16px" }}>
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
          <p className="muted" style={{ marginTop: "8px" }}>
            {data.tonightCookView?.reason ?? "Pick a recipe, drop it into the meal plan, and draft shopping automatically."}
          </p>
          {data.tonightCookView && data.tonightCookView.missingIngredients.length > 0 ? (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              {data.tonightCookView.missingIngredients.map((item) => (
                <div className="stack-card" key={item}>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {data.tonightCookView?.recipeId ? (
            <div className="action-row">
              <button
                className="action-button"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    handleStartCooking(data.tonightCookView!.recipeId!).catch((err: unknown) => {
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

      <div className="section-spacer" />

      <section className="grid food-section-grid">
        <article className="panel">
          <div className="eyebrow">Import</div>
          <h2>Bring in a recipe by link</h2>
          <div className="field" style={{ marginTop: "12px" }}>
            <span>Recipe URL</span>
            <input
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              placeholder="https://example.com/recipe"
            />
          </div>
          <div className="action-row">
            <button
              className="action-button"
              disabled={isPending || !importUrl.trim()}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  handleImportRecipe().catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Unable to import recipe.");
                  });
                });
              }}
            >
              Import for review
            </button>
          </div>

          {importReview ? (
            <div className="stack-list" style={{ marginTop: "18px" }}>
              <div className="stack-card">
                <div className="pill-row">
                  <span className="pill">Status {importReview.status}</span>
                  <span className="pill">Confidence {(importReview.parserConfidence * 100).toFixed(0)}%</span>
                  {importReview.sourceSiteName ? <span className="pill">{importReview.sourceSiteName}</span> : null}
                </div>
                {importReview.warnings.length > 0 ? (
                  <div className="stack-list" style={{ marginTop: "10px" }}>
                    {importReview.warnings.map((warning) => (
                      <div className="stack-card home-attention-card" key={warning}>
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="stack-card">
                <div className="field">
                  <span>Title</span>
                  <input value={importTitle} onChange={(event) => setImportTitle(event.target.value)} />
                </div>
                <div className="field">
                  <span>Summary</span>
                  <input value={importSummary} onChange={(event) => setImportSummary(event.target.value)} />
                </div>
                <div className="grid">
                  <div className="field">
                    <span>Yield</span>
                    <input value={importYieldText} onChange={(event) => setImportYieldText(event.target.value)} />
                  </div>
                  <div className="field">
                    <span>Tags</span>
                    <input value={importTags} onChange={(event) => setImportTags(event.target.value)} placeholder="weeknight, kids, batch" />
                  </div>
                </div>
                <div className="field">
                  <span>Household notes</span>
                  <input value={importNotes} onChange={(event) => setImportNotes(event.target.value)} placeholder="What the household learned about this recipe" />
                </div>
              </div>

              <div className="stack-card">
                <div className="stack-card-header">
                  <strong>Ingredients</strong>
                  <button
                    className="pill-button"
                    type="button"
                    onClick={() => setImportIngredients((current) => [...current, emptyIngredient()])}
                  >
                    + Ingredient
                  </button>
                </div>
                <div className="stack-list">
                  {importIngredients.map((ingredient, index) => (
                    <div className="grid" key={`${ingredient.ingredientName}-${index}`}>
                      <div className="field">
                        <span>Name</span>
                        <input
                          value={ingredient.ingredientName}
                          onChange={(event) =>
                            setImportIngredients((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, ingredientName: event.target.value }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <span>Qty</span>
                        <input
                          type="number"
                          step="0.25"
                          value={ingredient.quantity ?? ""}
                          onChange={(event) =>
                            setImportIngredients((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, quantity: event.target.value ? Number(event.target.value) : null }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <span>Unit</span>
                        <input
                          value={ingredient.unit ?? ""}
                          onChange={(event) =>
                            setImportIngredients((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, unit: event.target.value || null }
                                  : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stack-card">
                <div className="stack-card-header">
                  <strong>Steps</strong>
                  <button
                    className="pill-button"
                    type="button"
                    onClick={() => setImportSteps((current) => [...current, emptyStep(current.length + 1)])}
                  >
                    + Step
                  </button>
                </div>
                <div className="stack-list">
                  {importSteps.map((step, index) => (
                    <div className="field" key={`${step.position}-${index}`}>
                      <span>Step {index + 1}</span>
                      <input
                        value={step.instruction}
                        onChange={(event) =>
                          setImportSteps((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, instruction: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="action-row">
                  <button
                    className="action-button"
                    disabled={isPending || !importTitle.trim()}
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleSaveImportedRecipe().catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to save recipe.");
                        });
                      });
                    }}
                  >
                    Save household recipe
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </article>

        <article className="panel">
          <div className="eyebrow">Recipes</div>
          <h2>Household recipe library</h2>
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {data.recipes.map((recipe) => (
              <div className="stack-card" key={recipe.id}>
                <div className="stack-card-header">
                  <div style={{ flex: 1 }}>
                    <strong>{recipe.title}</strong>
                    {recipe.summary ? <div className="muted">{recipe.summary}</div> : null}
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {recipe.ingredientCount} ingredients • {recipe.stepCount} steps
                      {recipe.sourceLabel ? ` • from ${recipe.sourceLabel}` : ""}
                    </div>
                  </div>
                  <button
                    className={`pill-button ${selectedRecipeId === recipe.id ? "pill-button-active" : ""}`}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    View
                  </button>
                </div>
                <div className="pill-row">
                  {recipe.tags ? <span className="pill">{recipe.tags}</span> : null}
                  {recipe.yieldText ? <span className="pill">{recipe.yieldText}</span> : null}
                </div>
                <div className="compact-action-row action-row">
                  <button
                    className="action-button"
                    disabled={isPending}
                    onClick={() => {
                      setMealRecipeId(recipe.id);
                      setMealDate(mealDate || new Date().toISOString().slice(0, 10));
                      window.scrollTo({ top: document.body.scrollHeight / 2, behavior: "smooth" });
                    }}
                  >
                    Plan meal
                  </button>
                  <button
                    className="action-button-secondary"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      startTransition(() => {
                        handleStartCooking(recipe.id).catch((err: unknown) => {
                          setError(err instanceof Error ? err.message : "Unable to start cooking.");
                        });
                      });
                    }}
                  >
                    Cook now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-section-grid">
        <article className="panel">
          <div className="eyebrow">Pantry</div>
          <h2>What the household has on hand</h2>
          <div className="stack-card" style={{ marginTop: "12px" }}>
            <div className="grid">
              <div className="field">
                <span>Ingredient</span>
                <input value={pantryName} onChange={(event) => setPantryName(event.target.value)} />
              </div>
              <div className="field">
                <span>Location</span>
                <select value={pantryLocationId} onChange={(event) => setPantryLocationId(event.target.value)}>
                  {data.pantryLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid">
              <div className="field">
                <span>Quantity</span>
                <input type="number" step="0.25" value={pantryQuantity} onChange={(event) => setPantryQuantity(event.target.value)} />
              </div>
              <div className="field">
                <span>Unit</span>
                <input value={pantryUnit} onChange={(event) => setPantryUnit(event.target.value)} />
              </div>
              <div className="field">
                <span>Low threshold</span>
                <input type="number" step="0.25" value={pantryLowThreshold} onChange={(event) => setPantryLowThreshold(event.target.value)} />
              </div>
              <div className="field">
                <span>Expires</span>
                <input type="date" value={pantryExpiresAt} onChange={(event) => setPantryExpiresAt(event.target.value)} />
              </div>
            </div>
            <div className="action-row">
              <button
                className="action-button"
                disabled={isPending || !pantryName.trim()}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handleAddPantryItem().catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to add pantry item.");
                    });
                  });
                }}
              >
                Add pantry item
              </button>
            </div>
          </div>

          {lowStockItems.length > 0 ? (
            <div className="stack-list" style={{ marginTop: "16px" }}>
              {lowStockItems.map((item) => (
                <div className="stack-card home-attention-card" key={item.id}>
                  <div className="stack-card-header">
                    <strong>{item.ingredientName}</strong>
                    <span className="pill">{item.status}</span>
                  </div>
                  <div className="muted">
                    {item.locationName ?? "Pantry"} • {formatQuantity(item.quantity, item.unit)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="stack-list" style={{ marginTop: "16px" }}>
            {data.pantryItems.map((item) => (
              <div className="stack-card" key={item.id}>
                <div className="stack-card-header">
                  <div style={{ flex: 1 }}>
                    <strong>{item.ingredientName}</strong>
                    <div className="muted">
                      {item.locationName ?? "Pantry"} • {formatQuantity(item.quantity, item.unit) || "Quantity not set"}
                    </div>
                  </div>
                  <span className="pill">{item.status}</span>
                </div>
                {item.expiresAtUtc ? (
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    Expires {formatTimestamp(item.expiresAtUtc)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="eyebrow">Plan + shop</div>
          <h2>Meal planning and shopping stay in sync</h2>

          <div className="stack-card" style={{ marginTop: "12px" }}>
            <div className="grid">
              <div className="field">
                <span>Recipe</span>
                <select value={mealRecipeId} onChange={(event) => setMealRecipeId(event.target.value)}>
                  <option value="">Select a recipe</option>
                  {data.recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span>Date</span>
                <input type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} />
              </div>
              <div className="field">
                <span>Slot</span>
                <input value={mealSlotName} onChange={(event) => setMealSlotName(event.target.value)} />
              </div>
            </div>
            <div className="field">
              <span>Notes</span>
              <input value={mealNotes} onChange={(event) => setMealNotes(event.target.value)} placeholder="Busy night, leftovers, guests..." />
            </div>
            <label className="checkbox-field" style={{ marginTop: "8px" }}>
              <input
                type="checkbox"
                checked={generateShopping}
                onChange={(event) => setGenerateShopping(event.target.checked)}
              />
              Draft missing ingredients to the shared shopping list
            </label>
            <div className="action-row">
              <button
                className="action-button"
                disabled={isPending || !mealRecipeId || !mealDate}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handlePlanMeal().catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to plan meal.");
                    });
                  });
                }}
              >
                Add to meal plan
              </button>
            </div>
          </div>

          <div className="stack-card" style={{ marginTop: "16px" }}>
            <div className="stack-card-header">
              <strong>{data.shoppingList.name}</strong>
              <span className="pill">{data.shoppingList.items.filter((item) => !item.isCompleted).length} open</span>
            </div>
            <div className="grid">
              <div className="field">
                <span>Item</span>
                <input value={shoppingName} onChange={(event) => setShoppingName(event.target.value)} />
              </div>
              <div className="field">
                <span>Qty</span>
                <input type="number" step="0.25" value={shoppingQuantity} onChange={(event) => setShoppingQuantity(event.target.value)} />
              </div>
              <div className="field">
                <span>Unit</span>
                <input value={shoppingUnit} onChange={(event) => setShoppingUnit(event.target.value)} />
              </div>
            </div>
            <div className="field">
              <span>Notes</span>
              <input value={shoppingNotes} onChange={(event) => setShoppingNotes(event.target.value)} />
            </div>
            <div className="action-row">
              <button
                className="action-button-secondary"
                disabled={isPending || !shoppingName.trim()}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    handleAddShoppingItem().catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : "Unable to add shopping item.");
                    });
                  });
                }}
              >
                Add to list
              </button>
            </div>

            <div className="stack-list" style={{ marginTop: "14px" }}>
              {data.shoppingList.items.map((item) => (
                <label className="stack-card" key={item.id}>
                  <div className="stack-card-header">
                    <div style={{ flex: 1 }}>
                      <strong style={{ textDecoration: item.isCompleted ? "line-through" : "none" }}>
                        {item.ingredientName}
                      </strong>
                      <div className="muted">
                        {formatQuantity(item.quantity, item.unit)}
                        {item.sourceRecipeTitle ? ` • from ${item.sourceRecipeTitle}` : ""}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={(event) => {
                        setError(null);
                        startTransition(() => {
                          handleToggleShoppingItem(item, event.target.checked).catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Unable to update shopping item.");
                          });
                        });
                      }}
                    />
                  </div>
                  {item.notes ? <div className="muted">{item.notes}</div> : null}
                </label>
              ))}
            </div>
          </div>

          {data.upcomingMeals.length > 0 ? (
            <div className="stack-list" style={{ marginTop: "16px" }}>
              {data.upcomingMeals.map((slot) => (
                <div className="stack-card" key={slot.id}>
                  <div className="stack-card-header">
                    <strong>{slot.recipeTitle ?? "Meal"}</strong>
                    <span className="pill">
                      {formatDate(slot.date)} • {slot.slotName}
                    </span>
                  </div>
                  {slot.notes ? <div className="muted">{slot.notes}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-section-grid">
        <article className="panel">
          <div className="eyebrow">Recipe detail</div>
          <h2>{selectedRecipe?.title ?? "Pick a recipe"}</h2>
          {selectedRecipe ? (
            <>
              <p className="muted" style={{ marginTop: "8px" }}>
                {selectedRecipe.summary ?? "This household-owned recipe keeps imported source and default household edits separate."}
              </p>

              <div className="pill-row" style={{ marginTop: "12px" }}>
                <span className="pill">Default rev {selectedRecipe.householdDefaultRevision.revisionNumber}</span>
                <span className="pill">Imported rev {selectedRecipe.importedSourceRevision.revisionNumber}</span>
                <span className="pill">{selectedRecipe.revisionCount} total revisions</span>
                {selectedRecipe.householdDefaultRevision.yieldText ? <span className="pill">{selectedRecipe.householdDefaultRevision.yieldText}</span> : null}
              </div>

              {selectedRecipe.source?.sourceUrl ? (
                <p className="muted" style={{ marginTop: "12px" }}>
                  Imported from{" "}
                  <a className="pill-link pill" href={selectedRecipe.source.sourceUrl} target="_blank" rel="noreferrer">
                    {selectedRecipe.source.sourceSiteName ?? selectedRecipe.source.sourceUrl}
                  </a>
                </p>
              ) : null}

              <div className="grid" style={{ marginTop: "14px" }}>
                <div className="stack-card">
                  <div className="eyebrow">Household default</div>
                  <div className="stack-list" style={{ marginTop: "10px" }}>
                    {selectedRecipe.householdDefaultRevision.ingredients.map((ingredient, index) => (
                      <div className="stack-card" key={`${ingredient.ingredientName}-${index}`}>
                        <strong>{ingredient.ingredientName}</strong>
                        <div className="muted">{formatQuantity(ingredient.quantity, ingredient.unit)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="stack-card">
                  <div className="eyebrow">Steps</div>
                  <div className="stack-list" style={{ marginTop: "10px" }}>
                    {selectedRecipe.householdDefaultRevision.steps.map((step) => (
                      <div className="stack-card" key={step.position}>
                        <strong>Step {step.position}</strong>
                        <div className="muted">{step.instruction}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="action-row">
                <button
                  className="action-button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(() => {
                      handleStartCooking(selectedRecipe.id, "Progressive").catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to start cooking.");
                      });
                    });
                  }}
                >
                  Start mobile cooking mode
                </button>
                <button
                  className="action-button-secondary"
                  disabled={isPending}
                  onClick={() => {
                    setMealRecipeId(selectedRecipe.id);
                    setMealDate(mealDate || new Date().toISOString().slice(0, 10));
                  }}
                >
                  Plan this meal
                </button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: "12px" }}>
              Import a recipe or choose one from the household library to see the revision-aware detail view.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="eyebrow">Cooking</div>
          <h2>Active sessions</h2>
          {data.activeCookingSessions.length === 0 ? (
            <p className="muted" style={{ marginTop: "12px" }}>
              Start a cooking session from a recipe to get interactive mobile cooking mode plus a TV-ready display.
            </p>
          ) : (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              {data.activeCookingSessions.map((session) => (
                <div className="stack-card" key={session.id}>
                  <div className="stack-card-header">
                    <div style={{ flex: 1 }}>
                      <strong>{session.title}</strong>
                      <div className="muted">
                        Step {session.currentStepIndex + 1} of {session.totalStepCount} • {session.checkedIngredientCount}/{session.totalIngredientCount} ingredients checked
                      </div>
                    </div>
                    <span className="pill">{session.pantryUpdateMode}</span>
                  </div>
                  <div className="action-row">
                    <Link className="action-button" href={`/app/food/cooking/${session.id}`}>
                      Open mobile mode
                    </Link>
                    <Link className="action-button-secondary" href={`/app/food/cooking/${session.id}/tv`}>
                      Open TV mode
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
