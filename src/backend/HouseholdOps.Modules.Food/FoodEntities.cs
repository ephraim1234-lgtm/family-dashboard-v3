namespace HouseholdOps.Modules.Food;

public static class RecipeSourceKinds
{
    public const string UrlImport = "UrlImport";
    public const string Manual = "Manual";
}

public static class RecipeRevisionKinds
{
    public const string ImportedSource = "ImportedSource";
    public const string HouseholdDefault = "HouseholdDefault";
    public const string CookingSessionAdjustment = "CookingSessionAdjustment";
}

public static class RecipeImportJobStatuses
{
    public const string Pending = "Pending";
    public const string Parsed = "Parsed";
    public const string Failed = "Failed";
    public const string Consumed = "Consumed";
}

public static class CookingSessionStatuses
{
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Abandoned = "Abandoned";
}

public static class PantryUpdateModes
{
    public const string Progressive = "Progressive";
    public const string ConfirmOnComplete = "ConfirmOnComplete";
}

public static class PantryDeductionStatuses
{
    public const string NotApplied = "NotApplied";
    public const string Applied = "Applied";
    public const string Partial = "Partial";
    public const string PendingConfirmation = "PendingConfirmation";
}

public static class MealRecipeRoles
{
    public const string Main = "Main";
    public const string Side = "Side";
    public const string Sauce = "Sauce";
    public const string Dessert = "Dessert";
    public const string Drink = "Drink";
    public const string Other = "Other";
}

public static class PantryItemActivityKinds
{
    public const string Created = "Created";
    public const string ManualAdjustment = "ManualAdjustment";
    public const string ShoppingPurchase = "ShoppingPurchase";
    public const string CookingDeduction = "CookingDeduction";
    public const string CookingReversal = "CookingReversal";
}

public static class ShoppingListStatuses
{
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Archived = "Archived";
}

public static class ShoppingListItemStates
{
    public const string Draft = "Draft";
    public const string Needed = "Needed";
    public const string NeedsReview = "NeedsReview";
    public const string Purchased = "Purchased";
    public const string Skipped = "Skipped";
}

public sealed class FoodIngredient
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public string? DefaultUnit { get; set; }
    public string? DefaultImageUrl { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class PantryLocation
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class PantryItem
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? IngredientId { get; set; }
    public Guid? PantryLocationId { get; set; }
    public required string IngredientName { get; set; }
    public required string NormalizedIngredientName { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? LowThreshold { get; set; }
    public string Status { get; set; } = "InStock";
    public DateTimeOffset? PurchasedAtUtc { get; set; }
    public DateTimeOffset? ExpiresAtUtc { get; set; }
    public string? ImageUrlOverride { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class RecipeSource
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? RecipeId { get; set; }
    public required string Kind { get; set; }
    public string? SourceUrl { get; set; }
    public string? SourceTitle { get; set; }
    public string? SourceSiteName { get; set; }
    public string? Attribution { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class Recipe
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? SourceId { get; set; }
    public Guid? ImportedSourceRevisionId { get; set; }
    public Guid? CurrentRevisionId { get; set; }
    public required string Title { get; set; }
    public string? Summary { get; set; }
    public string? Tags { get; set; }
    public string? ImageUrl { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
}

public sealed class RecipeRevision
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid RecipeId { get; set; }
    public Guid? BasedOnRevisionId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public required string Kind { get; set; }
    public int RevisionNumber { get; set; }
    public required string Title { get; set; }
    public string? Summary { get; set; }
    public string? YieldText { get; set; }
    public string? Notes { get; set; }
    public string? Tags { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class RecipeIngredient
{
    public Guid Id { get; set; }
    public Guid RecipeRevisionId { get; set; }
    public Guid? IngredientId { get; set; }
    public int Position { get; set; }
    public required string IngredientName { get; set; }
    public required string NormalizedIngredientName { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public string? Preparation { get; set; }
    public bool IsOptional { get; set; }
}

public sealed class RecipeStep
{
    public Guid Id { get; set; }
    public Guid RecipeRevisionId { get; set; }
    public int Position { get; set; }
    public required string Instruction { get; set; }
}

public sealed class RecipeImportJob
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public required string SourceUrl { get; set; }
    public string Status { get; set; } = RecipeImportJobStatuses.Pending;
    public decimal ParserConfidence { get; set; }
    public string? ImportedTitle { get; set; }
    public string? ImportedYieldText { get; set; }
    public string? ImportedSummary { get; set; }
    public string? SourceSiteName { get; set; }
    public string? FailureReason { get; set; }
    public string? RawPayloadJson { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? ParsedAtUtc { get; set; }
    public DateTimeOffset? ConsumedAtUtc { get; set; }
}

public sealed class MealPlanSlot
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid? RecipeId { get; set; }
    public required DateOnly Date { get; set; }
    public required string SlotName { get; set; }
    public string? Title { get; set; }
    public string? RecipeTitleSnapshot { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class MealPlanRecipe
{
    public Guid Id { get; set; }
    public Guid MealPlanSlotId { get; set; }
    public Guid RecipeId { get; set; }
    public Guid RecipeRevisionId { get; set; }
    public required string Role { get; set; }
    public int Position { get; set; }
    public required string RecipeTitleSnapshot { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class ShoppingList
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public required string Name { get; set; }
    public string? StoreName { get; set; }
    public bool IsDefault { get; set; }
    public string Status { get; set; } = ShoppingListStatuses.Active;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public DateTimeOffset? ArchivedAtUtc { get; set; }
    public Guid? CompletedByUserId { get; set; }
    public int ItemsPurchasedCount { get; set; }
}

public sealed class ShoppingListItem
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid ShoppingListId { get; set; }
    public Guid? IngredientId { get; set; }
    public Guid? PantryLocationId { get; set; }
    public required string IngredientName { get; set; }
    public required string NormalizedIngredientName { get; set; }
    public required string CoreIngredientName { get; set; }
    public string? Preparation { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? QuantityNeeded { get; set; }
    public decimal? QuantityPurchased { get; set; }
    public string? Unit { get; set; }
    public string? UnitCanonical { get; set; }
    public string? Notes { get; set; }
    public string? SourceRecipeTitle { get; set; }
    public string? SourceMealTitle { get; set; }
    public string? SourceRecipeIds { get; set; }
    public string? SourceMealTitles { get; set; }
    public Guid? SourceMealPlanSlotId { get; set; }
    public string State { get; set; } = ShoppingListItemStates.Needed;
    public int SortOrder { get; set; }
    public string? AisleCategory { get; set; }
    public Guid? ClaimedByUserId { get; set; }
    public DateTimeOffset? ClaimedAtUtc { get; set; }
    public bool IsCompleted { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
}

public sealed class CookingSession
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid RecipeId { get; set; }
    public Guid RecipeRevisionId { get; set; }
    public Guid? MealPlanSlotId { get; set; }
    public Guid? FocusedCookingSessionRecipeId { get; set; }
    public Guid? StartedByUserId { get; set; }
    public required string Title { get; set; }
    public string Status { get; set; } = CookingSessionStatuses.Active;
    public string PantryUpdateMode { get; set; } = PantryUpdateModes.Progressive;
    public int CurrentStepIndex { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
}

public sealed class CookingSessionRecipe
{
    public Guid Id { get; set; }
    public Guid CookingSessionId { get; set; }
    public Guid RecipeId { get; set; }
    public Guid RecipeRevisionId { get; set; }
    public required string Role { get; set; }
    public int Position { get; set; }
    public required string Title { get; set; }
    public int CurrentStepIndex { get; set; }
}

public sealed class CookingSessionIngredient
{
    public Guid Id { get; set; }
    public Guid CookingSessionId { get; set; }
    public Guid? CookingSessionRecipeId { get; set; }
    public Guid? RecipeIngredientId { get; set; }
    public int Position { get; set; }
    public required string IngredientName { get; set; }
    public required string NormalizedIngredientName { get; set; }
    public decimal? PlannedQuantity { get; set; }
    public string? PlannedUnit { get; set; }
    public decimal? ActualQuantity { get; set; }
    public string? ActualUnit { get; set; }
    public string? Notes { get; set; }
    public bool IsChecked { get; set; }
    public bool IsSkipped { get; set; }
    public decimal? PantryDeductedQuantity { get; set; }
    public string PantryDeductionStatus { get; set; } = PantryDeductionStatuses.NotApplied;
}

public sealed class CookingSessionPantryAdjustment
{
    public Guid Id { get; set; }
    public Guid CookingSessionIngredientId { get; set; }
    public Guid PantryItemId { get; set; }
    public decimal QuantityDelta { get; set; }
    public string? Unit { get; set; }
    public DateTimeOffset AppliedAtUtc { get; set; }
}

public sealed class CookingSessionStep
{
    public Guid Id { get; set; }
    public Guid CookingSessionId { get; set; }
    public Guid? CookingSessionRecipeId { get; set; }
    public Guid? RecipeStepId { get; set; }
    public int Position { get; set; }
    public required string Instruction { get; set; }
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; }
}

public sealed class PantryItemActivity
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid PantryItemId { get; set; }
    public required string Kind { get; set; }
    public decimal? QuantityDelta { get; set; }
    public decimal? QuantityAfter { get; set; }
    public string? Unit { get; set; }
    public string? Note { get; set; }
    public string? SourceLabel { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; }
}
