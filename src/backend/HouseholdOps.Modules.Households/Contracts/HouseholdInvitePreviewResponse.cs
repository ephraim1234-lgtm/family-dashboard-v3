namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdInvitePreviewResponse(
    string HouseholdName,
    string Email,
    string Role,
    DateTimeOffset ExpiresAtUtc,
    bool IsExpired);
