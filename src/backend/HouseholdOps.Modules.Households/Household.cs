namespace HouseholdOps.Modules.Households;

public sealed class Household
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; }
}

