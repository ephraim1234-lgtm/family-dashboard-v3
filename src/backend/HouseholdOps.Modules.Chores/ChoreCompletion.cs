namespace HouseholdOps.Modules.Chores;

public sealed class ChoreCompletion
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public Guid ChoreId { get; set; }
    public string ChoreTitle { get; set; } = string.Empty;
    public Guid? CompletedByMembershipId { get; set; }
    public string CompletedByDisplayName { get; set; } = string.Empty;
    public DateTimeOffset CompletedAtUtc { get; set; }
    public string? Notes { get; set; }
}
