namespace HouseholdOps.Modules.Households;

public sealed class HouseholdInvite
{
    public Guid Id { get; set; }

    public Guid HouseholdId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string NormalizedEmail { get; set; } = string.Empty;

    public HouseholdRole Role { get; set; }

    public string TokenHash { get; set; } = string.Empty;

    public Guid InvitedByUserId { get; set; }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }

    public DateTimeOffset? AcceptedAtUtc { get; set; }
}
