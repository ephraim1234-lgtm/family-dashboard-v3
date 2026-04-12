namespace HouseholdOps.Modules.Integrations.Contracts;

public sealed record GoogleOAuthAccountLinkListResponse(
    IReadOnlyList<GoogleOAuthAccountLinkSummaryResponse> Items);
