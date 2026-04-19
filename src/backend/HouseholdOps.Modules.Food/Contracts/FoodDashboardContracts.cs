namespace HouseholdOps.Modules.Food.Contracts;

public sealed record FoodDashboardResponse(
    FoodSummaryResponse Summary,
    TonightCookViewResponse? TonightCookView,
    IReadOnlyList<RecipeSummaryResponse> Recipes,
    IReadOnlyList<PantryItemResponse> PantryItems,
    IReadOnlyList<PantryLocationResponse> PantryLocations,
    IReadOnlyList<MealPlanSlotResponse> UpcomingMeals,
    ShoppingListResponse ShoppingList,
    IReadOnlyList<ShoppingListSummaryResponse> ShoppingHistory,
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
    string Title,
    string Reason,
    int MissingIngredientCount,
    IReadOnlyList<string> MissingIngredients,
    IReadOnlyList<string> PlannedRecipeTitles);

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

public sealed record PantryItemActivityResponse(
    Guid Id,
    string Kind,
    decimal? QuantityDelta,
    decimal? QuantityAfter,
    string? Unit,
    string? Note,
    string? SourceLabel,
    DateTimeOffset OccurredAtUtc);

public sealed record MealPlanRecipeResponse(
    Guid Id,
    Guid RecipeId,
    Guid RecipeRevisionId,
    string Role,
    string Title);

public sealed record MealPlanSlotResponse(
    Guid Id,
    DateOnly Date,
    string SlotName,
    string Title,
    string? Notes,
    int ShoppingOpenIngredientCount,
    int ShoppingTotalIngredientCount,
    IReadOnlyList<MealPlanRecipeResponse> Recipes);

public sealed record ShoppingListResponse(
    Guid Id,
    string Name,
    string? StoreName,
    string Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    DateTimeOffset? ArchivedAtUtc,
    Guid? CompletedByUserId,
    int ItemsPurchasedCount,
    IReadOnlyList<ShoppingListItemResponse> Items);

public sealed record ShoppingListItemResponse(
    Guid Id,
    string IngredientName,
    string CoreIngredientName,
    string? Preparation,
    decimal? QuantityNeeded,
    decimal? QuantityPurchased,
    string? Unit,
    string? UnitCanonical,
    string? Notes,
    string? SourceRecipeTitle,
    string? SourceMealTitle,
    string? SourceRecipeIds,
    string? SourceMealTitles,
    Guid? SourceMealPlanSlotId,
    string State,
    bool IsCompleted,
    int SortOrder,
    string? AisleCategory,
    Guid? ClaimedByUserId,
    DateTimeOffset? ClaimedAtUtc,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record ShoppingListSummaryResponse(
    Guid Id,
    string Name,
    string Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    int ItemsPurchasedCount,
    int TotalItemCount,
    string? SourceMealTitles);

public sealed record MergePreviewResponse(
    bool WillMerge,
    Guid? ExistingItemId,
    string? ExistingItemName,
    decimal? ExistingQuantityNeeded,
    decimal? IncomingQuantityNeeded,
    decimal? MergedQuantityNeeded,
    string? Unit,
    string ResultingState,
    string? Preparation);

public sealed record CookingSessionSummaryResponse(
    Guid Id,
    Guid? MealPlanSlotId,
    string Title,
    string Status,
    string PantryUpdateMode,
    int RecipeCount,
    string? FocusedRecipeTitle,
    int CurrentStepIndex,
    int TotalStepCount,
    int CheckedIngredientCount,
    int TotalIngredientCount,
    DateTimeOffset StartedAtUtc);
