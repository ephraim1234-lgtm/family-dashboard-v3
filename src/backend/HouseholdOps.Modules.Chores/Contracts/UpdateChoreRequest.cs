namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record UpdateChoreRequest(
    string Title,
    string? Description,
    Guid? AssignedToMemberId,
    string? AssignedToDisplayName,
    string CadenceKind,
    int WeeklyDaysMask,
    int? DayOfMonth,
    bool IsActive
);
