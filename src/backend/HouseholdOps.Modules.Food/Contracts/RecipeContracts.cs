namespace HouseholdOps.Modules.Food.Contracts;

public sealed record CreateRecipeImportRequest(string? Url);

public sealed record RecipeImportReviewResponse(
    Guid ImportJobId,
    string Status,
    decimal ParserConfidence,
    string SourceUrl,
    string? SourceSiteName,
    string? Title,
    string? Summary,
    string? YieldText,
    string? ImageUrl,
    IReadOnlyList<RecipeEditableIngredientResponse> Ingredients,
    IReadOnlyList<RecipeEditableStepResponse> Steps,
    IReadOnlyList<string> Warnings);

public sealed record RecipeEditableIngredientResponse(
    string IngredientName,
    decimal? Quantity,
    string? Unit,
    string? Preparation,
    bool IsOptional);

public sealed record RecipeEditableStepResponse(int Position, string Instruction);

public sealed record SaveRecipeRequest(
    Guid? ImportJobId,
    string? Title,
    string? Summary,
    string? YieldText,
    string? ImageUrl,
    string? Tags,
    string? Notes,
    IReadOnlyList<RecipeEditableIngredientRequest>? Ingredients,
    IReadOnlyList<RecipeEditableStepRequest>? Steps);

public sealed record UpdateRecipeRequest(
    string? Title,
    string? Summary,
    string? YieldText,
    string? ImageUrl,
    string? Tags,
    string? Notes,
    IReadOnlyList<RecipeEditableIngredientRequest>? Ingredients,
    IReadOnlyList<RecipeEditableStepRequest>? Steps);

public sealed record RecipeEditableIngredientRequest(
    string? IngredientName,
    decimal? Quantity,
    string? Unit,
    string? Preparation,
    bool IsOptional);

public sealed record RecipeEditableStepRequest(int Position, string? Instruction);

public sealed record RecipeDetailResponse(
    Guid Id,
    string Title,
    string? Summary,
    string? Tags,
    string? YieldText,
    string? Notes,
    string? ImageUrl,
    RecipeSourceResponse? Source,
    RecipeRevisionResponse ImportedSourceRevision,
    RecipeRevisionResponse HouseholdDefaultRevision,
    int RevisionCount,
    DateTimeOffset UpdatedAtUtc);

public sealed record RecipeSourceResponse(
    Guid Id,
    string Kind,
    string? SourceUrl,
    string? SourceTitle,
    string? SourceSiteName,
    string? Attribution);

public sealed record RecipeRevisionResponse(
    Guid Id,
    string Kind,
    int RevisionNumber,
    string Title,
    string? Summary,
    string? YieldText,
    string? Notes,
    string? Tags,
    IReadOnlyList<RecipeEditableIngredientResponse> Ingredients,
    IReadOnlyList<RecipeEditableStepResponse> Steps);
