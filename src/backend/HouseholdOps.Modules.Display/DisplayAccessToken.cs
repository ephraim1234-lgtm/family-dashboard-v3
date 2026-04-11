namespace HouseholdOps.Modules.Display;

public sealed class DisplayAccessToken
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid DisplayDeviceId { get; init; }

    public string TokenHash { get; init; } = string.Empty;

    public string TokenHint { get; init; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; init; }

    public DateTimeOffset? RevokedAtUtc { get; init; }
}
