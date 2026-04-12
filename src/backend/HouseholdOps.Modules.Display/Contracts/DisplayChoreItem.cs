namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayChoreItem(
    string Title,
    string? AssignedMemberName,
    string RecurrenceKind);
