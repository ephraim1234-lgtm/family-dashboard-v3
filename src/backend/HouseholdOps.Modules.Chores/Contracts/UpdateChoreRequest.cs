namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record UpdateChoreRequest(
    string Title,
    string? Description,
    Guid? AssignedMembershipId,
    string RecurrenceKind,
    int WeeklyDaysMask,
    bool IsActive);
