namespace HouseholdOps.Modules.Households;

public sealed class Household
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // IANA time zone id (e.g. "UTC", "America/New_York"). Controls
    // household-local "today" boundaries and day-grouping on read models.
    public string TimeZoneId { get; set; } = "UTC";

    public DateTimeOffset CreatedAtUtc { get; set; }
}

