namespace HouseholdOps.Modules.Display.Contracts;

public sealed record DisplayChoreItem(
    Guid InstanceId,
    string Title,
    string? AssignedToDisplayName,
    DateOnly DueDate,
    string Status);
