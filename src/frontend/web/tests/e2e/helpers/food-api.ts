import { expect, type APIRequestContext } from "@playwright/test";

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
};

type MealSlotResponse = {
  id: string;
  title: string;
};

type CookingSessionResponse = {
  id: string;
  title: string;
};

export class FoodApi {
  constructor(private readonly request: APIRequestContext) {}

  async getDashboard() {
    return this.getJson("/api/food/dashboard");
  }

  async createRecipe(input: RecipeInput): Promise<RecipeResponse> {
    return this.postJson("/api/food/recipes", {
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
  }

  async createMealSlot(input: MealSlotInput): Promise<MealSlotResponse> {
    return this.postJson("/api/food/meal-plan", {
      recipeId: null,
      date: input.date,
      slotName: input.slotName ?? "Dinner",
      title: input.title,
      notes: input.notes ?? null,
      generateShoppingList: input.generateShoppingList ?? false,
      recipes: input.recipes
    });
  }

  async createPantryItem(input: PantryItemInput) {
    return this.postJson("/api/food/pantry-items", {
      ingredientName: input.ingredientName,
      pantryLocationId: null,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      lowThreshold: input.lowThreshold ?? null,
      expiresAtUtc: input.expiresAtUtc ?? null
    });
  }

  async createShoppingItem(input: ShoppingItemInput) {
    return this.postJson("/api/food/shopping-list/items", {
      ingredientName: input.ingredientName,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      notes: input.notes ?? null
    });
  }

  async startCookingSession(params: {
    recipeId?: string | null;
    mealPlanSlotId?: string | null;
    pantryUpdateMode?: "Progressive" | "ConfirmOnComplete";
  }): Promise<CookingSessionResponse> {
    return this.postJson("/api/food/cooking-sessions", {
      recipeId: params.recipeId ?? null,
      mealPlanSlotId: params.mealPlanSlotId ?? null,
      pantryUpdateMode: params.pantryUpdateMode ?? "Progressive"
    });
  }

  private async getJson(path: string) {
    const response = await this.request.get(path);
    expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
    return response.json();
  }

  private async postJson(path: string, body: unknown) {
    const response = await this.request.post(path, {
      data: body
    });
    expect(response.ok(), `POST ${path} should succeed`).toBeTruthy();
    return response.json();
  }
}
