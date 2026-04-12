namespace HouseholdOps.Modules.Chores;

public sealed class Chore
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? AssignedMembershipId { get; set; }
    public string? AssignedMemberName { get; set; }
    public ChoreRecurrenceKind RecurrenceKind { get; set; }
    public int WeeklyDaysMask { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAtUtc { get; set; }
}
