namespace HouseholdOps.Modules.Chores;

public sealed class ChoreInstance
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    public Guid ChoreId { get; init; }

    // Denormalized so the instance remains readable if the parent chore is renamed.
    public string ChoreTitle { get; set; } = string.Empty;

    public Guid? AssignedToMemberId { get; set; }

    public string? AssignedToDisplayName { get; set; }

    public DateOnly DueDate { get; init; }

    public string Status { get; set; } = ChoreInstanceStatuses.Pending;

    public DateTimeOffset? CompletedAtUtc { get; set; }

    public Guid? CompletedByMemberId { get; set; }

    public string? CompletedByDisplayName { get; set; }

    public DateTimeOffset CreatedAtUtc { get; init; }
}
