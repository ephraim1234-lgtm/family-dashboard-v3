namespace HouseholdOps.Modules.Households;

public sealed class Membership
{
    public Guid Id { get; set; }

    public Guid HouseholdId { get; set; }

    public Guid UserId { get; set; }

    public HouseholdRole Role { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }
}

