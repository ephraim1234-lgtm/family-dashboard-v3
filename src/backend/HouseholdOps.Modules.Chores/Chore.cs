namespace HouseholdOps.Modules.Chores;

public sealed class Chore
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Plain Guid — no EF FK to Identity/Households to preserve module boundary.
    public Guid? AssignedToMemberId { get; set; }

    // Denormalized for read performance.
    public string? AssignedToDisplayName { get; set; }

    public ChoreCadenceKind CadenceKind { get; set; } = ChoreCadenceKind.Daily;

    // Bitmask of weekdays for weekly cadence (Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64).
    public int WeeklyDaysMask { get; set; }

    // Day of month (1–28) for monthly cadence.
    public int? DayOfMonth { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAtUtc { get; init; }
}
