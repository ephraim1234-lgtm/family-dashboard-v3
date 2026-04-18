namespace HouseholdOps.Modules.Food.Contracts;

public sealed record StartCookingSessionRequest(Guid RecipeId, string? PantryUpdateMode);

public sealed record UpdateCookingIngredientRequest(
    bool? IsChecked,
    bool? IsSkipped,
    decimal? ActualQuantity,
    string? ActualUnit,
    string? Notes);

public sealed record UpdateCookingStepRequest(
    bool? IsCompleted,
    string? Notes,
    bool? MakeCurrent);

public sealed record CompleteCookingSessionRequest(bool ApplyPendingPantryDeductions = true);

public sealed record CookingSessionResponse(
    Guid Id,
    Guid RecipeId,
    Guid RecipeRevisionId,
    Guid? MealPlanSlotId,
    string Title,
    string Status,
    string PantryUpdateMode,
    int CurrentStepIndex,
    string? CurrentStepInstruction,
    string? NextStepInstruction,
    RecipeChangeSuggestionResponse RecipeChangeSuggestion,
    PantryImpactPreviewResponse PantryImpactPreview,
    IReadOnlyList<CookingSessionIngredientResponse> Ingredients,
    IReadOnlyList<CookingSessionStepResponse> Steps);

public sealed record CookingSessionIngredientResponse(
    Guid Id,
    int Position,
    string IngredientName,
    decimal? PlannedQuantity,
    string? PlannedUnit,
    decimal? ActualQuantity,
    string? ActualUnit,
    string? Notes,
    bool IsChecked,
    bool IsSkipped,
    decimal? PantryDeductedQuantity,
    string PantryDeductionStatus);

public sealed record CookingSessionStepResponse(
    Guid Id,
    int Position,
    string Instruction,
    string? Notes,
    bool IsCompleted);

public sealed record PantryImpactPreviewResponse(
    string Mode,
    int AppliedCount,
    int NeedsReviewCount,
    IReadOnlyList<PantryImpactItemResponse> Items);

public sealed record PantryImpactItemResponse(
    Guid IngredientId,
    string IngredientName,
    decimal? PlannedQuantity,
    string? PlannedUnit,
    decimal? ActualQuantity,
    string? ActualUnit,
    decimal? PantryDeductedQuantity,
    string PantryDeductionStatus);

public sealed record RecipeChangeSuggestionResponse(
    bool HasMeaningfulChanges,
    int ChangedIngredientCount,
    IReadOnlyList<string> ChangedIngredients);

public sealed record TvCookingDisplayResponse(
    Guid SessionId,
    string Title,
    int CurrentStepIndex,
    int TotalStepCount,
    string? CurrentStepInstruction,
    string? NextStepInstruction,
    IReadOnlyList<string> RemainingIngredients,
    IReadOnlyList<string> CompletedIngredients,
    IReadOnlyList<string> RemainingSteps);
