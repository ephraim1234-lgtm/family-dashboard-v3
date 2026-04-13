namespace HouseholdOps.Modules.Administration.Contracts;

public sealed record AdminChoreInsightsResponse(
    IReadOnlyList<ChoreInsightItem> Chores,
    int TotalCompletionsThisWeek,
    int TotalCompletionsThisMonth);

public sealed record ChoreInsightItem(
    Guid ChoreId,
    string Title,
    int CompletionsThisWeek,
    int CompletionsThisMonth,
    string? LastCompletedByDisplayName,
    DateTimeOffset? LastCompletedAtUtc);
