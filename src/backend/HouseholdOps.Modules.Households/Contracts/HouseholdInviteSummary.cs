namespace HouseholdOps.Modules.Households.Contracts;

public sealed record HouseholdInviteSummary(
    string InviteId,
    string Email,
    string Role,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset ExpiresAtUtc);
