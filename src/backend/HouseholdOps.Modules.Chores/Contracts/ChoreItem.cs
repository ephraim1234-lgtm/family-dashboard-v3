namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record ChoreItem(
    Guid Id,
    string Title,
    string? Description,
    Guid? AssignedMembershipId,
    string? AssignedMemberName,
    string RecurrenceKind,
    int WeeklyDaysMask,
    bool IsActive,
    DateTimeOffset CreatedAtUtc);
