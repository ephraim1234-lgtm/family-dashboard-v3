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
    string? Notes);

public sealed record ToggleShoppingListItemRequest(bool IsCompleted, bool MoveToPantry);
