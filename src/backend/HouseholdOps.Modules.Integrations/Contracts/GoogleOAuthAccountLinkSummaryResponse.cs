namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleOAuthAccountLinkSummaryResponse(
    Guid Id,
    string Email,
    string? DisplayName,
    string Scope,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);
