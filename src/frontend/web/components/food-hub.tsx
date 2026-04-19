"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { foodClient } from "../lib/food-client";
import { CookingTab } from "./food/cooking/cooking-tab";
import { DashboardTab } from "./food/dashboard/dashboard-tab";
import { FoodHubProvider } from "./food/food-hub-context";
import { useFoodDashboard } from "./food/hooks/use-food-dashboard";
import { usePantryHistory } from "./food/hooks/use-pantry-history";
import { useFoodRecipeDetail, useFoodRecipeLibrary } from "./food/hooks/use-food-recipes";
import { useShoppingListDetail } from "./food/hooks/use-shopping-list-detail";
import { MealPlanningWorkspace } from "./food/meal-plan/meal-planning-workspace";
import { PantryWorkspace } from "./food/pantry/pantry-workspace";
import { RecipesWorkspace } from "./food/recipes/recipes-workspace";
import { ModuleTabs } from "./food/shared/module-tabs";
import { ShoppingWorkspace } from "./food/shopping/shopping-workspace";

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
  shoppingOpenIngredientCount: number;
  shoppingTotalIngredientCount: number;
  recipes: MealPlanRecipe[];
};

type ShoppingListItem = {
  id: string;
  ingredientName: string;
  coreIngredientName: string;
  preparation: string | null;
  quantityNeeded: number | null;
  quantityPurchased: number | null;
  unit: string | null;
  unitCanonical: string | null;
  notes: string | null;
  sourceRecipeTitle: string | null;
  sourceMealTitle: string | null;
  sourceRecipeIds: string | null;
  sourceMealTitles: string | null;
  sourceMealPlanSlotId: string | null;
  state: string;
  isCompleted: boolean;
  sortOrder: number;
  aisleCategory: string | null;
  claimedByUserId: string | null;
  claimedAtUtc: string | null;
  createdAtUtc: string;
  completedAtUtc: string | null;
};

type ShoppingList = {
  id: string;
  name: string;
  storeName: string | null;
  status: string;
  createdAtUtc: string;
  completedAtUtc: string | null;
  archivedAtUtc: string | null;
  completedByUserId: string | null;
  itemsPurchasedCount: number;
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
  shoppingHistory: Array<{
    id: string;
    name: string;
    status: string;
    createdAtUtc: string;
    completedAtUtc: string | null;
    itemsPurchasedCount: number;
    totalItemCount: number;
    sourceMealTitles: string | null;
  }>;
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

type ShoppingTab = "active" | "history";

type ShoppingGroupMode = "flat" | "aisle";

type FoodModuleTab = "dashboard" | "recipes" | "planning" | "pantry" | "shopping" | "cooking";

type RecipeWorkspaceTab = "capture" | "library" | "detail";

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

function buildFieldTestId(scope: string, field: string) {
  return `${scope}-${field}`;
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
  const queryClient = useQueryClient();
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
  const [shoppingTab, setShoppingTab] = useState<ShoppingTab>("active");
  const [shoppingGroupMode, setShoppingGroupMode] = useState<ShoppingGroupMode>("flat");
  const [activeModuleTab, setActiveModuleTab] = useState<FoodModuleTab>("dashboard");
  const [recipeWorkspaceTab, setRecipeWorkspaceTab] = useState<RecipeWorkspaceTab>("capture");
  const [shoppingMealFilterId, setShoppingMealFilterId] = useState<string | null>(null);
  const [mergePreview, setMergePreview] = useState<{
    willMerge: boolean;
    existingItemId: string | null;
    existingItemName: string | null;
    mergedQuantityNeeded: number | null;
    unit: string | null;
  } | null>(null);
  const [showCompleteTripDialog, setShowCompleteTripDialog] = useState(false);
  const [moveCheckedToPantryOnComplete, setMoveCheckedToPantryOnComplete] = useState(true);
  const [selectedHistoryTripId, setSelectedHistoryTripId] = useState<string | null>(null);

  const [mealDate, setMealDate] = useState("");
  const [mealSlotName, setMealSlotName] = useState("Dinner");
  const [mealTitle, setMealTitle] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [generateShopping, setGenerateShopping] = useState(true);
  const [mealRows, setMealRows] = useState<MealComposerRow[]>([{ recipeId: "", role: "Main" }]);

  const dashboardQuery = useFoodDashboard();
  const recipeLibraryQuery = useFoodRecipeLibrary(recipeQuery);
  const recipeDetailQuery = useFoodRecipeDetail(selectedRecipeId);
  const pantryHistoryQuery = usePantryHistory(selectedPantryItemId);
  const historyTripQuery = useShoppingListDetail(selectedHistoryTripId);

  const selectedPantryItem = useMemo(
    () => data?.pantryItems.find((item) => item.id === selectedPantryItemId) ?? null,
    [data, selectedPantryItemId]
  );

  const lowStockItems = useMemo(
    () => data?.pantryItems.filter((item) => item.status !== "InStock") ?? [],
    [data]
  );

  const needsReviewItems = useMemo(
    () => data?.shoppingList.items.filter((item) => item.state === "NeedsReview") ?? [],
    [data]
  );

  const filteredShoppingItems = useMemo(() => {
    if (!data) return [];
    return data.shoppingList.items.filter((item) => {
      if (!shoppingMealFilterId) return true;
      return item.sourceMealPlanSlotId === shoppingMealFilterId;
    });
  }, [data, shoppingMealFilterId]);

  const activeShoppingItems = useMemo(
    () => filteredShoppingItems.filter((item) => item.state !== "Purchased" && item.state !== "Skipped"),
    [filteredShoppingItems]
  );

  const purchasedShoppingItems = useMemo(
    () => filteredShoppingItems.filter((item) => item.state === "Purchased" || item.state === "Skipped"),
    [filteredShoppingItems]
  );

  const shoppingItemsByAisle = useMemo(() => {
    const grouped = new Map<string, ShoppingListItem[]>();
    for (const item of activeShoppingItems) {
      const key = item.aisleCategory ?? "other";
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return Array.from(grouped.entries()).sort((left, right) => left[0].localeCompare(right[0]));
  }, [activeShoppingItems]);

  const purchasedCount = useMemo(
    () => data?.shoppingList.items.filter((item) => item.state === "Purchased").length ?? 0,
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
    if (!dashboardQuery.data) return;

    const body = dashboardQuery.data;
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
    setLoading(false);
  }, [dashboardQuery.data, pantryLocationId, selectedPantryItemId, selectedRecipeId, mealRows]);

  useEffect(() => {
    if (recipeLibraryQuery.data) {
      setRecipeLibrary(recipeLibraryQuery.data);
    }
  }, [recipeLibraryQuery.data]);

  useEffect(() => {
    if (recipeDetailQuery.data) {
      setSelectedRecipe(recipeDetailQuery.data);
    }
  }, [recipeDetailQuery.data]);

  useEffect(() => {
    if (pantryHistoryQuery.data) {
      setPantryHistory(pantryHistoryQuery.data);
    }
  }, [pantryHistoryQuery.data]);

  useEffect(() => {
    const queryError =
      dashboardQuery.error ??
      recipeLibraryQuery.error ??
      recipeDetailQuery.error ??
      pantryHistoryQuery.error ??
      historyTripQuery.error;
    if (queryError instanceof Error) {
      setError(queryError.message);
      setLoading(false);
    }
  }, [
    dashboardQuery.error,
    recipeLibraryQuery.error,
    recipeDetailQuery.error,
    pantryHistoryQuery.error,
    historyTripQuery.error
  ]);

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
    const ingredientName = shoppingName.trim();
    if (!ingredientName) {
      setMergePreview(null);
      return;
    }

    const timer = window.setTimeout(() => {
      foodClient.getShoppingMergePreview({
        ingredientName,
        quantity: shoppingQuantity ? Number(shoppingQuantity) : null,
        unit: shoppingUnit.trim() || null,
        notes: shoppingNotes.trim() || null
      })
        .then((preview) => {
          setMergePreview({
            willMerge: preview.willMerge,
            existingItemId: preview.existingItemId,
            existingItemName: preview.existingItemName,
            mergedQuantityNeeded: preview.mergedQuantityNeeded,
            unit: preview.unit
          });
        })
        .catch(() => {
          setMergePreview(null);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [shoppingName, shoppingQuantity, shoppingUnit, shoppingNotes]);

  function showSuccess(message: string) {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["food", "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["food", "recipes"] }),
      queryClient.invalidateQueries({ queryKey: ["food", "recipe"] }),
      queryClient.invalidateQueries({ queryKey: ["food", "pantry-history"] }),
      queryClient.invalidateQueries({ queryKey: ["food", "shopping-list"] })
    ]);
  }

  function beginImportReview(review: ImportReview) {
    setActiveModuleTab("recipes");
    setRecipeWorkspaceTab("capture");
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
    setActiveModuleTab("recipes");
    setRecipeWorkspaceTab("capture");
    setImportReview(null);
    setRecipeDraft(createRecipeDraft("manual"));
  }

  function startEditingSelectedRecipe() {
    if (!selectedRecipe) return;
    setActiveModuleTab("recipes");
    setRecipeWorkspaceTab("capture");
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
    setActiveModuleTab("recipes");
    setRecipeWorkspaceTab("detail");
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
    await foodClient.createShoppingItem({
      ingredientName: shoppingName.trim(),
      quantity: shoppingQuantity ? Number(shoppingQuantity) : null,
      unit: shoppingUnit.trim() || null,
      notes: shoppingNotes.trim() || null
    });

    setShoppingName("");
    setShoppingQuantity("");
    setShoppingUnit("");
    setShoppingNotes("");
    setMergePreview(null);
    await refreshAll();
    showSuccess(mergePreview?.willMerge ? "Shopping item merged into the existing line." : "Shopping item added.");
  }

  async function handleToggleShoppingItem(item: ShoppingListItem, nextCompleted: boolean) {
    await foodClient.updateShoppingItem(item.id, {
      isCompleted: nextCompleted,
      moveToPantry: nextCompleted,
      state: nextCompleted ? "Purchased" : item.state === "NeedsReview" ? "NeedsReview" : "Needed"
    });

    await refreshAll();
    showSuccess(nextCompleted ? "Marked purchased and moved into pantry." : "Returned item to the shopping list.");
  }

  async function handleDeleteShoppingItem(item: ShoppingListItem) {
    await foodClient.deleteShoppingItem(item.id);
    await refreshAll();
    showSuccess("Shopping item deleted.");
  }

  async function handleRecipeAddToShoppingList(recipeId: string) {
    await foodClient.addItemsFromRecipe({ recipeId, pantryAware: true });
    setActiveModuleTab("shopping");
    setShoppingTab("active");
    await refreshAll();
    showSuccess("Recipe ingredients added to the shopping list.");
  }

  async function handleClearNeedsReview(item: ShoppingListItem) {
    await foodClient.updateShoppingItem(item.id, {
      clearNeedsReview: true,
      state: "Needed"
    });
    await refreshAll();
    showSuccess("Review flag cleared.");
  }

  async function handleSplitNeedsReview(item: ShoppingListItem) {
    await foodClient.createShoppingItem({
      ingredientName: item.ingredientName,
      quantity: item.quantityNeeded,
      unit: item.unit,
      notes: item.notes,
      forceSeparate: true
    });
    await foodClient.updateShoppingItem(item.id, {
      clearNeedsReview: true,
      state: "Needed"
    });
    await refreshAll();
    showSuccess("Created a separate line so you can edit it independently.");
  }

  async function handleCompleteTrip() {
    if (!data) return;
    await foodClient.completeShoppingList(data.shoppingList.id, {
      moveCheckedToPantry: moveCheckedToPantryOnComplete
    });
    setShowCompleteTripDialog(false);
    await refreshAll();
    showSuccess("Trip completed and a fresh active list is ready.");
  }

  async function handleClaimShoppingItem(item: ShoppingListItem) {
    await foodClient.updateShoppingItem(item.id, {
      claimForCurrentUser: true
    });
    await refreshAll();
    showSuccess("Shopping item claimed.");
  }

  async function handleReleaseShoppingItem(item: ShoppingListItem) {
    await foodClient.updateShoppingItem(item.id, {
      clearClaim: true
    });
    await refreshAll();
    showSuccess("Claim released.");
  }

  async function handleDeleteRecipe(recipeId: string) {
    await foodClient.deleteRecipe(recipeId);
    setSelectedRecipe(null);
    setSelectedRecipeId(null);
    setRecipeDraft(null);
    setImportReview(null);
    setRecipeWorkspaceTab("library");
    await refreshAll();
    showSuccess("Recipe deleted.");
  }

  async function handleDeletePantryItem(pantryItemId: string) {
    await foodClient.deletePantryItem(pantryItemId);
    setSelectedPantryItemId(null);
    setPantryHistory([]);
    await refreshAll();
    showSuccess("Pantry item deleted.");
  }

  async function handleAddLowStockToShopping(item: PantryItem) {
    await foodClient.createShoppingItem({
      ingredientName: item.ingredientName,
      quantity: item.lowThreshold ?? item.quantity ?? null,
      unit: item.unit,
      notes: `Pantry ${item.status.toLowerCase()} at ${item.locationName ?? "unassigned location"}`
    });
    setActiveModuleTab("shopping");
    setShoppingTab("active");
    setShoppingMealFilterId(null);
    await refreshAll();
    showSuccess("Low-stock pantry item added to shopping.");
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

  const foodHubContextValue = {
    data,
    isPending,
    startTransition,
    setError,
    activeModuleTab,
    setActiveModuleTab,
    handleStartCooking,
    buildFieldTestId,
    formatQuantity,
    formatTimestamp,
    recipeWorkspaceTab,
    setRecipeWorkspaceTab,
    recipeLibrary,
    recipeQuery,
    setRecipeQuery,
    selectedRecipe,
    setSelectedRecipeId,
    importUrl,
    setImportUrl,
    importReview,
    setImportReview,
    recipeDraft,
    setRecipeDraft,
    emptyIngredient,
    emptyStep,
    startManualRecipe,
    startEditingSelectedRecipe,
    handleImportRecipe,
    handleSaveRecipeDraft,
    handleRecipeAddToShoppingList,
    handleDeleteRecipe,
    pantryName,
    setPantryName,
    pantryLocationId,
    setPantryLocationId,
    pantryQuantity,
    setPantryQuantity,
    pantryUnit,
    setPantryUnit,
    pantryLowThreshold,
    setPantryLowThreshold,
    pantryExpiresAt,
    setPantryExpiresAt,
    handleAddPantryItem,
    lowStockItems,
    setSelectedPantryItemId,
    handleAddLowStockToShopping,
    selectedPantryItem,
    pantryEditLocationId,
    setPantryEditLocationId,
    pantryEditStatus,
    setPantryEditStatus,
    pantryEditQuantity,
    setPantryEditQuantity,
    pantryEditUnit,
    setPantryEditUnit,
    pantryEditLowThreshold,
    setPantryEditLowThreshold,
    pantryEditPurchasedAt,
    setPantryEditPurchasedAt,
    pantryEditExpiresAt,
    setPantryEditExpiresAt,
    pantryEditNote,
    setPantryEditNote,
    handleUpdatePantryItem,
    handleDeletePantryItem,
    pantryHistory,
    activeShoppingItems,
    needsReviewItems,
    shoppingTab,
    setShoppingTab,
    shoppingGroupMode,
    setShoppingGroupMode,
    shoppingMealFilterId,
    setShoppingMealFilterId,
    shoppingName,
    setShoppingName,
    shoppingQuantity,
    setShoppingQuantity,
    shoppingUnit,
    setShoppingUnit,
    shoppingNotes,
    setShoppingNotes,
    mergePreview,
    handleAddShoppingItem,
    purchasedCount,
    showCompleteTripDialog,
    setShowCompleteTripDialog,
    moveCheckedToPantryOnComplete,
    setMoveCheckedToPantryOnComplete,
    handleCompleteTrip,
    handleClearNeedsReview,
    handleSplitNeedsReview,
    handleToggleShoppingItem,
    handleDeleteShoppingItem,
    handleClaimShoppingItem,
    handleReleaseShoppingItem,
    selectedHistoryTripId,
    setSelectedHistoryTripId,
    historyTripQuery,
    shoppingItemsByAisle,
    purchasedShoppingItems,
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
    generateShopping,
    setGenerateShopping,
    handlePlanMeal
  };

  if (loading) {
    return (
      <section className="grid" data-testid="food-hub-loading">
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
          <p className="error-text" role="alert" data-testid="food-alert-error">
            {error ?? "Food could not be loaded."}
          </p>
        </article>
      </section>
    );
  }

  return (
    <FoodHubProvider value={foodHubContextValue}>
      <>
      {error ? (
        <section className="grid">
          <article className="panel">
            <p className="error-text" role="alert" data-testid="food-alert-error">
              {error}
            </p>
          </article>
        </section>
      ) : null}

      {success ? (
        <section className="grid">
          <article className="panel">
            <p className="success-text" role="status" data-testid="food-alert-success">
              {success}
            </p>
          </article>
        </section>
      ) : null}

      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Food surface</div>
          <h2>Food is now its own workspace</h2>
          <p className="muted">Jump between focused tabs instead of scrolling one giant page.</p>
          <ModuleTabs
            tabs={[
              { id: "dashboard", label: "Dashboard" },
              { id: "recipes", label: "Recipes" },
              { id: "planning", label: "Planning" },
              { id: "pantry", label: "Pantry" },
              { id: "shopping", label: "Shopping" },
              { id: "cooking", label: "Cooking" }
            ]}
            activeTab={activeModuleTab}
            onChange={setActiveModuleTab}
          />
        </article>
      </section>

      {activeModuleTab === "dashboard" ? <DashboardTab /> : null}

      <div className="section-spacer" />

      {activeModuleTab === "recipes" ? <RecipesWorkspace /> : null}

      <div className="section-spacer" />

      {activeModuleTab === "planning" ? <MealPlanningWorkspace /> : null}

      <div className="section-spacer" />

      {activeModuleTab === "pantry" ? <PantryWorkspace /> : null}

      {activeModuleTab === "shopping" ? <ShoppingWorkspace /> : null}

      {activeModuleTab === "cooking" ? <CookingTab /> : null}

    </>
    </FoodHubProvider>
  );
}
