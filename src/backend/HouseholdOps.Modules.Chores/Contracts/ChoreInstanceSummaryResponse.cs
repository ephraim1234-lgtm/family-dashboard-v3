namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreInstanceSummaryResponse(
    Guid Id,
    Guid ChoreId,
    string ChoreTitle,
    Guid? AssignedToMemberId,
    string? AssignedToDisplayName,
    DateOnly DueDate,
    string Status,
    DateTimeOffset? CompletedAtUtc,
    string? CompletedByDisplayName,
    DateTimeOffset CreatedAtUtc
);
