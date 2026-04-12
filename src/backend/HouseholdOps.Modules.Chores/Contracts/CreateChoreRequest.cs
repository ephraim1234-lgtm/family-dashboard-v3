namespace HouseholdOps.Modules.Chores.Contracts;

public sealed record CreateChoreRequest(
    string Title,
    string? Description,
    Guid? AssignedMembershipId,
    string RecurrenceKind,
    int WeeklyDaysMask);
