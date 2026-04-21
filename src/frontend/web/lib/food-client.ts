export type FoodSummary = {
  recipeCount: number;
  pantryItemCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  upcomingMealCount: number;
  shoppingItemCount: number;
  activeCookingSessionCount: number;
};

export type FoodPantryLocation = {
  id: string;
  name: string;
  sortOrder: number;
};

export type FoodPantryItem = {
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
  imageUrl: string | null;
  imageUrlOverride: string | null;
  ingredientDefaultImageUrl: string | null;
  updatedAtUtc: string;
};

export type FoodPantryHistoryItem = {
  id: string;
  kind: string;
  quantityDelta: number | null;
  quantityAfter: number | null;
  unit: string | null;
  note: string | null;
  sourceLabel: string | null;
  occurredAtUtc: string;
};

export type FoodMealPlanRecipe = {
  id: string;
  recipeId: string;
  recipeRevisionId: string;
  role: string;
  title: string;
};

export type FoodMealPlanSlot = {
  id: string;
  date: string;
  slotName: string;
  title: string;
  notes: string | null;
  shoppingOpenIngredientCount: number;
  shoppingTotalIngredientCount: number;
  recipes: FoodMealPlanRecipe[];
};

export type FoodRecipeSummary = {
  id: string;
  title: string;
  summary: string | null;
  tags: string | null;
  yieldText: string | null;
  imageUrl: string | null;
  sourceLabel: string | null;
  hasImportedSource: boolean;
  ingredientCount: number;
  stepCount: number;
  updatedAtUtc: string;
};

export type FoodRecipeIngredient = {
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  isOptional: boolean;
};

export type FoodRecipeStep = {
  position: number;
  instruction: string;
};

export type FoodRecipeRevision = {
  id: string;
  kind: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  yieldText: string | null;
  notes: string | null;
  tags: string | null;
  ingredients: FoodRecipeIngredient[];
  steps: FoodRecipeStep[];
};

export type FoodRecipeDetail = {
  id: string;
  title: string;
  summary: string | null;
  tags: string | null;
  yieldText: string | null;
  notes: string | null;
  imageUrl: string | null;
  source: {
    id: string;
    kind: string;
    sourceUrl: string | null;
    sourceTitle: string | null;
    sourceSiteName: string | null;
    attribution: string | null;
  } | null;
  importedSourceRevision: FoodRecipeRevision;
  householdDefaultRevision: FoodRecipeRevision;
  revisionCount: number;
  updatedAtUtc: string;
};

export type FoodTonightCookView = {
  mealPlanSlotId: string | null;
  title: string;
  reason: string;
  missingIngredientCount: number;
  missingIngredients: string[];
  plannedRecipeTitles: string[];
};

export type FoodCookingSessionSummary = {
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

export type FoodShoppingItem = {
  id: string;
  pantryLocationId: string | null;
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

export type FoodShoppingMergePreview = {
  willMerge: boolean;
  existingItemId: string | null;
  existingItemName: string | null;
  existingQuantityNeeded: number | null;
  incomingQuantityNeeded: number | null;
  mergedQuantityNeeded: number | null;
  unit: string | null;
  resultingState: string;
  preparation: string | null;
};

export type FoodShoppingListSummary = {
  id: string;
  name: string;
  status: string;
  createdAtUtc: string;
  completedAtUtc: string | null;
  itemsPurchasedCount: number;
  totalItemCount: number;
  sourceMealTitles: string | null;
};

export type FoodShoppingList = {
  id: string;
  name: string;
  storeName: string | null;
  status: string;
  createdAtUtc: string;
  completedAtUtc: string | null;
  archivedAtUtc: string | null;
  completedByUserId: string | null;
  itemsPurchasedCount: number;
  items: FoodShoppingItem[];
};

export type FoodDashboard = {
  summary: FoodSummary;
  tonightCookView: FoodTonightCookView | null;
  recipes: FoodRecipeSummary[];
  pantryItems: FoodPantryItem[];
  pantryLocations: FoodPantryLocation[];
  upcomingMeals: FoodMealPlanSlot[];
  shoppingList: FoodShoppingList;
  shoppingHistory: FoodShoppingListSummary[];
  activeCookingSessions: FoodCookingSessionSummary[];
};

export type FoodImportReview = {
  importJobId: string;
  status: string;
  parserConfidence: number;
  sourceUrl: string;
  sourceSiteName: string | null;
  title: string | null;
  summary: string | null;
  yieldText: string | null;
  imageUrl: string | null;
  ingredients: FoodRecipeIngredient[];
  steps: FoodRecipeStep[];
  warnings: string[];
};

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Food request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function send(input: RequestInfo, init?: RequestInit): Promise<void> {
  const response = await fetch(input, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Food request failed with ${response.status}.`);
  }
}

export const foodClient = {
  getDashboard() {
    return readJson<FoodDashboard>("/api/food/dashboard", { cache: "no-store" });
  },
  importRecipe(input: { url: string }) {
    return readJson<FoodImportReview>("/api/food/recipe-imports", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  listRecipes(query?: string) {
    const search = query?.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
    return readJson<FoodRecipeSummary[]>(`/api/food/recipes${search}`, { cache: "no-store" });
  },
  getRecipe(recipeId: string) {
    return readJson<FoodRecipeDetail>(`/api/food/recipes/${recipeId}`, { cache: "no-store" });
  },
  deleteRecipe(recipeId: string) {
    return send(`/api/food/recipes/${recipeId}`, { method: "DELETE" });
  },
  getPantryHistory(pantryItemId: string) {
    return readJson<FoodPantryHistoryItem[]>(`/api/food/pantry-items/${pantryItemId}/history`, { cache: "no-store" });
  },
  deletePantryItem(pantryItemId: string) {
    return send(`/api/food/pantry-items/${pantryItemId}`, { method: "DELETE" });
  },
  deleteMealPlanSlot(slotId: string) {
    return send(`/api/food/meal-plan/${slotId}`, { method: "DELETE" });
  },
  removeRecipeFromSlot(slotId: string, recipeId: string) {
    return send(`/api/food/meal-plan/${slotId}/recipes/${recipeId}`, { method: "DELETE" });
  },
  getShoppingList(shoppingListId: string) {
    return readJson<FoodShoppingList>(`/api/food/shopping-lists/${shoppingListId}`, { cache: "no-store" });
  },
  createShoppingItem(input: {
    ingredientName: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    forceSeparate?: boolean;
  }) {
    return readJson<FoodShoppingItem>("/api/food/shopping-list/items", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateShoppingItem(
    itemId: string,
    input: {
      isCompleted?: boolean;
      moveToPantry?: boolean;
      state?: string;
      quantityPurchased?: number | null;
      notes?: string | null;
      clearNeedsReview?: boolean;
      claimForCurrentUser?: boolean;
      clearClaim?: boolean;
    }
  ) {
    return readJson<FoodShoppingItem>(`/api/food/shopping-list/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  bulkUpdateShoppingItems(input: { itemIds: string[]; state: string }) {
    return readJson<FoodShoppingItem[]>("/api/food/shopping-list/items/bulk-state", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  deleteShoppingItem(itemId: string) {
    return send(`/api/food/shopping-list/items/${itemId}`, { method: "DELETE" });
  },
  getShoppingMergePreview(input: {
    ingredientName: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
  }) {
    return readJson<FoodShoppingMergePreview>("/api/food/shopping-list/items/merge-preview", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  addItemsFromRecipe(input: { recipeId: string; pantryAware: boolean }) {
    return readJson<FoodShoppingItem[]>("/api/food/shopping-list/items/from-recipe", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  completeShoppingList(shoppingListId: string, input: { moveCheckedToPantry: boolean }) {
    return readJson<FoodShoppingList>(`/api/food/shopping-lists/${shoppingListId}/complete`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  transferShoppingListItemsToPantry(
    shoppingListId: string,
    input: {
      itemIds: string[];
      completeList: boolean;
      itemLocationOverrides?: Record<string, string>;
    }
  ) {
    return readJson<FoodShoppingList>(`/api/food/shopping-lists/${shoppingListId}/transfer-to-pantry`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
