namespace HouseholdOps.Modules.Food.Contracts;

public sealed record CreatePantryItemRequest(
    string? IngredientName,
    Guid? PantryLocationId,
    decimal? Quantity,
    string? Unit,
    decimal? LowThreshold,
    DateTimeOffset? PurchasedAtUtc,
    DateTimeOffset? ExpiresAtUtc);

public sealed record CreateMealPlanSlotRequest(
    Guid RecipeId,
    DateOnly Date,
    string? SlotName,
    string? Notes,
    bool GenerateShoppingList);

public sealed record CreateShoppingListItemRequest(
    string? IngredientName,
    decimal? Quantity,
    string? Unit,
    string? Notes);

public sealed record ToggleShoppingListItemRequest(bool IsCompleted, bool MoveToPantry);
