namespace HouseholdOps.Modules.Integrations;

public sealed class GoogleOAuthAccountLink
{
    public Guid Id { get; init; } = Guid.NewGuid();

    public Guid HouseholdId { get; init; }

    public Guid LinkedByUserId { get; set; }

    public string GoogleUserId { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    public string AccessToken { get; set; } = string.Empty;

    public string? RefreshToken { get; set; }

    public string TokenType { get; set; } = "Bearer";

    public string Scope { get; set; } = string.Empty;

    public DateTimeOffset? AccessTokenExpiresAtUtc { get; set; }

    public DateTimeOffset CreatedAtUtc { get; init; }

    public DateTimeOffset UpdatedAtUtc { get; set; }
}
