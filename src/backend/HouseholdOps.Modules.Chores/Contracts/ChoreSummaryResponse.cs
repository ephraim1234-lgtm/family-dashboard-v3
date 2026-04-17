namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreSummaryResponse(
    Guid Id,
    Guid HouseholdId,
    string Title,
    string? Description,
    Guid? AssignedToMemberId,
    string? AssignedToDisplayName,
    string CadenceKind,
    int WeeklyDaysMask,
    int? DayOfMonth,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);
