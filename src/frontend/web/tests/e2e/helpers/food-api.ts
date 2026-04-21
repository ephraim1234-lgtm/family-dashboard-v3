import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";

type RecipeInput = {
  title: string;
  summary?: string | null;
  yieldText?: string | null;
  tags?: string | null;
  notes?: string | null;
  ingredients?: Array<{
    ingredientName: string;
    quantity?: number | null;
    unit?: string | null;
    preparation?: string | null;
    isOptional?: boolean;
  }>;
  steps?: Array<{
    position?: number;
    instruction: string;
  }>;
};

type MealSlotInput = {
  date: string;
  title: string;
  slotName?: string;
  notes?: string | null;
  generateShoppingList?: boolean;
  recipes: Array<{
    recipeId: string;
    role: string;
  }>;
};

type PantryItemInput = {
  ingredientName: string;
  quantity?: number | null;
  unit?: string | null;
  lowThreshold?: number | null;
  expiresAtUtc?: string | null;
};

type ShoppingItemInput = {
  ingredientName: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
};

type RecipeResponse = {
  id: string;
  title: string;
  updatedAtUtc?: string;
};

type MealSlotResponse = {
  id: string;
  title: string;
  date?: string;
};

type PantryItemResponse = {
  id: string;
  ingredientName: string;
  updatedAtUtc: string;
};

type ShoppingItemResponse = {
  id: string;
  ingredientName: string;
  createdAtUtc: string;
};

type CookingSessionResponse = {
  id: string;
  title: string;
  startedAtUtc?: string;
};

type FoodDashboardResponse = {
  pantryItems: PantryItemResponse[];
  upcomingMeals: MealSlotResponse[];
  shoppingList: {
    items: ShoppingItemResponse[];
  };
  activeCookingSessions: CookingSessionResponse[];
};

type TrackedKind =
  | "cookingSessions"
  | "mealSlots"
  | "shoppingItems"
  | "pantryItems"
  | "recipes";

const CLEANUP_ORDER: TrackedKind[] = [
  "cookingSessions",
  "mealSlots",
  "shoppingItems",
  "pantryItems",
  "recipes"
];

export class FoodApi {
  private readonly trackedIds: Record<TrackedKind, Set<string>> = {
    cookingSessions: new Set<string>(),
    mealSlots: new Set<string>(),
    shoppingItems: new Set<string>(),
    pantryItems: new Set<string>(),
    recipes: new Set<string>()
  };

  constructor(private readonly request: APIRequestContext) {}

  async getDashboard(): Promise<FoodDashboardResponse> {
    return this.getJson("/api/food/dashboard");
  }

  async createRecipe(input: RecipeInput): Promise<RecipeResponse> {
    const recipe = await this.postJson<RecipeResponse>("/api/food/recipes", {
      importJobId: null,
      title: input.title,
      summary: input.summary ?? null,
      yieldText: input.yieldText ?? "4 servings",
      tags: input.tags ?? null,
      notes: input.notes ?? null,
      ingredients: (input.ingredients ?? [
        {
          ingredientName: `${input.title} Ingredient`,
          quantity: 1,
          unit: "count",
          isOptional: false
        }
      ]).map((ingredient) => ({
        ingredientName: ingredient.ingredientName,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null,
        preparation: ingredient.preparation ?? null,
        isOptional: ingredient.isOptional ?? false
      })),
      steps: (input.steps ?? [{ instruction: `Cook ${input.title}.` }]).map((step, index) => ({
        position: step.position ?? index + 1,
        instruction: step.instruction
      }))
    });

    this.trackId("recipes", recipe.id);
    return recipe;
  }

  async findRecipeByTitle(title: string): Promise<RecipeResponse | null> {
    const recipes = await this.getJson<RecipeResponse[]>(`/api/food/recipes?query=${encodeURIComponent(title)}`);
    return recipes.find((item) => item.title === title) ?? null;
  }

  async createMealSlot(input: MealSlotInput): Promise<MealSlotResponse> {
    const slot = await this.postJson<MealSlotResponse>("/api/food/meal-plan", {
      recipeId: null,
      date: input.date,
      slotName: input.slotName ?? "Dinner",
      title: input.title,
      notes: input.notes ?? null,
      generateShoppingList: input.generateShoppingList ?? false,
      recipes: input.recipes
    });

    this.trackId("mealSlots", slot.id);
    return slot;
  }

  async createPantryItem(input: PantryItemInput): Promise<PantryItemResponse> {
    const pantryItem = await this.postJson<PantryItemResponse>("/api/food/pantry-items", {
      ingredientName: input.ingredientName,
      pantryLocationId: null,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      lowThreshold: input.lowThreshold ?? null,
      expiresAtUtc: input.expiresAtUtc ?? null
    });

    this.trackId("pantryItems", pantryItem.id);
    return pantryItem;
  }

  async createShoppingItem(input: ShoppingItemInput): Promise<ShoppingItemResponse> {
    const shoppingItem = await this.postJson<ShoppingItemResponse>("/api/food/shopping-list/items", {
      ingredientName: input.ingredientName,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      notes: input.notes ?? null
    });

    this.trackId("shoppingItems", shoppingItem.id);
    return shoppingItem;
  }

  async startCookingSession(params: {
    recipeId?: string | null;
    mealPlanSlotId?: string | null;
    pantryUpdateMode?: "Progressive" | "ConfirmOnComplete";
  }): Promise<CookingSessionResponse> {
    const session = await this.postJson<CookingSessionResponse>("/api/food/cooking-sessions", {
      recipeId: params.recipeId ?? null,
      mealPlanSlotId: params.mealPlanSlotId ?? null,
      pantryUpdateMode: params.pantryUpdateMode ?? "Progressive"
    });

    this.trackId("cookingSessions", session.id);
    return session;
  }

  async trackRecipeByTitle(title: string): Promise<RecipeResponse> {
    const recipe = await this.findRecipeByTitle(title);
    expect(recipe, `Recipe '${title}' should exist for cleanup tracking`).not.toBeNull();
    this.trackId("recipes", recipe!.id);
    return recipe!;
  }

  async findPantryItemByName(ingredientName: string): Promise<PantryItemResponse | null> {
    const dashboard = await this.getDashboard();
    return this.pickLatest(
      dashboard.pantryItems.filter((item) => item.ingredientName === ingredientName),
      (item) => item.updatedAtUtc);
  }

  async trackPantryItemByName(ingredientName: string): Promise<PantryItemResponse> {
    const pantryItem = await this.findPantryItemByName(ingredientName);
    expect(pantryItem, `Pantry item '${ingredientName}' should exist for cleanup tracking`).not.toBeNull();
    this.trackId("pantryItems", pantryItem!.id);
    return pantryItem!;
  }

  async findShoppingItemByName(ingredientName: string): Promise<ShoppingItemResponse | null> {
    const dashboard = await this.getDashboard();
    return this.pickLatest(
      dashboard.shoppingList.items.filter((item) => item.ingredientName === ingredientName),
      (item) => item.createdAtUtc);
  }

  async trackShoppingItemByName(ingredientName: string): Promise<ShoppingItemResponse> {
    const shoppingItem = await this.findShoppingItemByName(ingredientName);
    expect(shoppingItem, `Shopping item '${ingredientName}' should exist for cleanup tracking`).not.toBeNull();
    this.trackId("shoppingItems", shoppingItem!.id);
    return shoppingItem!;
  }

  async findUpcomingMealByTitle(title: string): Promise<MealSlotResponse | null> {
    const dashboard = await this.getDashboard();
    return this.pickLatest(
      dashboard.upcomingMeals.filter((item) => item.title === title),
      (item) => item.date);
  }

  async findActiveCookingSessionByTitle(title: string): Promise<CookingSessionResponse | null> {
    const dashboard = await this.getDashboard();
    return this.pickLatest(
      dashboard.activeCookingSessions.filter((item) => item.title === title),
      (item) => item.startedAtUtc);
  }

  async snapshotUpcomingMealIds(): Promise<Set<string>> {
    const dashboard = await this.getDashboard();
    return new Set(dashboard.upcomingMeals.map((item) => item.id));
  }

  async trackNewUpcomingMeal(previousIds: ReadonlySet<string>, expectedTitle?: string): Promise<MealSlotResponse> {
    const dashboard = await this.getDashboard();
    const candidates = dashboard.upcomingMeals.filter((item) => !previousIds.has(item.id));
    const slot = expectedTitle == null
      ? candidates[0] ?? null
      : candidates.find((item) => item.title === expectedTitle) ?? null;

    expect(slot, "A new upcoming meal should exist for cleanup tracking").not.toBeNull();
    this.trackId("mealSlots", slot!.id);
    return slot!;
  }

  async cleanup() {
    const failures: string[] = [];

    for (const kind of CLEANUP_ORDER) {
      const ids = Array.from(this.trackedIds[kind]).reverse();
      for (const id of ids) {
        try {
          const deleted = await this.deleteTracked(kind, id);
          if (!deleted) {
            failures.push(`${kind}:${id} returned an unexpected response during cleanup.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${kind}:${id} failed cleanup: ${message}`);
        } finally {
          this.trackedIds[kind].delete(id);
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(`Food E2E cleanup failed.\n${failures.join("\n")}`);
    }
  }

  private trackId(kind: TrackedKind, id: string) {
    this.trackedIds[kind].add(id);
  }

  private async deleteTracked(kind: TrackedKind, id: string) {
    const path = this.pathFor(kind, id);
    const response = await this.request.delete(path);
    return this.isSuccessfulDelete(response);
  }

  private pathFor(kind: TrackedKind, id: string) {
    switch (kind) {
      case "cookingSessions":
        return `/api/food/cooking-sessions/${id}`;
      case "mealSlots":
        return `/api/food/meal-plan/${id}`;
      case "shoppingItems":
        return `/api/food/shopping-list/items/${id}`;
      case "pantryItems":
        return `/api/food/pantry-items/${id}`;
      case "recipes":
        return `/api/food/recipes/${id}`;
      default:
        throw new Error(`Unsupported cleanup kind '${kind}'.`);
    }
  }

  private isSuccessfulDelete(response: APIResponse) {
    return response.ok() || response.status() === 404;
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.request.get(path);
    expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
    return response.json();
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request.post(path, {
      data: body
    });
    expect(response.ok(), `POST ${path} should succeed`).toBeTruthy();
    return response.json();
  }

  private pickLatest<T>(items: T[], getIso: (item: T) => string | undefined) {
    return items
      .slice()
      .sort((left, right) => {
        const leftIso = getIso(left) ?? "";
        const rightIso = getIso(right) ?? "";
        return rightIso.localeCompare(leftIso);
      })[0] ?? null;
  }
}
