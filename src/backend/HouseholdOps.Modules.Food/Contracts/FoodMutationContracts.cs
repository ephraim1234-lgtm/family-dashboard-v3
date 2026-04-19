namespace HouseholdOps.Modules.Food.Contracts;

public sealed record CreatePantryItemRequest(
    string? IngredientName,
    Guid? PantryLocationId,
    decimal? Quantity,
    string? Unit,
    decimal? LowThreshold,
    DateTimeOffset? PurchasedAtUtc,
    DateTimeOffset? ExpiresAtUtc);

public sealed record UpdatePantryItemRequest(
    Guid? PantryLocationId,
    decimal? Quantity,
    string? Unit,
    decimal? LowThreshold,
    string? Status,
    DateTimeOffset? PurchasedAtUtc,
    DateTimeOffset? ExpiresAtUtc,
    string? Note);

public sealed record CreateMealPlanRecipeRequest(Guid RecipeId, string? Role);

public sealed record CreateMealPlanSlotRequest(
    Guid? RecipeId,
    DateOnly Date,
    string? SlotName,
    string? Title,
    string? Notes,
    bool GenerateShoppingList,
    IReadOnlyList<CreateMealPlanRecipeRequest>? Recipes);

public sealed record CreateShoppingListItemRequest(
    string? IngredientName,
    decimal? Quantity,
    string? Unit,
    string? Notes,
    bool ForceSeparate = false);

public sealed record UpdateShoppingListItemRequest(
    bool? IsCompleted,
    bool? MoveToPantry,
    string? State,
    decimal? QuantityPurchased,
    string? Notes,
    bool? ClearNeedsReview,
    bool? ClaimForCurrentUser,
    bool? ClearClaim);

public sealed record AddItemsFromRecipeRequest(Guid RecipeId, bool PantryAware);

public sealed record AddItemsFromMealPlanSlotRequest(Guid MealPlanSlotId, bool PantryAware);

public sealed record BulkUpdateShoppingItemsRequest(IReadOnlyList<Guid> ItemIds, string State);

public sealed record TransferToPantryRequest(IReadOnlyList<Guid> ItemIds, bool CompleteList);

public sealed record CompleteShoppingListRequest(bool MoveCheckedToPantry);

public sealed record MergePreviewItemRequest(
    string? IngredientName,
    decimal? Quantity,
    string? Unit,
    string? Notes);
