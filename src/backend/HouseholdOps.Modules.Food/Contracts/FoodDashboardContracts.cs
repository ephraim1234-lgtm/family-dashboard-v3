namespace HouseholdOps.Modules.Food.Contracts;

public sealed record FoodDashboardResponse(
    FoodSummaryResponse Summary,
    TonightCookViewResponse? TonightCookView,
    IReadOnlyList<RecipeSummaryResponse> Recipes,
    IReadOnlyList<PantryItemResponse> PantryItems,
    IReadOnlyList<PantryLocationResponse> PantryLocations,
    IReadOnlyList<MealPlanSlotResponse> UpcomingMeals,
    ShoppingListResponse ShoppingList,
    IReadOnlyList<CookingSessionSummaryResponse> ActiveCookingSessions);

public sealed record FoodSummaryResponse(
    int RecipeCount,
    int PantryItemCount,
    int LowStockCount,
    int ExpiringSoonCount,
    int UpcomingMealCount,
    int ShoppingItemCount,
    int ActiveCookingSessionCount);

public sealed record TonightCookViewResponse(
    Guid? MealPlanSlotId,
    Guid? RecipeId,
    string Title,
    string Reason,
    int MissingIngredientCount,
    IReadOnlyList<string> MissingIngredients);

public sealed record RecipeSummaryResponse(
    Guid Id,
    string Title,
    string? Summary,
    string? Tags,
    string? YieldText,
    string? SourceLabel,
    bool HasImportedSource,
    int IngredientCount,
    int StepCount,
    DateTimeOffset UpdatedAtUtc);

public sealed record PantryLocationResponse(Guid Id, string Name, int SortOrder);

public sealed record PantryItemResponse(
    Guid Id,
    Guid? IngredientId,
    Guid? PantryLocationId,
    string IngredientName,
    string? LocationName,
    decimal? Quantity,
    string? Unit,
    decimal? LowThreshold,
    string Status,
    DateTimeOffset? PurchasedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    DateTimeOffset UpdatedAtUtc);

public sealed record MealPlanSlotResponse(
    Guid Id,
    DateOnly Date,
    string SlotName,
    Guid? RecipeId,
    string? RecipeTitle,
    string? Notes);

public sealed record ShoppingListResponse(
    Guid Id,
    string Name,
    string? StoreName,
    IReadOnlyList<ShoppingListItemResponse> Items);

public sealed record ShoppingListItemResponse(
    Guid Id,
    string IngredientName,
    decimal? Quantity,
    string? Unit,
    string? Notes,
    string? SourceRecipeTitle,
    bool IsCompleted,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record CookingSessionSummaryResponse(
    Guid Id,
    Guid RecipeId,
    string Title,
    string Status,
    string PantryUpdateMode,
    int CurrentStepIndex,
    int TotalStepCount,
    int CheckedIngredientCount,
    int TotalIngredientCount,
    DateTimeOffset StartedAtUtc);
