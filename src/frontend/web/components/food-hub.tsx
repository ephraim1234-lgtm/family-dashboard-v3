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
  title: string;
  reason: string;
  missingIngredientCount: number;
  missingIngredients: string[];
  plannedRecipeTitles: string[];
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

type PantryHistoryItem = {
  id: string;
  kind: string;
  quantityDelta: number | null;
  quantityAfter: number | null;
  unit: string | null;
  note: string | null;
  sourceLabel: string | null;
  occurredAtUtc: string;
};

type MealPlanRecipe = {
  id: string;
  recipeId: string;
  recipeRevisionId: string;
  role: string;
  title: string;
};

type MealPlanSlot = {
  id: string;
  date: string;
  slotName: string;
  title: string;
  notes: string | null;
  recipes: MealPlanRecipe[];
};

type ShoppingListItem = {
  id: string;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  sourceRecipeTitle: string | null;
  sourceMealTitle: string | null;
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
  mealPlanSlotId: string | null;
  title: string;
  status: string;
  pantryUpdateMode: string;
  recipeCount: number;
  focusedRecipeTitle: string | null;
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

type RecipeDraft = {
  recipeId: string | null;
  importJobId: string | null;
  mode: "manual" | "import" | "edit";
  title: string;
  summary: string;
  yieldText: string;
  tags: string;
  notes: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

type MealComposerRow = {
  recipeId: string;
  role: string;
};

function formatDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
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

function createRecipeDraft(mode: RecipeDraft["mode"], recipeId: string | null = null): RecipeDraft {
  return {
    recipeId,
    importJobId: null,
    mode,
    title: "",
    summary: "",
    yieldText: "",
    tags: "",
    notes: "",
    ingredients: [emptyIngredient()],
    steps: [emptyStep(1)]
  };
}

function recipeToDraft(recipe: RecipeDetail): RecipeDraft {
  return {
    recipeId: recipe.id,
    importJobId: null,
    mode: "edit",
    title: recipe.title,
    summary: recipe.summary ?? "",
    yieldText: recipe.householdDefaultRevision.yieldText ?? "",
    tags: recipe.householdDefaultRevision.tags ?? recipe.tags ?? "",
    notes: recipe.householdDefaultRevision.notes ?? recipe.notes ?? "",
    ingredients: recipe.householdDefaultRevision.ingredients.length > 0
      ? recipe.householdDefaultRevision.ingredients
      : [emptyIngredient()],
    steps: recipe.householdDefaultRevision.steps.length > 0
      ? recipe.householdDefaultRevision.steps
      : [emptyStep(1)]
  };
}

export function FoodHub() {
  const [data, setData] = useState<FoodDashboard | null>(null);
  const [recipeLibrary, setRecipeLibrary] = useState<RecipeSummary[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedPantryItemId, setSelectedPantryItemId] = useState<string | null>(null);
  const [pantryHistory, setPantryHistory] = useState<PantryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [recipeQuery, setRecipeQuery] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importReview, setImportReview] = useState<ImportReview | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraft | null>(null);

  const [pantryName, setPantryName] = useState("");
  const [pantryLocationId, setPantryLocationId] = useState<string>("");
  const [pantryQuantity, setPantryQuantity] = useState("");
  const [pantryUnit, setPantryUnit] = useState("");
  const [pantryLowThreshold, setPantryLowThreshold] = useState("");
  const [pantryExpiresAt, setPantryExpiresAt] = useState("");

  const [pantryEditLocationId, setPantryEditLocationId] = useState("");
  const [pantryEditQuantity, setPantryEditQuantity] = useState("");
  const [pantryEditUnit, setPantryEditUnit] = useState("");
  const [pantryEditLowThreshold, setPantryEditLowThreshold] = useState("");
  const [pantryEditStatus, setPantryEditStatus] = useState("InStock");
  const [pantryEditPurchasedAt, setPantryEditPurchasedAt] = useState("");
  const [pantryEditExpiresAt, setPantryEditExpiresAt] = useState("");
  const [pantryEditNote, setPantryEditNote] = useState("");

  const [shoppingName, setShoppingName] = useState("");
  const [shoppingQuantity, setShoppingQuantity] = useState("");
  const [shoppingUnit, setShoppingUnit] = useState("");
  const [shoppingNotes, setShoppingNotes] = useState("");

  const [mealDate, setMealDate] = useState("");
  const [mealSlotName, setMealSlotName] = useState("Dinner");
  const [mealTitle, setMealTitle] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [generateShopping, setGenerateShopping] = useState(true);
  const [mealRows, setMealRows] = useState<MealComposerRow[]>([{ recipeId: "", role: "Main" }]);

  const selectedPantryItem = useMemo(
    () => data?.pantryItems.find((item) => item.id === selectedPantryItemId) ?? null,
    [data, selectedPantryItemId]
  );

  const lowStockItems = useMemo(
    () => data?.pantryItems.filter((item) => item.status !== "InStock") ?? [],
    [data]
  );

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
    if (!selectedPantryItemId && body.pantryItems.length > 0) {
      setSelectedPantryItemId(body.pantryItems[0].id);
    }
    if (!selectedRecipeId && body.recipes.length > 0) {
      setSelectedRecipeId(body.recipes[0].id);
    }
    if (!mealRows[0]?.recipeId && body.recipes.length > 0) {
      setMealRows([{ recipeId: body.recipes[0].id, role: "Main" }]);
    }
  }

  async function loadRecipeLibrary(query: string) {
    const search = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
    const response = await fetch(`/api/food/recipes${search}`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load recipe library: ${response.status}`);
    }
    setRecipeLibrary((await response.json()) as RecipeSummary[]);
  }

  async function loadRecipe(recipeId: string) {
    const response = await fetch(`/api/food/recipes/${recipeId}`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load recipe: ${response.status}`);
    }
    setSelectedRecipe((await response.json()) as RecipeDetail);
  }

  async function loadPantryHistory(pantryItemId: string) {
    const response = await fetch(`/api/food/pantry-items/${pantryItemId}/history`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load pantry history: ${response.status}`);
    }
    setPantryHistory((await response.json()) as PantryHistoryItem[]);
  }

  useEffect(() => {
    startTransition(() => {
      Promise.all([loadDashboard(), loadRecipeLibrary("")])
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

  useEffect(() => {
    if (!selectedPantryItemId) return;
    startTransition(() => {
      loadPantryHistory(selectedPantryItemId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load pantry history.");
      });
    });
  }, [selectedPantryItemId]);

  useEffect(() => {
    if (!selectedPantryItem) return;
    setPantryEditLocationId(selectedPantryItem.pantryLocationId ?? "");
    setPantryEditQuantity(selectedPantryItem.quantity?.toString() ?? "");
    setPantryEditUnit(selectedPantryItem.unit ?? "");
    setPantryEditLowThreshold(selectedPantryItem.lowThreshold?.toString() ?? "");
    setPantryEditStatus(selectedPantryItem.status);
    setPantryEditPurchasedAt(
      selectedPantryItem.purchasedAtUtc ? selectedPantryItem.purchasedAtUtc.slice(0, 10) : ""
    );
    setPantryEditExpiresAt(
      selectedPantryItem.expiresAtUtc ? selectedPantryItem.expiresAtUtc.slice(0, 10) : ""
    );
    setPantryEditNote("");
  }, [selectedPantryItem]);

  useEffect(() => {
    startTransition(() => {
      loadRecipeLibrary(recipeQuery).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load recipes.");
      });
    });
  }, [recipeQuery]);

  function showSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function refreshAll() {
    await Promise.all([loadDashboard(), loadRecipeLibrary(recipeQuery)]);
    if (selectedRecipeId) {
      await loadRecipe(selectedRecipeId);
    }
    if (selectedPantryItemId) {
      await loadPantryHistory(selectedPantryItemId);
    }
  }

  function beginImportReview(review: ImportReview) {
    setImportReview(review);
    setRecipeDraft({
      recipeId: null,
      importJobId: review.importJobId,
      mode: "import",
      title: review.title ?? "",
      summary: review.summary ?? "",
      yieldText: review.yieldText ?? "",
      tags: "",
      notes: "",
      ingredients: review.ingredients.length > 0 ? review.ingredients : [emptyIngredient()],
      steps: review.steps.length > 0 ? review.steps : [emptyStep(1)]
    });
  }

  function startManualRecipe() {
    setImportReview(null);
    setRecipeDraft(createRecipeDraft("manual"));
  }

  function startEditingSelectedRecipe() {
    if (!selectedRecipe) return;
    setImportReview(null);
    setRecipeDraft(recipeToDraft(selectedRecipe));
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

    beginImportReview((await response.json()) as ImportReview);
  }

  async function handleSaveRecipeDraft() {
    if (!recipeDraft) return;

    const payload = {
      importJobId: recipeDraft.importJobId,
      title: recipeDraft.title.trim(),
      summary: recipeDraft.summary.trim() || null,
      yieldText: recipeDraft.yieldText.trim() || null,
      tags: recipeDraft.tags.trim() || null,
      notes: recipeDraft.notes.trim() || null,
      ingredients: recipeDraft.ingredients.map((item) => ({
        ingredientName: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        preparation: item.preparation,
        isOptional: item.isOptional
      })),
      steps: recipeDraft.steps.map((step, index) => ({
        position: index + 1,
        instruction: step.instruction
      }))
    };

    const response = await fetch(
      recipeDraft.mode === "edit" && recipeDraft.recipeId
        ? `/api/food/recipes/${recipeDraft.recipeId}`
        : "/api/food/recipes",
      {
        method: recipeDraft.mode === "edit" && recipeDraft.recipeId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Recipe save failed with ${response.status}.`);
    }

    const recipe = (await response.json()) as RecipeDetail;
    setSelectedRecipe(recipe);
    setSelectedRecipeId(recipe.id);
    setRecipeDraft(null);
    setImportReview(null);
    setImportUrl("");
    await refreshAll();
    showSuccess(
      recipeDraft.mode === "edit"
        ? "Household recipe updated."
        : "Recipe saved to the household library."
    );
  }

  async function handleAddPantryItem() {
    const response = await fetch("/api/food/pantry-items", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientName: pantryName.trim(),
        pantryLocationId: pantryLocationId || null,
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

    const pantryItem = (await response.json()) as PantryItem;
    setPantryName("");
    setPantryQuantity("");
    setPantryUnit("");
    setPantryLowThreshold("");
    setPantryExpiresAt("");
    setSelectedPantryItemId(pantryItem.id);
    await refreshAll();
    showSuccess("Pantry item added.");
  }

  async function handleUpdatePantryItem() {
    if (!selectedPantryItemId) return;

    const response = await fetch(`/api/food/pantry-items/${selectedPantryItemId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pantryLocationId: pantryEditLocationId || null,
        quantity: pantryEditQuantity ? Number(pantryEditQuantity) : null,
        unit: pantryEditUnit.trim() || null,
        lowThreshold: pantryEditLowThreshold ? Number(pantryEditLowThreshold) : null,
        status: pantryEditStatus,
        purchasedAtUtc: pantryEditPurchasedAt
          ? new Date(`${pantryEditPurchasedAt}T12:00:00`).toISOString()
          : null,
        expiresAtUtc: pantryEditExpiresAt
          ? new Date(`${pantryEditExpiresAt}T12:00:00`).toISOString()
          : null,
        note: pantryEditNote.trim() || null
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Pantry update failed with ${response.status}.`);
    }

    setPantryEditNote("");
    await refreshAll();
    showSuccess("Pantry item updated.");
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
        recipeId: null,
        date: mealDate,
        slotName: mealSlotName.trim() || "Dinner",
        title: mealTitle.trim() || null,
        notes: mealNotes.trim() || null,
        generateShoppingList: generateShopping,
        recipes: mealRows
          .filter((row) => row.recipeId)
          .map((row) => ({
            recipeId: row.recipeId,
            role: row.role
          }))
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Meal planning failed with ${response.status}.`);
    }

    setMealNotes("");
    setMealTitle("");
    await refreshAll();
    showSuccess(generateShopping ? "Meal planned and shopping gaps drafted." : "Meal planned.");
  }

  async function handleStartCooking(params: {
    recipeId?: string;
    mealPlanSlotId?: string;
    pantryUpdateMode?: "Progressive" | "ConfirmOnComplete";
  }) {
    const response = await fetch("/api/food/cooking-sessions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: params.recipeId ?? null,
        mealPlanSlotId: params.mealPlanSlotId ?? null,
        pantryUpdateMode: params.pantryUpdateMode ?? "Progressive"
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Could not start cooking session (${response.status}).`);
    }

    const session = (await response.json()) as { id: string };
    window.location.href = `/app/food/cooking/${session.id}`;
  }

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
            Pantry, recipes, shopping, meal planning, and cooking stay connected here.
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
            {data.tonightCookView?.reason ?? "Plan a meal, generate shopping gaps, and jump straight into cooking mode."}
          </p>
          {data.tonightCookView?.plannedRecipeTitles?.length ? (
            <div className="pill-row" style={{ marginTop: "12px" }}>
              {data.tonightCookView.plannedRecipeTitles.map((title) => (
                <span className="pill" key={title}>{title}</span>
              ))}
            </div>
          ) : null}
          {data.tonightCookView?.missingIngredients.length ? (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              {data.tonightCookView.missingIngredients.map((item) => (
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
                    handleStartCooking({ mealPlanSlotId: data.tonightCookView!.mealPlanSlotId! }).catch((err: unknown) => {
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
          <div className="eyebrow">Recipe capture</div>
          <h2>Bring in a recipe by link or create one from scratch</h2>
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
            <button
              className="action-button-secondary"
              disabled={isPending}
              onClick={startManualRecipe}
            >
              New manual recipe
            </button>
          </div>

          {importReview ? (
            <div className="stack-card" style={{ marginTop: "16px" }}>
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
          ) : null}

          {recipeDraft ? (
            <div className="stack-list" style={{ marginTop: "16px" }}>
              <div className="stack-card">
                <div className="stack-card-header">
                  <strong>
                    {recipeDraft.mode === "edit"
                      ? "Edit household default"
                      : recipeDraft.mode === "import"
                        ? "Review imported recipe"
                        : "New household recipe"}
                  </strong>
                  <span className="pill">{recipeDraft.mode}</span>
                </div>
                <div className="field">
                  <span>Title</span>
                  <input
                    value={recipeDraft.title}
                    onChange={(event) => setRecipeDraft((current) => current ? { ...current, title: event.target.value } : current)}
                  />
                </div>
                <div className="field">
                  <span>Summary</span>
                  <input
                    value={recipeDraft.summary}
                    onChange={(event) => setRecipeDraft((current) => current ? { ...current, summary: event.target.value } : current)}
                  />
                </div>
                <div className="grid">
                  <div className="field">
                    <span>Yield</span>
                    <input
                      value={recipeDraft.yieldText}
                      onChange={(event) => setRecipeDraft((current) => current ? { ...current, yieldText: event.target.value } : current)}
                    />
                  </div>
                  <div className="field">
                    <span>Tags</span>
                    <input
                      value={recipeDraft.tags}
                      onChange={(event) => setRecipeDraft((current) => current ? { ...current, tags: event.target.value } : current)}
                    />
                  </div>
                </div>
                <div className="field">
                  <span>Household notes</span>
                  <input
                    value={recipeDraft.notes}
                    onChange={(event) => setRecipeDraft((current) => current ? { ...current, notes: event.target.value } : current)}
                  />
                </div>
              </div>

              <div className="stack-card">
                <div className="stack-card-header">
                  <strong>Ingredients</strong>
                  <button
                    className="pill-button"
                    type="button"
                    onClick={() => setRecipeDraft((current) => current ? {
                      ...current,
                      ingredients: [...current.ingredients, emptyIngredient()]
                    } : current)}
                  >
                    + Ingredient
                  </button>
                </div>
                <div className="stack-list" style={{ marginTop: "10px" }}>
                  {recipeDraft.ingredients.map((ingredient, index) => (
                    <div className="stack-card" key={`draft-ingredient-${index}`}>
                      <div className="grid">
                        <div className="field">
                          <span>Ingredient</span>
                          <input
                            value={ingredient.ingredientName}
                            onChange={(event) => setRecipeDraft((current) => {
                              if (!current) return current;
                              const ingredients = [...current.ingredients];
                              ingredients[index] = { ...ingredients[index], ingredientName: event.target.value };
                              return { ...current, ingredients };
                            })}
                          />
                        </div>
                        <div className="field">
                          <span>Qty</span>
                          <input
                            type="number"
                            step="0.25"
                            value={ingredient.quantity ?? ""}
                            onChange={(event) => setRecipeDraft((current) => {
                              if (!current) return current;
                              const ingredients = [...current.ingredients];
                              ingredients[index] = {
                                ...ingredients[index],
                                quantity: event.target.value ? Number(event.target.value) : null
                              };
                              return { ...current, ingredients };
                            })}
                          />
                        </div>
                        <div className="field">
                          <span>Unit</span>
                          <input
                            value={ingredient.unit ?? ""}
                            onChange={(event) => setRecipeDraft((current) => {
                              if (!current) return current;
                              const ingredients = [...current.ingredients];
                              ingredients[index] = { ...ingredients[index], unit: event.target.value || null };
                              return { ...current, ingredients };
                            })}
                          />
                        </div>
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
                    onClick={() => setRecipeDraft((current) => current ? {
                      ...current,
                      steps: [...current.steps, emptyStep(current.steps.length + 1)]
                    } : current)}
                  >
                    + Step
                  </button>
                </div>
                <div className="stack-list" style={{ marginTop: "10px" }}>
                  {recipeDraft.steps.map((step, index) => (
                    <div className="stack-card" key={`draft-step-${index}`}>
                      <div className="field">
                        <span>Step {index + 1}</span>
                        <input
                          value={step.instruction}
                          onChange={(event) => setRecipeDraft((current) => {
                            if (!current) return current;
                            const steps = [...current.steps];
                            steps[index] = { position: index + 1, instruction: event.target.value };
                            return { ...current, steps };
                          })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="action-row">
                <button
                  className="action-button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(() => {
                      handleSaveRecipeDraft().catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to save recipe.");
                      });
                    });
                  }}
                >
                  {recipeDraft.mode === "edit" ? "Save household default" : "Save recipe"}
                </button>
                <button
                  className="action-button-secondary"
                  disabled={isPending}
                  onClick={() => {
                    setRecipeDraft(null);
                    setImportReview(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </article>

        <article className="panel">
          <div className="eyebrow">Recipe library</div>
          <div className="stack-card-header">
            <h2 style={{ margin: 0 }}>Shared household recipes</h2>
            <span className="pill">{recipeLibrary.length} shown</span>
          </div>
          <div className="field" style={{ marginTop: "12px" }}>
            <span>Search</span>
            <input
              value={recipeQuery}
              onChange={(event) => setRecipeQuery(event.target.value)}
              placeholder="weeknight, chicken, lunch"
            />
          </div>
          <div className="stack-list" style={{ marginTop: "14px" }}>
            {recipeLibrary.map((recipe) => (
              <div className="stack-card" key={recipe.id}>
                <div className="stack-card-header">
                  <div style={{ flex: 1 }}>
                    <strong>{recipe.title}</strong>
                    <div className="muted">
                      {recipe.ingredientCount} ingredients • {recipe.stepCount} steps • updated {formatTimestamp(recipe.updatedAtUtc)}
                    </div>
                  </div>
                  <button
                    className="pill-button"
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    View
                  </button>
                </div>
                <div className="pill-row">
                  {recipe.tags ? <span className="pill">{recipe.tags}</span> : null}
                  {recipe.yieldText ? <span className="pill">{recipe.yieldText}</span> : null}
                  {recipe.sourceLabel ? <span className="pill">{recipe.sourceLabel}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-section-grid">
        <article className="panel">
          <div className="eyebrow">Meal planning</div>
          <h2>Build a real meal, not just a single recipe slot</h2>
          <div className="grid" style={{ marginTop: "12px" }}>
            <div className="field">
              <span>Date</span>
              <input type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} />
            </div>
            <div className="field">
              <span>Slot</span>
              <input value={mealSlotName} onChange={(event) => setMealSlotName(event.target.value)} />
            </div>
            <div className="field">
              <span>Meal title</span>
              <input value={mealTitle} onChange={(event) => setMealTitle(event.target.value)} placeholder="Taco night" />
            </div>
          </div>
          <div className="field">
            <span>Notes</span>
            <input value={mealNotes} onChange={(event) => setMealNotes(event.target.value)} />
          </div>
          <div className="stack-list" style={{ marginTop: "12px" }}>
            {mealRows.map((row, index) => (
              <div className="stack-card" key={`meal-row-${index}`}>
                <div className="grid">
                  <div className="field">
                    <span>Recipe</span>
                    <select
                      value={row.recipeId}
                      onChange={(event) => setMealRows((current) => current.map((item, rowIndex) =>
                        rowIndex === index ? { ...item, recipeId: event.target.value } : item))}
                    >
                      <option value="">Choose a recipe</option>
                      {recipeLibrary.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>{recipe.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <span>Role</span>
                    <select
                      value={row.role}
                      onChange={(event) => setMealRows((current) => current.map((item, rowIndex) =>
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
              onClick={() => setMealRows((current) => [...current, {
                recipeId: recipeLibrary[0]?.id ?? "",
                role: "Side"
              }])}
            >
              + Add recipe to meal
            </button>
            <label className="checkbox-field">
              <input
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
              disabled={isPending || !mealDate || mealRows.every((row) => !row.recipeId)}
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

          {data.upcomingMeals.length > 0 ? (
            <div className="stack-list" style={{ marginTop: "16px" }}>
              {data.upcomingMeals.map((slot) => (
                <div className="stack-card" key={slot.id}>
                  <div className="stack-card-header">
                    <div style={{ flex: 1 }}>
                      <strong>{slot.title}</strong>
                      <div className="muted">{formatDate(slot.date)} • {slot.slotName}</div>
                    </div>
                    <button
                      className="pill-button"
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
                  <div className="pill-row">
                    {slot.recipes.map((recipe) => (
                      <span className="pill" key={recipe.id}>{recipe.role}: {recipe.title}</span>
                    ))}
                  </div>
                  {slot.notes ? <div className="muted">{slot.notes}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </article>

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
              ) : (
                <p className="muted" style={{ marginTop: "12px" }}>
                  Manual household recipe. Imported lineage and household default are intentionally separate.
                </p>
              )}

              <div className="grid" style={{ marginTop: "14px" }}>
                <div className="stack-card">
                  <div className="eyebrow">Household default ingredients</div>
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
                      handleStartCooking({ recipeId: selectedRecipe.id }).catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to start cooking.");
                      });
                    });
                  }}
                >
                  Start cooking
                </button>
                <button
                  className="action-button-secondary"
                  disabled={isPending}
                  onClick={startEditingSelectedRecipe}
                >
                  Edit household default
                </button>
                <button
                  className="action-button-secondary"
                  disabled={isPending}
                  onClick={() => {
                    setMealDate(mealDate || new Date().toISOString().slice(0, 10));
                    setMealRows([{ recipeId: selectedRecipe.id, role: "Main" }]);
                    if (!mealTitle) setMealTitle(selectedRecipe.title);
                  }}
                >
                  Add to meal
                </button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: "12px" }}>
              Choose a recipe from the shared library to inspect or edit the household default.
            </p>
          )}
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-section-grid">
        <article className="panel">
          <div className="eyebrow">Pantry</div>
          <h2>Low-friction inventory with real adjustment history</h2>
          <div className="grid" style={{ marginTop: "12px" }}>
            <div className="field">
              <span>Item</span>
              <input value={pantryName} onChange={(event) => setPantryName(event.target.value)} />
            </div>
            <div className="field">
              <span>Location</span>
              <select value={pantryLocationId} onChange={(event) => setPantryLocationId(event.target.value)}>
                {data.pantryLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>Qty</span>
              <input type="number" step="0.25" value={pantryQuantity} onChange={(event) => setPantryQuantity(event.target.value)} />
            </div>
            <div className="field">
              <span>Unit</span>
              <input value={pantryUnit} onChange={(event) => setPantryUnit(event.target.value)} />
            </div>
          </div>
          <div className="grid">
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

          {lowStockItems.length > 0 ? (
            <div className="stack-list" style={{ marginTop: "16px" }}>
              {lowStockItems.map((item) => (
                <button
                  className="stack-card home-attention-card"
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPantryItemId(item.id)}
                >
                  <div className="stack-card-header">
                    <strong>{item.ingredientName}</strong>
                    <span className="pill">{item.status}</span>
                  </div>
                  <div className="muted">{formatQuantity(item.quantity, item.unit)} • {item.locationName ?? "Unassigned"}</div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="stack-list" style={{ marginTop: "16px" }}>
            {data.pantryItems.map((item) => (
              <button
                className="stack-card"
                key={item.id}
                type="button"
                onClick={() => setSelectedPantryItemId(item.id)}
              >
                <div className="stack-card-header">
                  <strong>{item.ingredientName}</strong>
                  <span className="pill">{item.status}</span>
                </div>
                <div className="muted">
                  {formatQuantity(item.quantity, item.unit)} • {item.locationName ?? "Unassigned"}
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="eyebrow">Pantry detail</div>
          <h2>{selectedPantryItem?.ingredientName ?? "Choose a pantry item"}</h2>
          {selectedPantryItem ? (
            <>
              <div className="grid" style={{ marginTop: "12px" }}>
                <div className="field">
                  <span>Location</span>
                  <select value={pantryEditLocationId} onChange={(event) => setPantryEditLocationId(event.target.value)}>
                    {data.pantryLocations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <span>Status</span>
                  <select value={pantryEditStatus} onChange={(event) => setPantryEditStatus(event.target.value)}>
                    <option value="InStock">In stock</option>
                    <option value="Low">Low</option>
                    <option value="Out">Out</option>
                  </select>
                </div>
              </div>
              <div className="grid">
                <div className="field">
                  <span>Quantity</span>
                  <input type="number" step="0.25" value={pantryEditQuantity} onChange={(event) => setPantryEditQuantity(event.target.value)} />
                </div>
                <div className="field">
                  <span>Unit</span>
                  <input value={pantryEditUnit} onChange={(event) => setPantryEditUnit(event.target.value)} />
                </div>
                <div className="field">
                  <span>Low threshold</span>
                  <input type="number" step="0.25" value={pantryEditLowThreshold} onChange={(event) => setPantryEditLowThreshold(event.target.value)} />
                </div>
              </div>
              <div className="grid">
                <div className="field">
                  <span>Purchased</span>
                  <input type="date" value={pantryEditPurchasedAt} onChange={(event) => setPantryEditPurchasedAt(event.target.value)} />
                </div>
                <div className="field">
                  <span>Expires</span>
                  <input type="date" value={pantryEditExpiresAt} onChange={(event) => setPantryEditExpiresAt(event.target.value)} />
                </div>
              </div>
              <div className="field">
                <span>Adjustment note</span>
                <input value={pantryEditNote} onChange={(event) => setPantryEditNote(event.target.value)} placeholder="Why did this change?" />
              </div>
              <div className="action-row">
                <button
                  className="action-button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(() => {
                      handleUpdatePantryItem().catch((err: unknown) => {
                        setError(err instanceof Error ? err.message : "Unable to update pantry item.");
                      });
                    });
                  }}
                >
                  Save pantry change
                </button>
              </div>

              <div className="stack-list" style={{ marginTop: "16px" }}>
                {pantryHistory.map((entry) => (
                  <div className="stack-card" key={entry.id}>
                    <div className="stack-card-header">
                      <strong>{entry.kind}</strong>
                      <span className="pill">{formatTimestamp(entry.occurredAtUtc)}</span>
                    </div>
                    <div className="muted">
                      {entry.quantityDelta != null ? `${entry.quantityDelta > 0 ? "+" : ""}${formatQuantity(entry.quantityDelta, entry.unit)}` : "No quantity change"} • after {formatQuantity(entry.quantityAfter, entry.unit)}
                    </div>
                    {entry.sourceLabel ? <div className="muted">Source: {entry.sourceLabel}</div> : null}
                    {entry.note ? <div className="muted">{entry.note}</div> : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: "12px" }}>
              Select a pantry item to edit quantities, update status, and review its recent activity.
            </p>
          )}
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid food-section-grid">
        <article className="panel">
          <div className="eyebrow">Shopping</div>
          <div className="stack-card-header">
            <h2 style={{ margin: 0 }}>{data.shoppingList.name}</h2>
            <span className="pill">{data.shoppingList.items.filter((item) => !item.isCompleted).length} open</span>
          </div>
          <div className="grid" style={{ marginTop: "12px" }}>
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
              className="action-button"
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
                      {item.sourceMealTitle ? ` • for ${item.sourceMealTitle}` : item.sourceRecipeTitle ? ` • from ${item.sourceRecipeTitle}` : ""}
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
        </article>

        <article className="panel">
          <div className="eyebrow">Cooking</div>
          <h2>Active sessions</h2>
          {data.activeCookingSessions.length === 0 ? (
            <p className="muted" style={{ marginTop: "12px" }}>
              Start cooking from a recipe or meal plan to get total ingredients, recipe switching, pantry-aware deductions, and TV mode.
            </p>
          ) : (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              {data.activeCookingSessions.map((session) => (
                <div className="stack-card" key={session.id}>
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
