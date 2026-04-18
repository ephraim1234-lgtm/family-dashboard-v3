using HouseholdOps.Modules.Food.Contracts;

namespace HouseholdOps.Modules.Food;

public interface IFoodService
{
    Task<FoodDashboardResponse> GetDashboardAsync(Guid householdId, CancellationToken cancellationToken);

    Task<RecipeImportReviewResponse> CreateRecipeImportAsync(
        Guid householdId,
        Guid userId,
        CreateRecipeImportRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<RecipeDetailResponse?> GetRecipeAsync(Guid householdId, Guid recipeId, CancellationToken cancellationToken);

    Task<IReadOnlyList<RecipeSummaryResponse>> ListRecipesAsync(
        Guid householdId,
        string? query,
        CancellationToken cancellationToken);

    Task<RecipeDetailResponse> SaveRecipeAsync(
        Guid householdId,
        Guid userId,
        SaveRecipeRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<RecipeDetailResponse?> UpdateRecipeAsync(
        Guid householdId,
        Guid recipeId,
        Guid userId,
        UpdateRecipeRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<PantryItemResponse> CreatePantryItemAsync(
        Guid householdId,
        CreatePantryItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<PantryItemResponse?> UpdatePantryItemAsync(
        Guid householdId,
        Guid pantryItemId,
        UpdatePantryItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PantryItemActivityResponse>> GetPantryItemHistoryAsync(
        Guid householdId,
        Guid pantryItemId,
        CancellationToken cancellationToken);

    Task<MealPlanSlotResponse?> CreateMealPlanSlotAsync(
        Guid householdId,
        CreateMealPlanSlotRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<ShoppingListItemResponse> CreateShoppingListItemAsync(
        Guid householdId,
        CreateShoppingListItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<ShoppingListItemResponse?> ToggleShoppingListItemAsync(
        Guid householdId,
        Guid itemId,
        ToggleShoppingListItemRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<CookingSessionResponse> StartCookingSessionAsync(
        Guid householdId,
        Guid? userId,
        StartCookingSessionRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<CookingSessionResponse?> GetCookingSessionAsync(
        Guid householdId,
        Guid sessionId,
        CancellationToken cancellationToken);

    Task<CookingSessionResponse?> UpdateCookingSessionAsync(
        Guid householdId,
        Guid sessionId,
        UpdateCookingSessionRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<CookingSessionResponse?> UpdateCookingIngredientAsync(
        Guid householdId,
        Guid sessionId,
        Guid sessionIngredientId,
        UpdateCookingIngredientRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<CookingSessionResponse?> UpdateCookingStepAsync(
        Guid householdId,
        Guid sessionId,
        Guid sessionStepId,
        UpdateCookingStepRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<CookingSessionResponse?> CompleteCookingSessionAsync(
        Guid householdId,
        Guid sessionId,
        CompleteCookingSessionRequest request,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<RecipeDetailResponse?> PromoteCookingSessionToRecipeAsync(
        Guid householdId,
        Guid sessionId,
        PromoteCookingSessionRecipeRequest request,
        Guid userId,
        DateTimeOffset nowUtc,
        CancellationToken cancellationToken);

    Task<TvCookingDisplayResponse?> GetTvCookingDisplayAsync(
        Guid householdId,
        Guid sessionId,
        CancellationToken cancellationToken);
}
