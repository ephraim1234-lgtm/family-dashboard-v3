namespace HouseholdOps.Modules.Households.Contracts;

public sealed record CreateHouseholdInviteRequest(
    string Email,
    string? Role);
