namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleOAuthReadinessResponse(
    bool HasClientId,
    bool HasClientSecret,
    bool HasRedirectUri,
    bool IsReady,
    string? ConfiguredRedirectUri);
