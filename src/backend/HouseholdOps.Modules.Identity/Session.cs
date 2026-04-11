namespace HouseholdOps.Modules.Identity;

public sealed class Session
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid ActiveHouseholdId { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public DateTimeOffset? RevokedAtUtc { get; set; }

    public DateTimeOffset LastSeenAtUtc { get; set; }
}
